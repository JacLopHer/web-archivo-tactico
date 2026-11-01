// Genera el catálogo de un conjunto de ejércitos (scripts/catalogSets.mjs) desde los rosters de Infinity Army.
// Uso: node scripts/buildCatalog.mjs <conjunto>
// Conserva las variantes por sectorial y no completa datos ausentes por suposición.
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { catalogSets, factionDirectoryOrder } from './catalogSets.mjs';

const setKey = process.argv[2];
const catalogSet = catalogSets[setKey];
if (!catalogSet) {
  throw new Error(`Conjunto desconocido «${setKey ?? ''}». Disponibles: ${Object.keys(catalogSets).join(', ')}`);
}

const root = resolve(import.meta.dirname, '..');
const outputPath = resolve(root, catalogSet.output);
const iconDirectory = resolve(root, 'public/units/icons');
const API = 'https://api.corvusbelli.com/army';
const ICON_HOST = 'assets.corvusbelli.net';
const ICON_PATH_PREFIX = '/army/img/logo/units/';
const headers = { Origin: 'https://infinityuniverse.com', Referer: 'https://infinityuniverse.com/' };
const checkedAt = new Date().toISOString().slice(0, 10);

async function getJson(path) {
  const response = await fetch(`${API}/${path}`, { headers });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

const [metadata, englishMetadata] = await Promise.all([
  getJson('infinity/es/metadata'),
  getJson('infinity/en/metadata'),
]);

// El primer sectorial de cada facción es la vainilla; los demás usan el slug del logotipo (el que lee el importador).
const armies = [];
const factions = [];
const sectorialMeta = {};
for (const faction of catalogSet.factions) {
  factions.push({ id: faction.id, name: faction.name, shortName: faction.shortName });
  const entries = faction.sectorials ?? faction.armyIds.map((armyId, index) => {
    const army = metadata.factions.find((candidate) => candidate.id === armyId);
    const english = englishMetadata.factions.find((candidate) => candidate.id === armyId);
    if (!army || !english) throw new Error(`${faction.id}: el ejército ${armyId} no existe en los metadatos`);
    return {
      armyId,
      id: index === 0 ? `${faction.id}-generic` : `${faction.id}-${army.slug}`,
      name: english.name.replace(/\s+/g, ' ').trim(),
    };
  });
  for (const { armyId, id, name } of entries) {
    armies.push({ armyId, factionId: faction.id, sectorialId: id });
    sectorialMeta[id] = { factionId: faction.id, name };
  }
}

const troopClassByType = {
  1: 'Light Infantry',
  2: 'Medium Infantry',
  3: 'Heavy Infantry',
  4: 'TAGs',
  5: 'Remotes',
  6: 'Skirmishers',
  7: 'Warbands',
  8: 'Vehicles',
};
const troopTypePrefix = { 4: 'TAG · ', 5: 'REM · ', 8: 'VH · ' };

const armyData = await Promise.all(
  armies.flatMap(({ armyId }) => [getJson(`units/es/${armyId}`), getJson(`units/en/${armyId}`)]),
);

armies.forEach((army, index) => {
  army.es = armyData[index * 2];
  army.en = armyData[index * 2 + 1];
  army.unitsById = new Map(army.es.units.map((unit) => [unit.id, unit]));
  army.englishUnitsById = new Map(army.en.units.map((unit) => [unit.id, unit]));
  if (army.unitsById.size !== army.es.units.length || army.englishUnitsById.size !== army.en.units.length) {
    throw new Error(`${army.sectorialId}: Infinity Army contiene IDs de unidad duplicados`);
  }
});

const apiVersions = {};
for (const army of armies) {
  if (!army.es.version || army.es.version !== army.en.version) {
    throw new Error(`${army.sectorialId}: las versiones es/en de Infinity Army no coinciden`);
  }
  const knownVersion = apiVersions[army.factionId];
  if (knownVersion && knownVersion !== army.es.version) {
    throw new Error(`${army.factionId}: los sectoriales devuelven versiones distintas de Infinity Army`);
  }
  apiVersions[army.factionId] = army.es.version;
}

function dictionary(source, key) {
  const map = new Map();
  for (const entry of source ?? []) map.set(entry.id, entry.name);
  return map;
}

const weaponNames = dictionary(metadata.weapons, 'weapons');
const skillNames = dictionary(metadata.skills, 'skills');
const equipNames = dictionary(metadata.equips, 'equips');
const weaponsById = new Map(metadata.weapons.map((weapon) => [weapon.id, weapon]));
const extras = new Map();
const characteristics = new Map();
const categories = new Map();
const troopTypes = new Map();
const peripherals = new Map();
for (const army of armies) {
  for (const entry of army.es.filters.weapons ?? []) if (!weaponNames.has(entry.id)) weaponNames.set(entry.id, entry.name);
  for (const entry of army.es.filters.skills ?? []) if (!skillNames.has(entry.id)) skillNames.set(entry.id, entry.name);
  for (const entry of army.es.filters.equip ?? []) if (!equipNames.has(entry.id)) equipNames.set(entry.id, entry.name);
  for (const extra of army.es.filters.extras ?? []) extras.set(extra.id, extra);
  for (const char of army.es.filters.chars ?? []) characteristics.set(char.id, char.name);
  for (const category of army.es.filters.category ?? []) categories.set(category.id, category.name);
  for (const type of army.es.filters.type ?? []) troopTypes.set(type.id, type.name);
  for (const peripheral of army.es.filters.peripheral ?? []) peripherals.set(peripheral.id, peripheral.name);
}
// Armas sin nombre en los metadatos: se identifican por ID y el perfil queda incompleto (no se inventa su nombre).
for (const army of armies) {
  for (const unit of army.es.units) {
    for (const group of unit.profileGroups) {
      for (const { id } of [...group.profiles, ...group.options].flatMap((entry) => entry.weapons ?? [])) {
        if (Number.isInteger(id) && !weaponNames.has(id)) weaponNames.set(id, `Arma Infinity Army ${id}`);
      }
    }
  }
}

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
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const keys = new Set(Object.keys(value));
    if ('id' in value && !('q' in value)) keys.add('q');
    return Object.fromEntries([...keys].sort().map((key) => [
      key,
      canonical(key === 'q' && value[key] === undefined ? 1 : value[key]),
    ]));
  }
  return value;
};
const signature = (value) => JSON.stringify(canonical(value));
const shortHash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 10);
const sourceUrl = 'https://infinityuniverse.com/army/infinity';
// Compara los datos base tal como se muestran: ignora el valor `order` (solo ordena) y la cantidad implícita.
const orderedEntries = (list) => ordered(list).map(({ order, ...entry }) => canonical(entry));
const renderedBaseSignature = (profiles) => signature(profiles.map(({ ava, chars, logo, skills, equip, weapons, ...rest }) => ({
  ...rest,
  skills: orderedEntries(skills),
  equip: orderedEntries(equip),
  weapons: orderedEntries(weapons),
})));
const factionsById = new Map(factions.map((faction) => [faction.id, faction]));

function getIconPath(url) {
  if (!url) return undefined;
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== ICON_HOST || !parsed.pathname.startsWith(ICON_PATH_PREFIX)) {
    throw new Error(`URL de icono fuera de Infinity Army: ${url}`);
  }
  const originalName = basename(decodeURIComponent(parsed.pathname));
  if (!originalName.toLocaleLowerCase().endsWith('.svg')) {
    throw new Error(`Formato de icono no soportado: ${url}`);
  }
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/\.svg$/i, '');
  return `units/icons/infinity-army-${safeName}-${shortHash(url)}.svg`;
}

function troopClassFor(profile, unitName) {
  const troopClass = troopClassByType[profile.type];
  if (!troopClass) throw new Error(`${unitName}: tipo de tropa ${profile.type} sin correspondencia`);
  return troopClass;
}

function getBaseProfileRecords(profiles, unitName, groupId) {
  if (!profiles.length) throw new Error(`${unitName}, grupo ${groupId}: no hay perfiles base`);
  return profiles.map((profile) => {
    const troopClass = troopClassFor(profile, unitName);
    const typeName = required(troopTypes.get(profile.type), `tipo de tropa ${profile.type}`);
    const profileName = required(profile.name, `${unitName}, nombre de perfil base`);
    const profileIcon = getIconPath(profile.logo);
    return {
      id: profile.id,
      name: profileName,
      troopType: `${troopTypePrefix[profile.type] ?? ''}${typeName}`,
      troopClass,
      stats: {
        movement: profile.move.join('-'),
        cc: String(profile.cc),
        bs: String(profile.bs),
        physical: String(profile.ph),
        willpower: String(profile.wip),
        armor: String(profile.arm),
        bts: String(profile.bts),
        wounds: String(profile.w),
        silhouette: String(profile.s),
        availability: String(profile.ava),
      },
      woundsLabel: profile.str ? 'EST' : 'VITA',
      specialRules: [
        ...ordered(profile.skills).map((skill) => describe(skill, skillNames, 'habilidad')),
        ...ordered(profile.equip).map((equip) => describe(equip, equipNames, 'equipo')),
      ],
      characteristics: (profile.chars ?? []).map((id) => required(characteristics.get(id), `característica ${id}`)),
      weapons: ordered(profile.weapons).map(({ id }) => required(weaponNames.get(id), `arma ${id}`)),
      ...(profileIcon ? { iconPath: profileIcon } : {}),
    };
  });
}

function referencedOptionName(unit, groupId, optionId) {
  const group = unit.profileGroups.find((candidate) => candidate.id === groupId);
  const option = group?.options.find((candidate) => candidate.id === optionId);
  if (!option) throw new Error(`${unit.isc}: referencia a opción ausente ${groupId}/${optionId}`);
  return option.name;
}

function linkedRules(unit, baseProfiles, option, army) {
  const rules = [];
  for (const include of [...baseProfiles.flatMap((profile) => profile.includes ?? []), ...(option.includes ?? [])]) {
    const name = referencedOptionName(unit, include.group, include.option);
    rules.push(`Incluye${include.q > 1 ? ` x${include.q}` : ''}: ${name}`);
  }
  const peripheralIds = [
    ...baseProfiles.flatMap((profile) => (profile.peripheral ?? []).map(({ id }) => id)),
    ...(option.peripheral ?? []).map(({ id }) => id),
  ];
  for (const id of peripheralIds) {
    const name = army.es.filters.peripheral?.find((entry) => entry.id === id)?.name ?? peripherals.get(id);
    rules.push(`Periférico: ${required(name, `periférico ${id}`)}`);
  }
  return [...new Set(rules)];
}

function profileWeaponData(baseProfiles, option) {
  const allWeapons = ordered([
    ...baseProfiles.flatMap((profile) => profile.weapons ?? []),
    ...(option.weapons ?? []),
  ]);
  const unresolvedCount = allWeapons.filter((weapon) => !Number.isInteger(weapon.id)).length;
  const weapons = allWeapons.filter((weapon) => Number.isInteger(weapon.id))
    .filter((weapon, index, list) => list.findIndex((candidate) => (
      candidate.id === weapon.id
        && signature(candidate.extra ?? []) === signature(weapon.extra ?? [])
    )) === index);
  const splitAt = weapons.findIndex(({ id }) => isSidearm(id));
  const rangedWeapons = splitAt === -1 ? weapons : weapons.slice(0, splitAt);
  const meleeWeapons = splitAt === -1 ? [] : weapons.slice(splitAt);
  const names = (list) => list
    .map((weapon) => describe(weapon, weaponNames, 'arma'))
    .filter((name, index, all) => name !== all[index - 1]);
  return {
    ids: weapons.map(({ id }) => id),
    ranged: names(rangedWeapons).join(', '),
    melee: names(meleeWeapons).join(', '),
    unresolvedCount,
  };
}

const appearancesByFaction = new Map(factions.map((faction) => [faction.id, new Map()]));
for (const army of armies) {
  const factionUnits = appearancesByFaction.get(army.factionId);
  for (const unit of army.es.units) {
    const englishUnit = army.englishUnitsById.get(unit.id);
    if (!englishUnit) throw new Error(`${army.sectorialId}: falta la unidad ${unit.id} en inglés`);
    const appearances = factionUnits.get(unit.id) ?? [];
    appearances.push({ army, unit, englishUnit });
    factionUnits.set(unit.id, appearances);
  }
}

const factionsByArmyUnitId = new Map();
for (const faction of factions) {
  for (const id of appearancesByFaction.get(faction.id).keys()) {
    const known = factionsByArmyUnitId.get(id) ?? [];
    known.push(faction.id);
    factionsByArmyUnitId.set(id, known);
  }
}
const sharedAcrossFactions = new Set(
  [...factionsByArmyUnitId].filter(([, factionIds]) => factionIds.length > 1).map(([id]) => id),
);

// Estabilidad de IDs: se reutilizan los ya publicados; los nuevos llevan prefijo de facción si el ID de
// Infinity Army ya lo usa otra facción (en este conjunto o en otro archivo de catálogo).
const catalogFiles = [resolve(root, 'src/data/nomadsAlephCatalog.json')];
try {
  catalogFiles.push(...(await readdir(resolve(root, 'src/data/armies')))
    .filter((name) => name.endsWith('.json')).map((name) => resolve(root, 'src/data/armies', name)));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const publishedUnitIds = new Map();
const foreignArmyIds = new Set();
const foreignUnitIds = new Set();
for (const file of catalogFiles) {
  let previous;
  try {
    previous = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') continue;
    throw error;
  }
  for (const unit of previous.units) {
    if (file === outputPath) {
      publishedUnitIds.set(
        `${unit.factionId}:${unit.infinityArmyId}:${unit.infinityArmyGroupId ?? 1}:${unit.infinityArmyBaseVariant ?? ''}`,
        unit.id,
      );
    } else {
      foreignArmyIds.add(unit.infinityArmyId);
      foreignUnitIds.add(unit.id);
    }
  }
}
function unitIdFor(factionId, infinityArmyId, groupId, variantTag = '') {
  const published = publishedUnitIds.get(`${factionId}:${infinityArmyId}:${groupId}:${variantTag}`);
  if (published) return published;
  const base = sharedAcrossFactions.has(infinityArmyId) || foreignArmyIds.has(infinityArmyId)
    ? `ia-${factionId}-${infinityArmyId}`
    : `ia-${infinityArmyId}`;
  const id = `${groupId === 1 ? base : `${base}-g${groupId}`}${variantTag ? `-b${variantTag}` : ''}`;
  if (foreignUnitIds.has(id)) throw new Error(`El ID de unidad ${id} ya existe en otro catálogo`);
  return id;
}

const units = [];
const baseSplitReport = [];
const unitIdsBySectorial = new Map(Object.keys(sectorialMeta).map((id) => [id, []]));
const report = [];
for (const faction of factions) {
  const factionUnits = appearancesByFaction.get(faction.id);
  for (const [infinityArmyId, appearances] of factionUnits) {
    const englishIsc = appearances[0].englishUnit.isc;
    const groupIds = [...new Set(appearances.flatMap(({ unit }) => unit.profileGroups.map((group) => group.id)))];
    for (const groupId of groupIds) {
      const allGroupAppearances = appearances.flatMap(({ army, unit, englishUnit }) => {
        const group = unit.profileGroups.find((candidate) => candidate.id === groupId);
        if (!group) return [];
        const englishGroup = englishUnit.profileGroups.find((candidate) => candidate.id === groupId);
        if (!englishGroup) throw new Error(`${army.sectorialId}: falta el grupo inglés ${infinityArmyId}/${groupId}`);
        return [{ army, unit, englishUnit, group, englishGroup }];
      });
      // Los perfiles base distintos entre sectoriales no se mezclan: solo se separan si la configuración lo autoriza.
      const partitionMap = new Map();
      for (const appearance of allGroupAppearances) {
        const baseSignature = renderedBaseSignature(appearance.group.profiles);
        partitionMap.set(baseSignature, [...(partitionMap.get(baseSignature) ?? []), appearance]);
      }
      const partitions = [...partitionMap.entries()].sort(([, left], [, right]) =>
        Number(right.some(({ army }) => army.sectorialId.endsWith('generic')))
        - Number(left.some(({ army }) => army.sectorialId.endsWith('generic'))));
      if (partitions.length > 1) {
        const splitKey = `${faction.id}:${infinityArmyId}:${groupId}`;
        const detail = `${englishIsc}, grupo ${groupId}: los perfiles base difieren entre sectoriales (${partitions
          .map(([, list]) => list.map(({ army }) => army.sectorialId).join('+')).join(' | ')})`;
        if (!(catalogSet.allowBaseSplits ?? []).includes(splitKey)) throw new Error(`${detail}; clave ${splitKey}`);
        baseSplitReport.push(`${splitKey} ${detail}`);
      }
      for (const [partitionIndex, [partitionSignature, groupAppearances]] of partitions.entries()) {
      const reference = groupAppearances.find(({ army }) => army.sectorialId.endsWith('generic')) ?? groupAppearances[0];
      const { group: referenceGroup, englishGroup: referenceEnglishGroup, unit: referenceUnit } = reference;
      if (!referenceGroup.options.length) {
        throw new Error(`${referenceUnit.isc}, grupo ${groupId}: grupo sin opciones soportadas`);
      }

      const baseProfiles = referenceGroup.profiles;
      const baseProfileRecords = getBaseProfileRecords(baseProfiles, englishIsc, groupId);
      const primaryBase = baseProfiles[0];
      const troopClass = troopClassFor(primaryBase, englishIsc);
      const troopClassLabel = required(troopTypes.get(primaryBase.type), `tipo de tropa ${primaryBase.type}`);
      const groupName = referenceGroup.options[0].name.trim();
      const variantTag = partitionIndex === 0 ? '' : shortHash(partitionSignature).slice(0, 6);
      const unitId = unitIdFor(faction.id, infinityArmyId, groupId, variantTag);
      const availabilityBySectorial = {};
      const characteristicsBySectorial = {};
      const iconPathsBySectorial = {};
      const baseProfileIconPathsBySectorial = baseProfiles.map(() => ({}));
      const profileVariants = new Map();
      const iconPath = getIconPath(primaryBase.logo);
      const groupBaseSignature = partitionSignature;

      for (const { army, unit, group, englishGroup } of groupAppearances) {
        if (group.profiles.length !== baseProfiles.length) {
          throw new Error(`${unit.isc}, grupo ${groupId}: cambia el número de perfiles base en ${army.sectorialId}`);
        }
        if (renderedBaseSignature(group.profiles) !== groupBaseSignature) {
          throw new Error(`${unit.isc}, grupo ${groupId}: los perfiles base difieren en ${army.sectorialId}`);
        }
        const sectorialBase = group.profiles[0];
        availabilityBySectorial[army.sectorialId] = String(sectorialBase.ava);
        const sectorialIconPath = getIconPath(sectorialBase.logo);
        if (sectorialIconPath) iconPathsBySectorial[army.sectorialId] = sectorialIconPath;
        group.profiles.forEach((baseProfile, index) => {
          const path = getIconPath(baseProfile.logo);
          if (path) baseProfileIconPathsBySectorial[index][army.sectorialId] = path;
        });
        characteristicsBySectorial[army.sectorialId] = (sectorialBase.chars ?? [])
          .map((id) => required(characteristics.get(id), `característica ${id}`));

        for (const option of group.options) {
          const englishOption = englishGroup.options.find((candidate) => candidate.id === option.id);
          if (!englishOption) {
            throw new Error(`${army.sectorialId}: falta el nombre de importación inglés de opción ${groupId}/${option.id}`);
          }
          const optionSignature = signature(option);
          const key = `${option.id}:${shortHash(optionSignature)}`;
          const known = profileVariants.get(key);
          if (known) {
            known.sectorialIds.push(army.sectorialId);
            known.importNames.push(englishOption.name.trim());
            if (sectorialIconPath) known.iconPathsBySectorial[army.sectorialId] = sectorialIconPath;
          } else {
            profileVariants.set(key, {
              option,
              optionSignature,
              sectorialIds: [army.sectorialId],
              importNames: [englishOption.name.trim()],
              iconPathsBySectorial: sectorialIconPath ? { [army.sectorialId]: sectorialIconPath } : {},
              army,
              unit,
            });
          }
        }
      }

      const optionVariantCounts = new Map();
      for (const { option } of profileVariants.values()) {
        optionVariantCounts.set(option.id, (optionVariantCounts.get(option.id) ?? 0) + 1);
      }
      const profiles = [...profileVariants.values()].map(({ option, optionSignature, sectorialIds, importNames, army, unit }) => {
        const weaponData = profileWeaponData(baseProfiles, option);
        const additionalRules = [
          ...ordered(option.skills).map((skill) => describe(skill, skillNames, 'habilidad')),
          ...ordered(option.equip).map((equip) => describe(equip, equipNames, 'equipo')),
          ...linkedRules(unit, baseProfiles, option, army),
        ];
        const lieutenant = option.orders?.some(({ type }) => type === 'LIEUTENANT');
        const armyName = `${option.name.trim()}${lieutenant ? ' (Teniente)' : ''}`;
        const rangedEquipment = weaponData.ranged;
        const label = [rangedEquipment, additionalRules.length ? additionalRules.join(', ') : '']
          .filter(Boolean).join(' · ');
        return {
          id: `${unitId}-${groupId}-${option.id}${optionVariantCounts.get(option.id) > 1 ? `-v${shortHash(optionSignature)}` : ''}`,
          infinityArmyOptionId: option.id,
          infinityArmyWeaponIds: weaponData.ids,
          name: label || option.name.trim(),
          armyName,
          importNames: [...new Set([
            armyName,
            ...importNames.map((name) => `${name}${lieutenant ? ' (Lieutenant)' : ''}`),
          ])],
          specialRules: additionalRules,
          rangedEquipment,
          meleeEquipment: weaponData.melee,
          cap: String(option.swc),
          points: String(option.points),
          sectorialIds: [...new Set(sectorialIds)],
          orders: (option.orders ?? []).map(({ type, total }) => `${type}:${total}`),
          iconPathsBySectorial: Object.fromEntries(Object.entries(profileVariants.get(
            `${option.id}:${shortHash(optionSignature)}`,
          ).iconPathsBySectorial)),
          verificationStatus: weaponData.unresolvedCount || weaponData.ids.some((id) => !weaponsById.has(id))
            ? 'incomplete'
            : 'verified',
          ...(weaponData.unresolvedCount || weaponData.ids.some((id) => !weaponsById.has(id)) ? {
            verificationNote: [
              weaponData.unresolvedCount
                ? `${weaponData.unresolvedCount} entrada(s) de arma de Infinity Army no contienen ID y no pueden identificarse.`
                : '',
              ...weaponData.ids.filter((id) => !weaponsById.has(id))
                .map((id) => `Faltan los metadatos de Infinity Army para el arma ${id}.`),
            ].filter(Boolean).join(' '),
          } : {}),
          ...(option.disabled ? { disabled: true } : {}),
        };
      });

      const duplicateNames = new Map();
      for (const profile of profiles) {
        duplicateNames.set(profile.name, (duplicateNames.get(profile.name) ?? 0) + 1);
      }
      for (const profile of profiles) {
        if ((duplicateNames.get(profile.name) ?? 0) > 1) {
          const variantTag = profile.id.match(/-v([a-f0-9]+)$/)?.[1];
          profile.name = `${profile.name} (${profile.cap} CAP · ${profile.points} pts · IA ${profile.infinityArmyOptionId}${variantTag ? `/${variantTag}` : ''})`;
        }
      }
      if (new Set(profiles.map((profile) => profile.name)).size !== profiles.length) {
        throw new Error(`${englishIsc}, grupo ${groupId}: nombres de perfil duplicados`);
      }

      const sharedSpecialRules = baseProfileRecords[0].specialRules;
      const unit = {
        id: unitId,
        infinityArmyId,
        ...(groupId !== 1 ? { infinityArmyGroupId: groupId } : {}),
        ...(variantTag ? { infinityArmyBaseVariant: variantTag } : {}),
        name: groupName,
        officialName: referenceEnglishGroup.isc || englishIsc,
        requestedName: groupName,
        ...(englishIsc.trim().toLowerCase() !== (referenceEnglishGroup.isc || englishIsc).trim().toLowerCase()
          ? { rosterName: englishIsc.trim() } : {}),
        troopType: `${troopTypePrefix[primaryBase.type] ?? ''}${categories.get(referenceGroup.category) ?? troopClassLabel}`,
        troopClass,
        troopClassSource: `Infinity Army, tipo ${troopTypes.get(primaryBase.type)} (id ${primaryBase.type}): ${sourceUrl}`,
        troopClassVerificationStatus: 'verified',
        stats: { ...baseProfileRecords[0].stats, availability: availabilityBySectorial[reference.army.sectorialId] },
        woundsLabel: baseProfileRecords[0].woundsLabel,
        sharedSpecialRules,
        factionId: faction.id,
        sectorialIds: groupAppearances.map(({ army }) => army.sectorialId),
        edition: 'N5',
        source: `Infinity Army (api.corvusbelli.com, versión ${reference.army.es.version}), unidad ${infinityArmyId}, grupo ${groupId}: ${referenceEnglishGroup.isc || englishIsc}`,
        verificationStatus: 'verified',
        availabilityBySectorial,
        characteristics: characteristicsBySectorial[reference.army.sectorialId],
        characteristicsBySectorial,
        availabilityVerificationStatus: 'verified',
        weaponProfilesVerificationStatus: profiles.some((profile) => profile.verificationStatus === 'incomplete')
          ? 'incomplete'
          : 'verified',
        profiles,
        baseProfileVariants: baseProfileRecords.map((baseProfile, index) => ({
          ...baseProfile,
          iconPathsBySectorial: baseProfileIconPathsBySectorial[index],
        })),
        baseProfileMappingStatus: baseProfileRecords.length > 1 ? 'incomplete' : 'verified',
        iconPathsBySectorial,
        ...(iconPath ? { iconPath } : {}),
      };
      units.push(unit);
      for (const sectorialId of unit.sectorialIds) unitIdsBySectorial.get(sectorialId).push(unit.id);
      report.push(`${faction.id}/${unit.name} (${unit.officialName}): ${profiles.length} perfiles; ${unit.sectorialIds.join(', ')}`);
      }
    }
  }
}

const sectorialSource = 'Infinity Army: unidad y perfiles cotejados directamente en el roster de cada ejército/sectorial.';
const sectorials = Object.entries(sectorialMeta).map(([id, meta]) => ({
  id,
  factionId: meta.factionId,
  name: meta.name,
  unitIds: unitIdsBySectorial.get(id),
  source: sectorialSource,
  verificationStatus: unitIdsBySectorial.get(id).length ? 'mapped' : 'unmapped',
}));

const classGroups = [];
for (const troopClass of new Set(units.map((unit) => unit.troopClass))) {
  classGroups.push({ troopClass, unitIds: units.filter((unit) => unit.troopClass === troopClass).map((unit) => unit.id) });
}

const ammunitionNames = new Map((metadata.ammunitions ?? []).map((ammunition) => [ammunition.id, ammunition.name]));
const usedWeaponIds = new Set(units.flatMap((unit) => unit.profiles
  .flatMap((profile) => profile.infinityArmyWeaponIds)));
const supplementalWeapons = [...usedWeaponIds].flatMap((id) => {
  const weapon = weaponsById.get(id);
  if (!weapon) {
    return [{
      id: `infinity-army-weapon-${id}`,
      infinityArmyWeaponId: id,
      name: weaponNames.get(id) ?? `Arma Infinity Army ${id}`,
      rangeModifiers: '',
      rangeNote: '',
      damage: '',
      burst: '',
      ammunition: '',
      saveAttribute: '',
      saves: '',
      properties: '',
      source: `Infinity Army (api.corvusbelli.com/army/infinity/es/metadata), perfil de arma ${id}`,
      verificationStatus: 'incomplete',
      verificationNote: `El roster incluye el arma ${id}, pero los metadatos consultados no proporcionan su ficha.`,
    }];
  }
  if (weapon.type !== 'WEAPON') return [];
  const ranges = Object.entries(weapon.distance ?? [])
    .filter(([, range]) => range)
    .sort(([, left], [, right]) => left.max - right.max)
    .map(([band, range]) => `${band} ≤${range.max}cm: ${range.mod}`);
  const ammunition = ammunitionNames.get(weapon.ammunition);
  return [{
    id: `infinity-army-weapon-${id}`,
    infinityArmyWeaponId: id,
    name: weapon.mode ? `${weapon.name} (${weapon.mode})` : weapon.name,
    rangeModifiers: '',
    rangeNote: ranges.join(' · '),
    damage: String(weapon.damage),
    burst: String(weapon.burst),
    ammunition: ammunition ?? '',
    saveAttribute: weapon.saving,
    saves: String(weapon.savingNum),
    properties: (weapon.properties ?? []).join(', '),
    source: `Infinity Army (api.corvusbelli.com/army/infinity/es/metadata), perfil de arma ${id}`,
    verificationStatus: ammunition ? 'verified' : 'incomplete',
    ...(ammunition ? {} : { verificationNote: `Infinity Army indica id de munición ${weapon.ammunition}, pero no proporciona su nombre en el conjunto de datos consultado.` }),
  }];
});
const weaponIdsWithPendingData = new Set(supplementalWeapons
  .filter((weapon) => weapon.verificationStatus !== 'verified')
  .map((weapon) => weapon.infinityArmyWeaponId));
for (const unit of units) {
  let hasIncompleteWeaponData = false;
  for (const profile of unit.profiles) {
    const pendingIds = profile.infinityArmyWeaponIds.filter((id) => weaponIdsWithPendingData.has(id));
    if (!pendingIds.length) continue;
    hasIncompleteWeaponData = true;
    profile.verificationStatus = 'incomplete';
    const details = pendingIds.map((id) =>
      supplementalWeapons.find((weapon) => weapon.infinityArmyWeaponId === id)?.verificationNote)
      .filter(Boolean);
    profile.verificationNote = [profile.verificationNote, ...details].filter(Boolean).join(' ');
  }
  unit.weaponProfilesVerificationStatus = hasIncompleteWeaponData ? 'incomplete' : 'verified';
}

const iconUrls = new Set();
for (const army of armies) {
  for (const unit of army.es.units) {
    for (const group of unit.profileGroups) {
      for (const profile of group.profiles) {
        if (profile.logo) iconUrls.add(profile.logo);
      }
    }
  }
}
const iconPaths = new Map([...iconUrls].map((url) => [url, getIconPath(url)]));
const assetSource = 'Infinity Army (assets.corvusbelli.net/army/img/logo/units); autorización de uso indicada por el propietario el 2026-11-01.';

async function downloadIcon(url, path) {
  const destination = resolve(root, 'public', path);
  let response;
  for (let attempt = 1; ; attempt += 1) {
    try {
      // assets.corvusbelli.com sirve los mismos SVG; solo se usa para descargar si .net no responde (--icon-mirror).
      const downloadUrl = process.argv.includes('--icon-mirror') ? url.replace(ICON_HOST, 'assets.corvusbelli.com') : url;
      response = await fetch(downloadUrl, { signal: AbortSignal.timeout(30000) });
      break;
    } catch (error) {
      if (attempt === 5) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000 * attempt));
    }
  }
  if (!response.ok) throw new Error(`No se pudo descargar icono ${url}: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('image/svg+xml')) throw new Error(`Tipo de contenido inesperado para ${url}: ${contentType}`);
  const content = Buffer.from(await response.arrayBuffer());
  if (!content.toString('utf8').includes('<svg')) throw new Error(`El recurso no contiene SVG válido: ${url}`);
  try {
    const existing = await readFile(destination);
    const normalizeSvg = (buffer) => buffer.toString('utf8').split(/\r?\n/).map((line) => line.trimEnd()).join('\n').trimEnd();
    if (normalizeSvg(existing) !== normalizeSvg(content)) {
      throw new Error(`El icono existente difiere de Infinity Army; requiere revisión manual: ${path}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeFile(destination, content);
  }
}

await mkdir(iconDirectory, { recursive: true });
const pendingIcons = process.argv.includes('--skip-icons') ? [] : [...iconPaths.entries()];
const workerCount = Math.min(8, pendingIcons.length);
await Promise.all(Array.from({ length: workerCount }, async () => {
  while (pendingIcons.length) {
    const [url, path] = pendingIcons.pop();
    await downloadIcon(url, path);
  }
}));

const iconSourceByPath = new Map([...iconPaths].map(([url, path]) => [path, url]));
for (const unit of units) {
  if (unit.iconPath) unit.iconSource = iconSourceByPath.get(unit.iconPath);
  unit.iconSourcesBySectorial = Object.fromEntries(Object.entries(unit.iconPathsBySectorial)
    .map(([sectorialId, path]) => [sectorialId, iconSourceByPath.get(path)]));
  for (const baseProfile of unit.baseProfileVariants) {
    if (baseProfile.iconPath) baseProfile.iconSource = iconSourceByPath.get(baseProfile.iconPath);
    baseProfile.iconSourcesBySectorial = Object.fromEntries(Object.entries(baseProfile.iconPathsBySectorial)
      .map(([sectorialId, path]) => [sectorialId, iconSourceByPath.get(path)]));
  }
  for (const profile of unit.profiles) {
    profile.iconPath = Object.values(profile.iconPathsBySectorial)[0];
    profile.iconSourcesBySectorial = Object.fromEntries(Object.entries(profile.iconPathsBySectorial)
      .map(([sectorialId, path]) => [sectorialId, iconSourceByPath.get(path)]));
  }
}

const catalog = {
  schemaVersion: 1,
  factions,
  metadata: {
    edition: 'N5',
    source: 'Infinity Army',
    sourceUrl,
    checkedAt,
    verificationStatus: 'verified',
    editionNote: `Los perfiles se consultaron en los rosters actuales de Infinity Army (${Object.entries(apiVersions).map(([id, version]) => `${id} ${version}`).join('; ')}), edición vigente N5.3. La API no expone un campo de edición; no se combinaron fuentes ni reglas de otra edición.`,
    apiVersions,
    ...(baseSplitReport.length ? { baseProfileSplits: baseSplitReport } : {}),
    editionSourceUrl: 'https://infinityuniverse.com/blog/infinity-rules-update-5-3',
    iconSource: assetSource,
    note: `Catálogo completo de las unidades de los ${armies.length} ejércitos consultados (${catalogSet.label}): ${factions.map((faction) => `${units.filter((unit) => unit.factionId === faction.id).length} grupos/unidades de ${faction.name}`).join(' y ')}. Se incluyen ${supplementalWeapons.length} fichas de arma; ${weaponIdsWithPendingData.size} dato(s) de munición no están resueltos y quedan marcados como incompletos. Las imágenes se copian de los logos enlazados por Infinity Army. Los perfiles base múltiples se conservan; su asociación a cada opción se marca incompleta cuando la API no la explicita.`,
  },
  sectorials,
  troopClassGroups: classGroups,
  units,
  weapons: supplementalWeapons,
};

function validateExistingCatalog(existing) {
  if (!existing?.units?.length) return;
  const currentUnits = new Map(units.map((unit) => [
    `${unit.factionId}:${unit.infinityArmyId}:${unit.infinityArmyGroupId ?? 1}:${unit.infinityArmyBaseVariant ?? ''}`,
    unit,
  ]));
  for (const previous of existing.units) {
    const next = currentUnits.get(
      `${previous.factionId}:${previous.infinityArmyId}:${previous.infinityArmyGroupId ?? 1}:${previous.infinityArmyBaseVariant ?? ''}`,
    );
    if (!next) throw new Error(`La expansión eliminaría la unidad existente ${previous.id}; revisión manual requerida`);
    const stableUnitFields = ['name', 'troopType', 'troopClass', 'stats', 'woundsLabel', 'sharedSpecialRules', 'factionId', 'sectorialIds'];
    for (const field of stableUnitFields) {
      if (signature(previous[field]) !== signature(next[field])) {
        throw new Error(`La expansión cambiaría ${field} de ${previous.id}; revisión manual requerida`);
      }
    }
    for (const oldProfile of previous.profiles) {
      const fields = ['infinityArmyOptionId', 'name', 'armyName', 'importNames', 'specialRules', 'rangedEquipment', 'meleeEquipment', 'cap', 'points', 'sectorialIds'];
      const preserved = next.profiles.some((newProfile) =>
        fields.every((field) => {
          if (field !== 'name') return signature(oldProfile[field]) === signature(newProfile[field]);
          const baseName = (name) => name?.replace(/\s+\([^()]*\s·\sIA [^)]+\)$/, '');
          return baseName(oldProfile.name) === baseName(newProfile.name);
        }));
      if (!preserved) throw new Error(`La expansión cambiaría el contenido del perfil ${oldProfile.id}; revisión manual requerida`);
    }
  }
}

try {
  const existing = JSON.parse(await readFile(outputPath, 'utf8'));
  validateExistingCatalog(existing);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const directoryPath = resolve(root, 'src/data/factionDirectory.json');
const directory = JSON.parse(await readFile(directoryPath, 'utf8'));
for (const faction of factions) {
  const factionSectorials = Object.entries(sectorialMeta).filter(([, meta]) => meta.factionId === faction.id);
  const genericArmy = armies.find((army) => army.factionId === faction.id);
  const entry = {
    id: faction.id,
    name: faction.name,
    armyName: englishMetadata.factions.find((candidate) => candidate.id === genericArmy.armyId).name,
    shortName: faction.shortName,
    catalogStatus: 'complete',
    iconStatus: 'awaiting-authorized-asset',
    sectorials: factionSectorials.map(([id, meta], index) => ({
      id,
      name: meta.name,
      kind: index === 0 ? 'generic' : 'sectorial',
    })),
  };
  const index = directory.factions.findIndex((candidate) => candidate.id === faction.id);
  if (index === -1) directory.factions.push(entry);
  else directory.factions[index] = { ...directory.factions[index], ...entry };
}
directory.factions.sort((left, right) => factionDirectoryOrder.indexOf(left.id) - factionDirectoryOrder.indexOf(right.id));
directory.metadata.checkedAt = checkedAt;
await writeFile(directoryPath, `${JSON.stringify(directory, null, 2)}\n`, 'utf8');

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(report.join('\n'));
console.log(`Unidades/grupos: ${units.length}; perfiles: ${units.reduce((count, unit) => count + unit.profiles.length, 0)}; SVG oficiales: ${iconUrls.size}`);
console.log(`Escrito ${outputPath}`);
