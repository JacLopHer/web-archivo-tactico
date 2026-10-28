// Genera src/data/nomadsAlephCatalog.json a partir de la API pública de Infinity Army.
// Uso: node scripts/buildNomadsAlephCatalog.mjs
// Solo se transcriben los datos devueltos por Infinity Army; nada se completa por suposición.
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outputPath = resolve(root, 'src/data/nomadsAlephCatalog.json');
const API = 'https://api.corvusbelli.com/army';
const headers = { Origin: 'https://infinityuniverse.com', Referer: 'https://infinityuniverse.com/' };
const checkedAt = new Date().toISOString().slice(0, 10);

const armies = [
  { armyId: 501, factionId: 'nomads', sectorialId: 'nomads-generic' },
  { armyId: 502, factionId: 'nomads', sectorialId: 'nomads-corregidor' },
  { armyId: 503, factionId: 'nomads', sectorialId: 'nomads-bakunin' },
  { armyId: 504, factionId: 'nomads', sectorialId: 'nomads-tunguska' },
  { armyId: 701, factionId: 'aleph', sectorialId: 'aleph-generic' },
  { armyId: 702, factionId: 'aleph', sectorialId: 'aleph-steel-phalanx' },
  { armyId: 703, factionId: 'aleph', sectorialId: 'aleph-oss' },
];

// Identificadores de unidad en Infinity Army (campo `id`), localizados por nombre ISC.
const targets = [
  { id: 296, factionId: 'nomads', request: 'Alguacil' },
  { id: 400, factionId: 'nomads', request: 'Bandido' },
  { id: 1891, factionId: 'nomads', request: 'Bearcat' },
  { id: 1893, factionId: 'nomads', request: 'Territorial' },
  { id: 1895, factionId: 'nomads', request: 'Vigilante' },
  { id: 1898, factionId: 'aleph', request: 'Tactbot Dikpala' },
  { id: 584, factionId: 'aleph', request: 'Asura' },
  { id: 59, factionId: 'aleph', request: 'Naga' },
  { id: 1128, factionId: 'aleph', request: 'Shukra' },
  { id: 1899, factionId: 'aleph', request: 'Sharvara' },
];

const factions = [
  { id: 'nomads', name: 'Nómadas', shortName: 'NOM' },
  { id: 'aleph', name: 'Aleph', shortName: 'ALEPH' },
];

const sectorialMeta = {
  'nomads-generic': { factionId: 'nomads', name: 'Nomads' },
  'nomads-corregidor': { factionId: 'nomads', name: 'Corregidor Jurisdictional Command' },
  'nomads-bakunin': { factionId: 'nomads', name: 'Bakunin Jurisdictional Command' },
  'nomads-tunguska': { factionId: 'nomads', name: 'Tunguska Jurisdictional Command' },
  'aleph-generic': { factionId: 'aleph', name: 'Aleph' },
  'aleph-steel-phalanx': { factionId: 'aleph', name: 'Steel Phalanx' },
  'aleph-oss': { factionId: 'aleph', name: 'Operations Subsection of the S.S.S. (OSS)' },
};

const troopClassByType = { 1: 'Light Infantry', 2: 'Medium Infantry', 3: 'Heavy Infantry', 4: 'TAGs', 5: 'Remotes', 6: 'Skirmishers', 7: 'Warbands' };
const troopTypePrefix = { 4: 'TAG · ', 5: 'REM · ' };

async function getJson(path) {
  const response = await fetch(`${API}/${path}`, { headers });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

const [metadata, ...armyData] = await Promise.all([
  getJson('infinity/es/metadata'),
  ...armies.flatMap(({ armyId }) => [getJson(`units/es/${armyId}`), getJson(`units/en/${armyId}`)]),
]);
armies.forEach((army, index) => {
  army.es = armyData[index * 2];
  army.en = armyData[index * 2 + 1];
});

const dictionary = (key) => {
  const map = new Map();
  for (const entry of metadata[key === 'weapons' ? 'weapons' : key === 'skills' ? 'skills' : 'equips'] ?? []) map.set(entry.id, entry.name);
  for (const army of armies) {
    for (const entry of army.es.filters[key] ?? []) if (!map.has(entry.id)) map.set(entry.id, entry.name);
  }
  return map;
};
const weaponNames = dictionary('weapons');
const skillNames = dictionary('skills');
const equipNames = dictionary('equip');
const extras = new Map();
const characteristics = new Map();
const categories = new Map();
for (const army of armies) {
  for (const extra of army.es.filters.extras ?? []) extras.set(extra.id, extra);
  for (const char of army.es.filters.chars ?? []) characteristics.set(char.id, char.name);
  for (const category of army.es.filters.category ?? []) categories.set(category.id, category.name);
}
categories.set(1, 'T. Guarnición');
categories.set(6, 'T. Cuartel General');

const required = (value, label) => {
  if (value === undefined || value === null) throw new Error(`Falta ${label}`);
  return value;
};

function describe(entry, names, label) {
  const base = required(names.get(entry.id), `${label} ${entry.id}`);
  const details = (entry.extra ?? []).map((extraId) => {
    const extra = required(extras.get(extraId), `extra ${extraId}`);
    return extra.type === 'DISTANCE' ? `${extra.name}cm` : extra.name;
  });
  if (entry.q > 1) details.push(`x${entry.q}`);
  return details.length ? `${base} (${details.join(', ')})` : base;
}

const ordered = (list) => [...(list ?? [])].sort((a, b) => a.order - b.order);
const isSidearm = (weaponId) => {
  const name = weaponNames.get(weaponId);
  const weapon = metadata.weapons.find((candidate) => candidate.id === weaponId);
  return /^Pistola/i.test(name) || (weapon?.properties ?? []).includes('CC');
};

function findUnit(army, id) {
  const unit = army.es.units.find((candidate) => candidate.id === id);
  if (!unit) return null;
  return { es: unit, en: army.en.units.find((candidate) => candidate.id === id) };
}

const units = [];
const unitIdsBySectorial = new Map(Object.keys(sectorialMeta).map((id) => [id, []]));
const report = [];

for (const target of targets) {
  const appearances = armies.map((army) => ({ army, found: findUnit(army, target.id) })).filter(({ found }) => found);
  if (!appearances.length) throw new Error(`${target.request}: no aparece en Infinity Army`);
  const factionArmies = appearances.filter(({ army }) => army.factionId === target.factionId);
  if (factionArmies.length !== appearances.length) throw new Error(`${target.request}: aparece fuera de ${target.factionId}`);

  const reference = (factionArmies.find(({ army }) => army.sectorialId.endsWith('generic')) ?? factionArmies[0]);
  const { es: refUnit, en: refEn } = reference.found;
  if (refUnit.profileGroups.length !== 1 || refUnit.profileGroups[0].profiles.length !== 1) {
    throw new Error(`${target.request}: estructura de perfiles no soportada`);
  }
  const group = refUnit.profileGroups[0];
  const base = group.profiles[0];
  if (base.includes?.length || base.peripheral?.length || group.options.some((option) => option.includes.length || option.peripheral.length)) {
    throw new Error(`${target.request}: incluye periféricos o miembros adicionales`);
  }

  const troopClass = troopClassByType[base.type];
  if (!troopClass) throw new Error(`${target.request}: tipo de tropa ${base.type} sin clase`);
  const optionName = group.options[0].name;
  const unitSectorials = factionArmies.map(({ army }) => army.sectorialId);

  const availabilityBySectorial = {};
  const characteristicsBySectorial = {};
  const profilesByOption = new Map();
  for (const { army, found } of factionArmies) {
    const sectorGroup = found.es.profileGroups[0];
    const sectorProfile = sectorGroup.profiles[0];
    const strip = ({ ava, chars, ...rest }) => JSON.stringify(rest);
    if (strip(sectorProfile) !== strip(base)) throw new Error(`${target.request}: el perfil base difiere en ${army.sectorialId}`);
    availabilityBySectorial[army.sectorialId] = String(sectorProfile.ava);
    characteristicsBySectorial[army.sectorialId] = sectorProfile.chars.map((id) => required(characteristics.get(id), `característica ${id}`));
    for (const option of sectorGroup.options) {
      const serialized = JSON.stringify(option);
      const known = profilesByOption.get(option.id);
      if (known && known.serialized !== serialized) throw new Error(`${target.request}: opción ${option.id} difiere entre sectoriales`);
      if (known) known.sectorialIds.push(army.sectorialId);
      else profilesByOption.set(option.id, { option, serialized, sectorialIds: [army.sectorialId] });
    }
  }

  const unitKey = `ia-${target.id}`;
  const profiles = [...profilesByOption.values()].map(({ option, sectorialIds }) => {
    const weapons = ordered(option.weapons);
    const splitAt = weapons.findIndex(({ id }) => isSidearm(id));
    const rangedWeapons = splitAt === -1 ? weapons : weapons.slice(0, splitAt);
    const meleeWeapons = splitAt === -1 ? [] : weapons.slice(splitAt);
    const names = (list) => list.map((weapon) => describe(weapon, weaponNames, 'arma')).filter((name, index, all) => name !== all[index - 1]);
    const specialRules = [
      ...ordered(option.skills).map((skill) => describe(skill, skillNames, 'habilidad')),
      ...ordered(option.equip).map((equip) => describe(equip, equipNames, 'equipo')),
    ];
    const ranged = names(rangedWeapons).join(', ');
    const lieutenant = option.orders.some(({ type }) => type === 'LIEUTENANT');
    const label = [ranged, specialRules.length ? specialRules.join(', ') : ''].filter(Boolean).join(' · ');
    return {
      id: `${unitKey}-${group.id}-${option.id}`,
      infinityArmyOptionId: option.id,
      name: label || option.name,
      armyName: lieutenant ? `${option.name} (Teniente)` : option.name,
      specialRules,
      rangedEquipment: ranged,
      meleeEquipment: names(meleeWeapons).join(', '),
      cap: String(option.swc),
      points: String(option.points),
      sectorialIds,
      orders: option.orders.map(({ type, total }) => `${type}:${total}`),
    };
  });

  const seen = new Map();
  for (const profile of profiles) {
    const count = (seen.get(profile.name) ?? 0) + 1;
    seen.set(profile.name, count);
    if (count > 1) profile.name = `${profile.name} (${profile.cap} CAP · ${profile.points} pts)`;
  }
  if (new Set(profiles.map((profile) => profile.name)).size !== profiles.length) {
    throw new Error(`${target.request}: nombres de perfil duplicados`);
  }

  const characteristicsGeneric = characteristicsBySectorial[reference.army.sectorialId];
  const unit = {
    id: unitKey,
    infinityArmyId: target.id,
    name: optionName,
    officialName: refEn.isc,
    requestedName: target.request,
    troopType: `${troopTypePrefix[base.type] ?? ''}${required(categories.get(group.category), `categoría ${group.category}`)}`,
    troopClass,
    troopClassSource: `Infinity Army, tipo de tropa del perfil (id ${base.type}): https://infinityuniverse.com/army/infinity`,
    troopClassVerificationStatus: 'verified',
    stats: {
      movement: base.move.join('-'),
      cc: String(base.cc),
      bs: String(base.bs),
      physical: String(base.ph),
      willpower: String(base.wip),
      armor: String(base.arm),
      bts: String(base.bts),
      wounds: String(base.w),
      silhouette: String(base.s),
      availability: availabilityBySectorial[reference.army.sectorialId],
    },
    woundsLabel: base.str ? 'EST' : 'VITA',
    sharedSpecialRules: [
      ...ordered(base.skills).map((skill) => describe(skill, skillNames, 'habilidad')),
      ...ordered(base.equip).map((equip) => describe(equip, equipNames, 'equipo')),
    ],
    characteristics: characteristicsGeneric,
    availabilityBySectorial,
    characteristicsBySectorial,
    factionId: target.factionId,
    sectorialIds: unitSectorials,
    edition: 'N5',
    source: `Infinity Army (api.corvusbelli.com, versión ${armyData[0].version ?? metadata.version ?? 'n/d'}), unidad ${target.id}: ${refEn.isc}`,
    verificationStatus: 'verified',
    profiles,
  };
  units.push(unit);
  for (const sectorialId of unitSectorials) unitIdsBySectorial.get(sectorialId).push(unit.id);
  report.push(`${unit.name} (${refEn.isc}): ${profiles.length} perfiles; sectoriales ${unitSectorials.join(', ')}`);
}

const sectorialSource = 'Infinity Army: la unidad figura en el listado del ejército/sectorial (api.corvusbelli.com/army/units). Solo se muestran las unidades añadidas en esta fase.';
const sectorials = Object.entries(sectorialMeta).map(([id, meta]) => ({
  id,
  factionId: meta.factionId,
  name: meta.name,
  unitIds: unitIdsBySectorial.get(id),
  source: sectorialSource,
  verificationStatus: unitIdsBySectorial.get(id).length ? 'unit-level' : 'unmapped',
}));

const classGroups = [];
for (const troopClass of new Set(units.map((unit) => unit.troopClass))) {
  classGroups.push({ troopClass, unitIds: units.filter((unit) => unit.troopClass === troopClass).map((unit) => unit.id) });
}

const catalog = {
  schemaVersion: 1,
  factions,
  metadata: {
    edition: 'N5',
    source: 'Infinity Army',
    sourceUrl: 'https://infinityuniverse.com/army/infinity',
    checkedAt,
    verificationStatus: 'verified',
    editionNote: 'Infinity Army no expone un campo de edición en su API; se asume la edición vigente (N5), coherente con la wiki oficial (aviso N5.3). Los datos no se mezclan con otras ediciones.',
    note: 'Catálogo parcial: solo las unidades solicitadas, con todos los perfiles que Infinity Army devuelve para cada ejército. Atributos, habilidades, equipo y armas están en español, tal como los exporta Infinity Army. La disponibilidad (AVA) y los perfiles se registran por sectorial; 255 equivale a disponibilidad ilimitada en Infinity Army. Las fichas de armas no se han volcado a weaponProfiles.json (pendiente).',
  },
  sectorials,
  troopClassGroups: classGroups,
  units,
};

await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(report.join('\n'));
console.log(`Escrito ${outputPath}`);
