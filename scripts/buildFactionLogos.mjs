import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { catalogSets } from './catalogSets.mjs';

const root = resolve(import.meta.dirname, '..');
const directoryPath = resolve(root, 'src/data/factionDirectory.json');
const outputDirectory = resolve(root, 'public/factions');
const metadataUrl = 'https://api.corvusbelli.com/army/infinity/es/metadata';
const metadataHeaders = { Origin: 'https://infinityuniverse.com', Referer: 'https://infinityuniverse.com/' };
const checkedAt = new Date().toISOString().slice(0, 10);

const metadataResponse = await fetch(metadataUrl, { headers: metadataHeaders });
if (!metadataResponse.ok) throw new Error(`Metadata de Infinity Army: HTTP ${metadataResponse.status}`);
const metadata = await metadataResponse.json();
const officialArmies = new Map(metadata.factions.map((faction) => [faction.id, faction]));
const factionLogos = {};
const sectorialLogos = {};

function registerFaction(factionId, armyIds, explicitSectorials) {
  const entries = armyIds.map((armyId, index) => {
    const army = officialArmies.get(armyId);
    if (!army) throw new Error(`${factionId}: ejército ${armyId} ausente en metadata`);
    const sectorialId = explicitSectorials?.[index]?.id
      ?? (index === 0 ? `${factionId}-generic` : `${factionId}-${army.slug}`);
    return { sectorialId, slug: army.slug };
  });
  factionLogos[factionId] = entries[0]?.slug ?? null;
  for (const { sectorialId, slug } of entries) sectorialLogos[sectorialId] = slug ?? null;
}

for (const catalogSet of Object.values(catalogSets)) {
  for (const faction of catalogSet.factions) {
    const sectorials = faction.sectorials;
    const armyIds = sectorials?.map(({ armyId }) => armyId) ?? faction.armyIds;
    registerFaction(faction.id, armyIds, sectorials);
  }
}

registerFaction('jsa', [1101, 1102, 1103], [
  { id: 'jsa-vanilla' },
  { id: 'jsa-shindenbutai' },
  { id: 'jsa-oban' },
]);

const directory = JSON.parse(await readFile(directoryPath, 'utf8'));
for (const faction of directory.factions) {
  if (!(faction.id in factionLogos)) throw new Error(`${faction.id}: logo de facción no resuelto desde metadata`);
  const registeredIds = Object.keys(sectorialLogos)
    .filter((id) => id.startsWith(`${faction.id}-`));
  const expectedIds = faction.sectorials.map(({ id }) => id);
  if (registeredIds.length !== expectedIds.length || expectedIds.some((id) => !(id in sectorialLogos))) {
    throw new Error(`${faction.id}: los sectoriales de metadata no coinciden con factionDirectory.json`);
  }
}

const slugs = [...new Set([...Object.values(factionLogos), ...Object.values(sectorialLogos)].filter(Boolean))];
const assets = {};
const semaphore = [];
await mkdir(outputDirectory, { recursive: true });

function normalizeSvg(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n').map((line) => line.trimEnd()).join('\n');
}

function isSvg(text) {
  return /<svg(?:\s|>)/i.test(text) && /<\/svg\s*>/i.test(text);
}

async function getAsset(url) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch (error) {
    return { status: 'unavailable', detail: error instanceof Error ? error.message : String(error) };
  }
  if (response.status === 404 || response.status === 410) return { status: 'missing' };
  if (!response.ok) return { status: 'unavailable', detail: `HTTP ${response.status}` };
  const text = await response.text();
  return isSvg(text)
    ? { status: 'ok', text }
    : { status: 'invalid', detail: `La respuesta de ${url} no es un SVG válido` };
}

async function buildAsset(slug) {
  const officialUrl = `https://assets.corvusbelli.net/army/img/logo/factions/${slug}.svg`;
  const mirrorUrl = `https://assets.corvusbelli.com/army/img/logo/factions/${slug}.svg`;
  const official = await getAsset(officialUrl);
  let downloaded = official.status === 'ok'
    ? { ...official, url: officialUrl }
    : null;

  if (!downloaded) {
    const mirror = await getAsset(mirrorUrl);
    if (mirror.status === 'ok') downloaded = { ...mirror, url: mirrorUrl };
    else if (official.status === 'missing' && mirror.status === 'missing') {
      assets[slug] = {
        path: null,
        officialUrl,
        sourceUrl: null,
        verificationStatus: 'missing',
      };
      return;
    } else {
      throw new Error(`${slug}: no se pudo descargar un SVG válido desde .net (${official.detail ?? official.status}) ni .com (${mirror.detail ?? mirror.status})`);
    }
  }

  const localPath = `factions/${slug}.svg`;
  const absolutePath = resolve(outputDirectory, `${slug}.svg`);
  let writeFileRequired = true;
  try {
    const existing = await readFile(absolutePath, 'utf8');
    if (normalizeSvg(existing) !== normalizeSvg(downloaded.text)) {
      throw new Error(`${absolutePath}: el SVG local difiere del recurso oficial; no se sobrescribió`);
    }
    writeFileRequired = false;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (writeFileRequired) await writeFile(absolutePath, downloaded.text, 'utf8');

  assets[slug] = {
    path: localPath,
    officialUrl,
    sourceUrl: downloaded.url,
    verificationStatus: 'verified',
  };
}

for (const slug of slugs) {
  const task = buildAsset(slug);
  semaphore.push(task);
  if (semaphore.length === 8) {
    await Promise.all(semaphore);
    semaphore.length = 0;
  }
}
await Promise.all(semaphore);

directory.metadata.checkedAt = checkedAt;
directory.metadata.note = 'El catálogo de Nómadas y Aleph cubre todos los perfiles de sus siete rosters en Infinity Army. Los iconos de unidad autorizados están en nomadsAlephCatalog.json. Las facciones y sectoriales se registran desde infinity/es/metadata; sus logotipos SVG oficiales se verifican y guardan localmente cuando están disponibles.';
for (const faction of directory.factions) {
  faction.iconStatus = assets[factionLogos[faction.id]]?.verificationStatus === 'verified'
    ? 'verified'
    : 'awaiting-authorized-asset';
}
directory.logos = {
  metadataUrl,
  checkedAt,
  assets,
  factions: factionLogos,
  sectorials: sectorialLogos,
};

await writeFile(directoryPath, `${JSON.stringify(directory, null, 2)}\n`, 'utf8');
console.log(`Metadatos verificados: ${metadataUrl}`);
console.log(`Logotipos verificados: ${Object.values(assets).filter(({ verificationStatus }) => verificationStatus === 'verified').length}/${slugs.length}`);
console.log(`Escrito ${directoryPath}`);
