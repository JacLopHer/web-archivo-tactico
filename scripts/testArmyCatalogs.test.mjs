import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { parseListImport } from '../src/domain/listImport.mjs';
import { assertValidTroopClass } from '../src/domain/troopClasses.mjs';

const dataUrl = (path) => new URL(`../src/data/${path}`, import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(dataUrl(path), 'utf8'));

const armyFiles = (await readdir(dataUrl('armies'))).filter((name) => name.endsWith('.json')).sort();
const catalogs = [
  { key: 'nomadsAlephCatalog.json', catalog: await readJson('nomadsAlephCatalog.json') },
  ...await Promise.all(armyFiles.map(async (name) => ({ key: `armies/${name}`, catalog: await readJson(`armies/${name}`) }))),
];
const directory = await readJson('factionDirectory.json');
const legacyText = await readFile(dataUrl('legacyJsaCatalog.json'), 'utf8');
const legacy = JSON.parse(legacyText);

const allUnits = catalogs.flatMap(({ catalog }) => catalog.units);
const allProfiles = allUnits.flatMap((unit) => unit.profiles.map((profile) => ({ unit, profile })));
const allSectorials = catalogs.flatMap(({ catalog }) => catalog.sectorials);
const statKeys = ['movement', 'cc', 'bs', 'physical', 'willpower', 'armor', 'bts', 'wounds', 'silhouette', 'availability'];

// Facciones esperadas por archivo: guardan el alcance de esta fase (ver techplan.md).
const expectedFactions = {
  'nomadsAlephCatalog.json': ['nomads', 'aleph'],
  'armies/panoceania.json': ['panoceania'],
  'armies/yu-jing.json': ['yu-jing'],
  'armies/ariadna.json': ['ariadna'],
  'armies/haqqislam.json': ['haqqislam'],
  'armies/combined-army.json': ['combined-army'],
  'armies/tohaa.json': ['tohaa'],
  'armies/o-12.json': ['o-12'],
  'armies/non-aligned.json': ['non-aligned'],
};

// Logotipo de facción (infinity/es/metadata → factions[].slug) de cada sectorial.
const factionLogoSlugs = {
  'panoceania-generic': 'panoceania',
  'panoceania-shock-army-of-acontecimento': 'shock-army-of-acontecimento',
  'panoceania-military-orders': 'military-orders',
  'panoceania-neoterran-capitaline-army': 'neoterran-capitaline-army',
  'panoceania-varuna-immediate-reaction-division': 'varuna-immediate-reaction-division',
  'panoceania-svalarheima-s-winter-force': 'svalarheima-s-winter-force',
  'panoceania-kestrel-colonial-force': 'kestrel-colonial-force',
  'yu-jing-generic': 'yu-jing',
  'yu-jing-imperial-service': 'imperial-service',
  'yu-jing-invincible-army': 'invincible-army',
  'yu-jing-white-banner': 'white-banner',
  'ariadna-generic': 'ariadna',
  'ariadna-caledonian-highlander-army': 'caledonian-highlander-army',
  'ariadna-force-de-reponse-rapide-merovingienne': 'force-de-reponse-rapide-merovingienne',
  'ariadna-usariadna': 'usariadna',
  'ariadna-tartary': 'tartary',
  'ariadna-kosmoflot': 'kosmoflot',
  'haqqislam-generic': 'haqqislam',
  'haqqislam-hassassin-bahram': 'hassassin-bahram',
  'haqqislam-qapu-khalqi': 'qapu-khalqi',
  'haqqislam-ramah-taskforce': 'ramah-taskforce',
  'combined-army-generic': 'combined-army',
  'combined-army-morat': 'morat',
  'combined-army-shasvastii': 'shasvastii',
  'combined-army-onyx': 'onyx',
  'combined-army-next-wave': 'next-wave',
  'tohaa-generic': 'tohaa',
  'non-aligned-generic': 'non-aligned-armies',
  'non-aligned-druze': 'druze',
  'non-aligned-ikari': 'ikari',
  'non-aligned-starco-free-company-of-the-star': 'starco-free-company-of-the-star',
  'non-aligned-dahshat': 'dahshat',
  'non-aligned-white-company': 'white-company',
  'o-12-generic': 'o-12',
  'o-12-starmada': 'starmada',
  'o-12-torchlight-brigade': 'torchlight-brigade',
};

test('cada archivo de catálogo contiene solo las facciones previstas', () => {
  assert.deepEqual(catalogs.map(({ key }) => key).sort(), Object.keys(expectedFactions).sort());
  for (const { key, catalog } of catalogs) {
    assert.deepEqual(catalog.factions.map(({ id }) => id), expectedFactions[key], key);
    assert.ok(catalog.units.every((unit) => expectedFactions[key].includes(unit.factionId)), key);
    assert.equal(catalog.metadata.edition, 'N5');
    assert.equal(catalog.metadata.source, 'Infinity Army');
    assert.match(catalog.metadata.editionNote, /no expone un campo de edición/);
  }
});

test('los IDs de unidad y de perfil son únicos entre todos los catálogos y distintos de los heredados', () => {
  const unitIds = allUnits.map((unit) => unit.id);
  const profileIds = allProfiles.map(({ profile }) => profile.id);
  assert.equal(new Set(unitIds).size, unitIds.length);
  assert.equal(new Set(profileIds).size, profileIds.length);
  const legacyIds = new Set([
    ...legacy.units.map((unit) => unit.id),
    ...legacy.units.flatMap((unit) => unit.profiles.map((profile) => profile.id)),
  ]);
  assert.ok([...unitIds, ...profileIds].every((id) => !legacyIds.has(id)));
  assert.ok(unitIds.every((id) => /^ia-[a-z0-9-]*\d+(-g\d+)?(-b[a-f0-9]{6})?$/.test(id)), 'formato de ID estable');
});

test('cada unidad y perfil conserva datos obligatorios, fuente, edición y disponibilidad por sectorial', () => {
  for (const unit of allUnits) {
    assert.ok(unit.infinityArmyId && unit.officialName && unit.name, unit.id);
    assert.equal(unit.edition, 'N5');
    assert.match(unit.source, /^Infinity Army \(api\.corvusbelli\.com, versión \d+\.\d+\.\d+\)/);
    assert.ok(['verified', 'incomplete', 'unverified'].includes(unit.verificationStatus));
    assert.doesNotThrow(() => assertValidTroopClass(unit.name, unit.troopClass));
    for (const key of statKeys) assert.equal(typeof unit.stats[key], 'string', `${unit.id}.${key}`);
    assert.ok(unit.sectorialIds.length > 0, unit.id);
    for (const sectorialId of unit.sectorialIds) {
      assert.match(unit.availabilityBySectorial[sectorialId], /^(-1|\d+|T)$/, `${unit.id} AVA en ${sectorialId}`);
      assert.ok(unit.characteristicsBySectorial[sectorialId], unit.id);
    }
    assert.ok(unit.profiles.length > 0, unit.id);
    for (const profile of unit.profiles) {
      assert.ok(profile.name && profile.armyName, profile.id);
      assert.ok(profile.importNames.includes(profile.armyName), profile.id);
      assert.match(profile.points, /^\d+$/);
      assert.match(profile.cap, /^(-|[+-]?\d+(\.\d+)?)$/);
      assert.ok(profile.sectorialIds.length > 0 && profile.sectorialIds.every((id) => unit.sectorialIds.includes(id)), profile.id);
      assert.ok(['verified', 'incomplete'].includes(profile.verificationStatus), profile.id);
      if (profile.verificationStatus === 'incomplete') assert.ok(profile.verificationNote, profile.id);
      assert.ok(Array.isArray(profile.orders));
      assert.ok(Array.isArray(profile.infinityArmyWeaponIds));
    }
  }
});

test('los sectoriales listan exactamente las unidades que los declaran y coinciden con el directorio', () => {
  for (const sectorial of allSectorials) {
    const declared = allUnits.filter((unit) => unit.sectorialIds.includes(sectorial.id)).map((unit) => unit.id);
    assert.deepEqual([...sectorial.unitIds].sort(), declared.sort(), sectorial.id);
    assert.equal(sectorial.verificationStatus, 'mapped');
  }
  assert.equal(new Set(allSectorials.map(({ id }) => id)).size, allSectorials.length);
  for (const { catalog } of catalogs) {
    for (const faction of catalog.factions) {
      const entry = directory.factions.find(({ id }) => id === faction.id);
      assert.ok(entry, `${faction.id} en el directorio`);
      assert.deepEqual(
        entry.sectorials.map(({ id }) => id),
        catalog.sectorials.filter((sectorial) => sectorial.factionId === faction.id).map(({ id }) => id),
      );
      assert.equal(entry.sectorials[0].kind, 'generic');
      assert.ok(entry.sectorials.slice(1).every(({ kind }) => kind === 'sectorial'));
    }
  }
  assert.deepEqual(Object.keys(factionLogoSlugs).sort(), allSectorials.map(({ id }) => id)
    .filter((id) => !id.startsWith('nomads-') && !id.startsWith('aleph-')).sort());
});

test('los perfiles divididos por variante solo se listan en los sectoriales donde existen', () => {
  const split = allProfiles.filter(({ profile }) => /-v[a-f0-9]+$/.test(profile.id));
  assert.ok(split.length > 0);
  for (const { unit, profile } of split) {
    const siblings = unit.profiles.filter((candidate) => candidate.infinityArmyOptionId === profile.infinityArmyOptionId);
    const seen = new Set();
    for (const sibling of siblings) {
      for (const id of sibling.sectorialIds) {
        assert.ok(!seen.has(id), `${profile.id}: ${id} repetido entre variantes`);
        seen.add(id);
      }
    }
  }
});

test('los perfiles base distintos entre sectoriales se separan en unidades propias, no se mezclan', () => {
  const splits = catalogs.flatMap(({ catalog }) => catalog.metadata.baseProfileSplits ?? []);
  assert.ok(splits.length >= 3);
  const variants = allUnits.filter((unit) => unit.infinityArmyBaseVariant);
  assert.ok(variants.length >= 3);
  for (const unit of variants) {
    const sameGroup = allUnits.filter((candidate) => candidate.factionId === unit.factionId
      && candidate.infinityArmyId === unit.infinityArmyId
      && (candidate.infinityArmyGroupId ?? 1) === (unit.infinityArmyGroupId ?? 1));
    assert.ok(sameGroup.length > 1);
    const seen = new Set();
    for (const candidate of sameGroup) {
      for (const id of candidate.sectorialIds) {
        assert.ok(!seen.has(id), `${unit.id}: ${id} en dos variantes base`);
        seen.add(id);
      }
    }
  }
});

test('los perfiles incompletos se deshabilitan solo si el dato falta y siguen siendo importables', () => {
  for (const { profile } of allProfiles) {
    if (profile.disabled) assert.ok(profile.importNames.length > 0, profile.id);
  }
});

test('los iconos enlazados existen localmente con su fuente oficial', async () => {
  const icons = new Set();
  for (const unit of allUnits) {
    if (unit.iconPath) {
      assert.match(unit.iconSource, /^https:\/\/assets\.corvusbelli\.net\/army\/img\/logo\/units\/.+\.svg$/);
      icons.add(unit.iconPath);
    }
    for (const path of Object.values(unit.iconPathsBySectorial ?? {})) icons.add(path);
    for (const { profile } of unit.profiles.map((profile) => ({ profile }))) {
      for (const path of Object.values(profile.iconPathsBySectorial ?? {})) icons.add(path);
    }
  }
  assert.ok(icons.size > 500);
  for (const path of icons) {
    await access(new URL(`../public/${path}`, import.meta.url));
  }
});

test('el catálogo JSA heredado no se altera', () => {
  const hash = createHash('sha256').update(legacyText.replace(/\r\n/g, '\n')).digest('hex');
  assert.equal(hash, '97031f20c54d6801929fbf3c2419c23e4a036e5b0758ee65caa61ca669b8bed2');
});

const importProfiles = allProfiles.map(({ unit, profile }) => ({
  id: profile.id,
  name: profile.armyName,
  points: profile.points,
  cap: profile.cap,
  rangedEquipment: profile.rangedEquipment,
  meleeEquipment: profile.meleeEquipment,
  importNames: profile.importNames,
  sectorialIds: profile.sectorialIds ?? unit.sectorialIds,
}));
const importProfilesById = new Map(importProfiles.map((profile) => [profile.id, profile]));

function armyLine(profile, name, quantity = 1) {
  const ranged = profile.rangedEquipment ? ` ${profile.rangedEquipment}` : '';
  const melee = profile.meleeEquipment ? ` / ${profile.meleeEquipment}` : '';
  return `[b]${quantity > 1 ? `${quantity}X ` : ''}${name}[/b]${ranged}${melee}. (${profile.cap} | [b]${Number(profile.points) * quantity}[/b])`;
}

test('importa una lista en español e inglés por cada sectorial con su logotipo', () => {
  for (const [sectorialId, slug] of Object.entries(factionLogoSlugs)) {
    const candidates = importProfiles.filter((profile) => profile.sectorialIds.includes(sectorialId)
      && Number(profile.cap) > 0 && profile.rangedEquipment);
    // Se eligen perfiles que existen en este sectorial y en alguno más (la dificultad real del logotipo).
    const shared = candidates.filter((profile) => profile.sectorialIds.length > 1
      && allProfiles.some(({ profile: other }) => other.id !== profile.id
        && other.armyName === importProfilesById.get(profile.id).name
        && other.points === profile.points && other.cap === profile.cap));
    const sample = [...(shared.length ? shared.slice(0, 3) : []), ...candidates.slice(0, 3)];
    assert.ok(sample.length > 0, sectorialId);
    for (const profile of sample) {
      for (const [language, name] of [['es', profile.name], ['en', profile.importNames.find((value) => value !== profile.name) ?? profile.name]]) {
        const result = parseListImport([
          `[imglogoarmy=14]https://assets.corvusbelli.net/army/img/logo/factions/${slug}.svg[/imglogoarmy][b] [/b]`,
          'GRUPO 1',
          armyLine(profile, name),
        ].join('\n'), importProfiles);
        const [entry] = result.entries;
        assert.equal(result.format, 'infinity-army');
        // Dos unidades oficiales distintas pueden compartir nombre y equipo: la importación debe dejarlo ambiguo, no elegir mal.
        const candidateIds = entry.profileId ? [entry.profileId] : entry.candidateIds;
        assert.ok(candidateIds.length > 0, `${sectorialId} ${language}: ${profile.id} sin candidatos`);
        assert.ok(candidateIds.some((id) => importProfilesById.get(id).sectorialIds.includes(sectorialId)),
          `${sectorialId} ${language}: ${profile.id} no apunta a este sectorial (${candidateIds})`);
        if (entry.profileId) {
          assert.ok(importProfilesById.get(entry.profileId).sectorialIds.includes(sectorialId));
        }
      }
    }
  }
});

test('las líneas «3X NOMBRE» importan N unidades con el coste total', () => {
  const profile = importProfiles.find((candidate) => candidate.sectorialIds.length === 1
    && candidate.sectorialIds[0] === 'panoceania-generic' && Number(candidate.cap) > 0 && candidate.rangedEquipment);
  const result = parseListImport(armyLine(profile, profile.name, 3), importProfiles);
  assert.equal(result.entries[0].quantity, 3);
  assert.ok(result.entries[0].profileId || result.entries[0].candidateIds.length > 0);
});
