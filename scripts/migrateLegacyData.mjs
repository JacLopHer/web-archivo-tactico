import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'Ultima versión .html');
const outputPath = resolve(root, 'src/data/legacyJsaCatalog.json');
const weaponProfilesPath = resolve(root, 'src/data/weaponProfiles.json');
const source = await readFile(sourcePath, 'utf8');
let previousWeaponProfiles;

try {
  previousWeaponProfiles = JSON.parse(await readFile(weaponProfilesPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

function extractArray(name) {
  const marker = `var ${name}=`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`No se encontró ${name} en el HTML.`);

  const start = source.indexOf('[', markerIndex + marker.length);
  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
    } else if (character === '[') {
      depth += 1;
    } else if (character === ']') {
      depth -= 1;
      if (depth === 0) {
        return vm.runInNewContext(`(${source.slice(start, index + 1)})`);
      }
    }
  }

  throw new Error(`El array ${name} no está cerrado correctamente.`);
}

function stableId(prefix, values) {
  const digest = createHash('sha256').update(JSON.stringify(values)).digest('hex').slice(0, 12);
  return `${prefix}-${digest}`;
}

const legacyProfiles = extractArray('UDB');
const legacyWeaponRows = extractArray('DB');
const references = extractArray('REF');
const legacyWeaponSource = 'Ultima versión .html · JSA CHEAT SHEETS v40';
const nonWeaponProfileNames = new Set([
  'Cobertura Desplegable',
  'ECM: Hacker [-6]',
  'KOBARUTO',
  'TURTLEMEK',
]);
const previousWeaponsById = new Map(
  (previousWeaponProfiles?.profiles ?? []).map((weapon) => [weapon.id, weapon]),
);
const statKeys = ['movement', 'cc', 'bs', 'physical', 'willpower', 'armor', 'bts', 'wounds', 'silhouette', 'availability'];
const weapons = legacyWeaponRows
  .filter(([name]) => !nonWeaponProfileNames.has(name))
  .map(([name, rangeModifiers, damage, burst, ammunition, saveAttribute, saves, properties]) => {
  const id = stableId('legacy-weapon', [name, rangeModifiers, damage, burst, ammunition, saveAttribute, saves, properties]);
  const previousWeapon = previousWeaponsById.get(id);
  if (previousWeapon?.verificationStatus === 'verified') return previousWeapon;

  return {
    id,
    name: previousWeapon?.name ?? name,
    ...(previousWeapon?.aliases ? { aliases: previousWeapon.aliases } : {}),
    rangeModifiers,
    ...(previousWeapon?.rangeNote ? { rangeNote: previousWeapon.rangeNote } : {}),
    damage,
    burst,
    ammunition,
    saveAttribute,
    saves,
    properties,
    source: previousWeapon?.source ?? legacyWeaponSource,
    verificationStatus: previousWeapon?.verificationStatus ?? 'unverified',
  };
  });
const legacyWeaponIds = new Set(weapons.map((weapon) => weapon.id));
for (const previousWeapon of previousWeaponProfiles?.profiles ?? []) {
  if (!legacyWeaponIds.has(previousWeapon.id) && !nonWeaponProfileNames.has(previousWeapon.name)) {
    weapons.push(previousWeapon);
  }
}

const profiles = legacyProfiles.map((profile, index) => {
  const statValues = profile.s.trim().split(/\s+/);
  if (statValues.length !== statKeys.length) {
    throw new Error(`Perfil ${index + 1} (${profile.n}) tiene ${statValues.length} atributos; se esperaban ${statKeys.length}.`);
  }

  return {
    id: stableId('legacy-profile', [index, profile.n, profile.t, profile.s, profile.k, profile.a, profile.m, profile.cp, profile.c]),
    name: profile.n,
    troopType: profile.t,
    stats: Object.fromEntries(statKeys.map((key, statIndex) => [key, statValues[statIndex]])),
    woundsLabel: profile.h || 'VITA',
    skillsAndEquipment: profile.k,
    rangedEquipment: profile.a,
    meleeEquipment: profile.m,
    cap: profile.cp,
    points: profile.c,
    factionId: 'jsa',
    sectorialIds: [],
    edition: 'N5',
    source: 'Ultima versión .html · JSA CHEAT SHEETS v40',
    verificationStatus: 'unverified',
  };
});

const catalog = {
  schemaVersion: 1,
  faction: { id: 'jsa', name: 'Japanese Secessionist Army', shortName: 'JSA' },
  metadata: {
    edition: 'N5',
    source: 'Ultima versión .html',
    verificationStatus: 'unverified',
    note: 'Perfiles de tropas migrados desde datos heredados. No presentar perfiles ni disponibilidad sectorial como verificados hasta contrastarlos con fuentes de reglas.',
  },
  sectorials: [
    { id: 'jsa-vanilla', name: 'JSA (genérica)', rosterImage: 'Vanilla_JSA_v4.JPG', profileIds: [], verificationStatus: 'unmapped' },
    { id: 'jsa-oban', name: 'Oban', rosterImage: 'JSA_Oban_v4.JPG', profileIds: [], verificationStatus: 'unmapped' },
    { id: 'jsa-shindenbutai', name: 'Shindenbutai', rosterImage: 'JSA_Shindenbutai_v4.JPG', profileIds: [], verificationStatus: 'unmapped' },
  ],
  profiles,
  references,
};

const verifiedWeaponCount = weapons.filter((weapon) => weapon.verificationStatus === 'verified').length;
const weaponCatalog = {
  schemaVersion: 1,
  metadata: {
    edition: 'N5',
    source: previousWeaponProfiles?.metadata?.source ?? legacyWeaponSource,
    verificationStatus: verifiedWeaponCount === weapons.length ? 'verified' : 'incomplete',
    note: `${verifiedWeaponCount} perfiles conservan su verificación; ${weapons.length - verifiedWeaponCount} perfiles siguen pendientes de contraste.`,
  },
  profiles: weapons,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
await writeFile(weaponProfilesPath, `${JSON.stringify(weaponCatalog, null, 2)}\n`, 'utf8');
console.log(`Migrados ${profiles.length} perfiles, ${weapons.length} perfiles de arma y ${references.length} referencias.`);
