import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalog = JSON.parse(
  await readFile(new URL('../src/data/legacyJsaCatalog.json', import.meta.url), 'utf8'),
);
const troopProfiles = catalog.units.flatMap((unit) =>
  unit.profiles.map((profile) => ({
    ...unit,
    ...profile,
    name: profile.armyName,
    variantName: profile.name,
    unitId: unit.id,
    unitName: unit.name,
  })),
);
const weaponCatalog = JSON.parse(
  await readFile(new URL('../src/data/weaponProfiles.json', import.meta.url), 'utf8'),
);
const migrationScript = await readFile(
  new URL('./migrateLegacyData.mjs', import.meta.url),
  'utf8',
);
const stylesheet = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('el catálogo migrado conserva el inventario heredado', () => {
  assert.equal(catalog.schemaVersion, 5);
  assert.equal(catalog.units.length, 63);
  assert.equal(troopProfiles.length, 181);
  assert.equal(weaponCatalog.profiles.length, 227);
  assert.equal(catalog.references.length, 8);
  assert.equal('profiles' in catalog, false);
});

test('agrupa los perfiles FTO con su unidad base sin alterar los nombres de importación', () => {
  for (const [unitName, extraProfileCount] of [
    ['AÏDA SWANSON', 1],
    ['PANGGULING', 1],
    ['YAMABUSHI', 2],
    ['YURIKO ODA', 2],
  ]) {
    const unit = catalog.units.find((candidate) => candidate.name === unitName);
    assert.ok(unit, `Debe existir la unidad ${unitName}`);
    assert.equal(catalog.units.some((candidate) => candidate.name === `${unitName} FTO`), false);
    assert.ok(unit.profiles.filter((profile) => profile.armyName.includes(' FTO')).length === extraProfileCount);
  }

  assert.ok(catalog.units.some((unit) => unit.name === 'SHIZOKU FTO'));
  const yamabushi = catalog.units.find((unit) => unit.name === 'YAMABUSHI');
  assert.ok(yamabushi);
  assert.ok(!yamabushi.sharedSpecialRules.includes('Camuflaje (1 Uso)'));
  assert.ok(yamabushi.profiles
    .filter((profile) => !profile.armyName.includes(' FTO'))
    .every((profile) => profile.specialRules.includes('Camuflaje (1 Uso)')));
  assert.match(migrationScript, /function getCatalogUnitName\(profileName\)/);
  assert.match(migrationScript, /legacyUnitNames\.has\(baseName\)/);
});

test('cada perfil tiene una identidad única y los diez atributos tipados', () => {
  const unitIds = catalog.units.map((unit) => unit.id);
  const profileIds = troopProfiles.map((profile) => profile.id);
  assert.equal(new Set(unitIds).size, unitIds.length);
  assert.equal(new Set(profileIds).size, profileIds.length);

  for (const unit of catalog.units) {
    assert.deepEqual(Object.keys(unit.stats), [
      'movement',
      'cc',
      'bs',
      'physical',
      'willpower',
      'armor',
      'bts',
      'wounds',
      'silhouette',
      'availability',
    ]);
    assert.ok(Array.isArray(unit.sharedSpecialRules));
    assert.ok(unit.profiles.length > 0);
    for (const profile of unit.profiles) {
      assert.ok(Array.isArray(profile.specialRules));
      assert.ok(profile.id.startsWith('legacy-profile-'));
    }
    assert.ok(
      unit.profiles.every((profile) => {
        const sourceUnitName = profile.armyName.replace(/\s*\([^()]*\)\s*$/, '').trim();
        const baseUnitName = sourceUnitName.replace(/ FTO$/, '');
        const canonicalUnitName = sourceUnitName.endsWith(' FTO')
          && catalog.units.some((candidate) => candidate.name === baseUnitName)
          ? baseUnitName
          : sourceUnitName;
        return canonicalUnitName === unit.name;
      }),
      `${unit.name} profiles must stay grouped under their base unit`,
    );
    assert.ok(unit.profiles.every((profile) =>
      profile.specialRules.every((rule) => !unit.sharedSpecialRules.includes(rule)),
    ));
  }
});

test('los perfiles de tropas heredados no se presentan como verificados', () => {
  assert.ok(catalog.units.every((unit) => unit.verificationStatus === 'unverified'));
  assert.equal(catalog.metadata.verificationStatus, 'unverified');
  assert.equal('weapons' in catalog, false);
});

test('cada perfil hereda clase, fuente y estado de verificación de su unidad', () => {
  for (const unit of catalog.units) {
    assert.ok(unit.troopClass, `Falta troopClass en ${unit.name}`);
    assert.ok(unit.troopClassSource);
    assert.ok(['verified', 'incomplete'].includes(unit.troopClassVerificationStatus));
    for (const profile of unit.profiles) {
      const derivedProfile = troopProfiles.find((candidate) => candidate.id === profile.id);
      assert.equal(derivedProfile.troopClass, unit.troopClass);
      assert.equal(derivedProfile.troopClassSource, unit.troopClassSource);
      assert.equal(derivedProfile.troopClassVerificationStatus, unit.troopClassVerificationStatus);
    }
  }
  const ioann = catalog.units.find((unit) => unit.name === 'IOANN BANN');
  assert.ok(ioann);
  assert.equal(ioann.troopClass, 'Warbands');
  assert.equal(ioann.troopClassSource, 'Confirmación expresa del propietario, 2026-10-28');
});

test('los grupos por clase cubren cada unidad exactamente una vez y coinciden con su clase', () => {
  const seen = new Map();
  for (const group of catalog.troopClassGroups) {
    assert.ok(group.unitIds.length > 0, `Grupo vacío: ${group.troopClass}`);
    for (const unitId of group.unitIds) {
      assert.equal(seen.has(unitId), false, `Unidad duplicada: ${unitId}`);
      seen.set(unitId, group.troopClass);
    }
  }
  assert.equal(seen.size, catalog.units.length);
  for (const unit of catalog.units) assert.equal(seen.get(unit.id), unit.troopClass);
});

test('Ninja conserva atributos y reglas comunes con cada equipo y regla de perfil separado', () => {
  const ninja = catalog.units.find((unit) => unit.name === 'NINJA');
  assert.ok(ninja);
  assert.equal(ninja.profiles.length, 6);
  assert.ok(ninja.sharedSpecialRules.includes('Artes Marciales N3'));
  assert.ok(ninja.sharedSpecialRules.includes('Infiltración'));
  assert.deepEqual(
    ninja.profiles.map((profile) => profile.name),
    [
      'Arco Táctico(+1DE), Minas Shock',
      'Subfusil',
      'Fusil de Francotirador MULTI',
      'Hacker, Disp. Hacker',
      'Hacker, Disp. Hacker Asesino',
      'Observador de Artillería',
    ],
  );
  const hacker = ninja.profiles.find((profile) => profile.name === 'Hacker, Disp. Hacker');
  assert.ok(hacker.specialRules.includes('Hacker'));
  assert.equal(hacker.rangedEquipment, 'Subfusil');
});

test('distingue los perfiles cotejados con el PDF y las variantes confirmadas por el usuario', () => {
  const verifiedWeapons = weaponCatalog.profiles.filter((weapon) => weapon.verificationStatus === 'verified');
  const unverifiedWeapons = weaponCatalog.profiles.filter((weapon) => weapon.verificationStatus === 'unverified');
  const expectedSourceCounts = {
    '183': 7,
    '184': 24,
    '185': 8,
    '186': 15,
    '187': 10,
    '188': 14,
    '189': 10,
    '190': 11,
    '191': 17,
    '192': 14,
    '193': 5,
    '194': 11,
    '195': 21,
    '196': 9,
  };
  const pdfSourceCounts = Object.fromEntries(
    Object.keys(expectedSourceCounts).map((page) => [
      page,
      verifiedWeapons.filter((weapon) => weapon.source.endsWith(`p. ${page}`)).length,
    ]),
  );

  assert.equal(verifiedWeapons.length, 227);
  assert.equal(unverifiedWeapons.length, 0);
  assert.equal(
    verifiedWeapons.filter((weapon) => weapon.source.startsWith('Tablas de referencia rápida')).length,
    176,
  );
  assert.deepEqual(pdfSourceCounts, expectedSourceCounts);
  assert.equal(weaponCatalog.metadata.verificationStatus, 'verified');
  assert.equal(weaponCatalog.metadata.note, '227 perfiles conservan su verificación; 0 perfiles siguen pendientes de contraste.');
  assert.ok(unverifiedWeapons.every((weapon) => weapon.source.includes('Ultima versión .html')));
});

test('incluye los perfiles ausentes que se encontraron al cotejar las páginas 195 y 196', () => {
  for (const [name, page] of [
    ['Disco Ball', 195],
    ['Observador de Artillería', 195],
    ['Pitcher', 196],
  ]) {
    const profile = weaponCatalog.profiles.find((weapon) => weapon.name === name);
    assert.ok(profile);
    assert.equal(profile.verificationStatus, 'verified');
    assert.ok(profile.source.endsWith(`p. ${page}`));
  }
});

test('valida Mk12(AP) como variante AP del perfil Mk12', () => {
  const mk12 = weaponCatalog.profiles.find((weapon) => weapon.name === 'Mk12');
  const apVariant = weaponCatalog.profiles.find((weapon) => weapon.name === 'Mk12(AP)');
  assert.ok(mk12 && apVariant);
  assert.equal(apVariant.verificationStatus, 'verified');
  assert.equal(apVariant.rangeModifiers, mk12.rangeModifiers);
  assert.equal(apVariant.damage, mk12.damage);
  assert.equal(apVariant.burst, mk12.burst);
  assert.equal(apVariant.ammunition, 'AP');
  assert.equal(apVariant.saveAttribute, 'BLI/2');
  assert.equal(apVariant.saves, mk12.saves);
  assert.equal(apVariant.properties, mk12.properties);
  assert.ok(apVariant.source.includes('perfil Mk12 con munición AP'));
});

test('valida Pulso Flash(PS=6) reutilizando el perfil de Pulso Flash', () => {
  const flash = weaponCatalog.profiles.find((weapon) => weapon.name === 'Pulso Flash');
  const ps6Variant = weaponCatalog.profiles.find((weapon) => weapon.name === 'Pulso Flash(PS=6)');
  assert.ok(flash && ps6Variant);
  assert.equal(ps6Variant.verificationStatus, 'verified');
  assert.equal(ps6Variant.damage, '6');
  for (const key of ['rangeModifiers', 'burst', 'ammunition', 'saveAttribute', 'saves', 'properties']) {
    assert.equal(ps6Variant[key], flash[key], `${key} should match the reference profile`);
  }
  assert.ok(ps6Variant.source.includes('perfil Pulso Flash con PS=6'));
});

test('usa la paleta de la referencia para los modificadores de alcance', () => {
  assert.match(stylesheet, /\.range-band\.short\s*\{\s*background:\s*#eba244/i);
  assert.match(stylesheet, /\.range-band\.positive\s*\{\s*background:\s*#7da76d/i);
  assert.match(stylesheet, /\.range-band\.neutral\s*\{\s*background:\s*#3fb3cf/i);
  assert.match(stylesheet, /\.range-band\.long\s*\{\s*background:\s*#da5453/i);
  assert.match(stylesheet, /\.range-band\.unavailable\s*\{\s*background:\s*#231f20/i);
  assert.match(stylesheet, /\.range-band\s*\{[^}]*color:\s*#1b2024/i);
});

test('no clasifica equipo ni periféricos como perfiles de arma', () => {
  const nonWeaponNames = [
    'Cobertura Desplegable',
    'ECM: Hacker [-6]',
    'KOBARUTO',
    'TURTLEMEK',
  ];

  for (const name of nonWeaponNames) {
    assert.equal(
      weaponCatalog.profiles.some((weapon) => weapon.name === name),
      false,
      `${name} must not be in the weapon catalog`,
    );
    assert.ok(migrationScript.includes(`'${name}'`), `${name} must be excluded from migration`);
  }
  assert.match(migrationScript, /!nonWeaponProfileNames\.has\(previousWeapon\.name\)/);
});

test('valida los perfiles (+1R) sin reinterpretar ni modificar sus datos', () => {
  const variants = weaponCatalog.profiles.filter((weapon) => weapon.name.endsWith('(+1R)'));
  assert.equal(variants.length, 13);
  assert.ok(variants.every((weapon) => weapon.verificationStatus === 'verified'));
  assert.ok(variants.every((weapon) => weapon.source.includes('(+1R) identifica +1 a Ráfaga')));
});

test('valida las variantes Arma CC con PS como Prueba de Salvación', () => {
  const variants = weaponCatalog.profiles.filter((weapon) => /^Arma CC .+\(PS=\d+\)$/.test(weapon.name));
  assert.equal(variants.length, 24);
  assert.ok(variants.every((weapon) => weapon.verificationStatus === 'verified'));
  assert.ok(
    variants
      .filter((weapon) => weapon.name !== 'Arma CC DA(PS=8)')
      .every((weapon) => weapon.source.includes('Prueba de Salvación')),
  );
});

test('coteja la variante Arma CC DA(PS=8) con su perfil de referencia equivalente', () => {
  const referenceProfile = weaponCatalog.profiles.find((weapon) => weapon.name === 'Arma CC DA');
  const variant = weaponCatalog.profiles.find((weapon) => weapon.name === 'Arma CC DA(PS=8)');
  assert.ok(referenceProfile && variant);
  assert.equal(variant.verificationStatus, 'verified');
  assert.ok(variant.source.endsWith('p. 184'));
  for (const key of ['damage', 'burst', 'ammunition', 'saveAttribute', 'saves', 'properties']) {
    assert.equal(variant[key], referenceProfile[key], `${key} should match the reference profile`);
  }
});

test('valida nombres genéricos cuyos modos individuales ya están cotejados', () => {
  for (const name of [
    'Carabina de Plasma',
    'Fusil de Plasma',
    'Fusil MULTI',
    'Fusil de Francotirador MULTI',
    'Fusil de Precisión MULTI',
    'Lanzacohetes Pesado',
    'Drop Bears',
    'Spitfire MULTI',
    'Cargas-D',
    'Lanzamisiles',
  ]) {
    const profile = weaponCatalog.profiles.find((weapon) => weapon.name === name);
    assert.ok(profile);
    assert.equal(profile.verificationStatus, 'verified');
    assert.ok(profile.source.includes('modos individuales verificados'));
  }

  for (const name of [
    'Carabina de Plasma (Modo Expansivo)',
    'Carabina de Plasma (Modo Impacto)',
    'Fusil MULTI (Modo AP)',
    'Fusil MULTI (Modo Shock)',
    'Fusil MULTI (Modo Antimaterial)',
    'Fusil de Francotirador MULTI (Modo AP)',
    'Fusil de Francotirador MULTI (Modo Shock)',
    'Fusil de Francotirador MULTI (Modo Antimaterial)',
    'Fusil de Precisión MULTI (Modo AP)',
    'Fusil de Precisión MULTI (Modo Shock)',
    'Fusil de Precisión MULTI (Modo Antimaterial)',
    'Fusil de Plasma (Modo Expansivo)',
    'Fusil de Plasma (Modo Impacto)',
    'Lanzacohetes Pesado (Modo Expansivo)',
    'Lanzacohetes Pesado (Modo Impacto)',
    'Drop Bears (Modo CD)',
    'Drop Bears (Modo Posicionable)',
    'Spitfire MULTI (Modo AP)',
    'Spitfire MULTI (Modo Shock)',
    'Spitfire MULTI (Modo Antimaterial)',
    'Cargas-D (Modo Demolición)',
    'Cargas-D (Modo CC)',
    'Lanzamisiles (Modo Impacto)',
    'Lanzamisiles (Modo Expansivo)',
  ]) {
    const profile = weaponCatalog.profiles.find((weapon) => weapon.name === name);
    assert.ok(profile, `missing mode profile: ${name}`);
    assert.equal(profile.verificationStatus, 'verified', `${name} should be verified`);
  }
});

test('valida torretas artilladas usando el arma indicada en el perfil', () => {
  for (const [turretName, weaponName] of [
    ['Torreta Artillada (Fusil Combi)', 'Fusil Combi'],
    ['Torreta Artillada (Fusil AP)', 'Fusil AP'],
    ['Torreta Artillada (F. Combi)', 'Fusil Combi'],
  ]) {
    const turret = weaponCatalog.profiles.find((weapon) => weapon.name === turretName);
    const weapon = weaponCatalog.profiles.find((item) => item.name === weaponName);
    assert.ok(turret && weapon);
    assert.equal(turret.verificationStatus, 'verified');
    for (const key of ['rangeModifiers', 'damage', 'burst', 'ammunition', 'saveAttribute', 'saves']) {
      assert.equal(turret[key], weapon[key], `${turretName} ${key} should match ${weaponName}`);
    }
    assert.ok(turret.source.includes('infinitythewiki.com/Armed_Turret'));
  }
});

test('actualiza los campos que diferían entre el HTML y las páginas del PDF', () => {
  const profileByName = new Map(weaponCatalog.profiles.map((weapon) => [weapon.name, weapon]));

  assert.equal(profileByName.get('Cañón Portátil Automático').rangeModifiers, '-3,0,+3,+3,-3,--,--');
  assert.equal(profileByName.get('Descubrir').rangeModifiers, '+3,0,0,-3,-6,--,--');
  assert.equal(profileByName.get('Disco Baller').rangeModifiers, '0,+3,-3,-6,-6,--,--');
  assert.equal(profileByName.get('Pulso Flash').rangeModifiers, '0,+3,+3,-3,-3,-6,--');
  assert.equal(profileByName.get('Pulso Flash').ammunition, 'Aturdidora');
  assert.equal(profileByName.get('Pulso Flash').saves, '1');
  assert.equal(profileByName.get('Uragan MRL (Modo Expansivo)').rangeModifiers, '-3,+3,0,0,-6,--,--');
});

test('la disponibilidad sectorial se asigna por unidad con fuente y sin tocar perfiles', () => {
  const unitById = new Map(catalog.units.map((unit) => [unit.id, unit]));
  const bySectorial = Object.fromEntries(catalog.sectorials.map((s) => [s.id, new Set(s.unitIds.map((id) => unitById.get(id).name))]));
  assert.equal(catalog.sectorials.length, 3);
  for (const sectorial of catalog.sectorials) {
    assert.equal(sectorial.verificationStatus, 'unit-level');
    assert.ok(sectorial.source && sectorial.rosterImage);
    assert.equal(new Set(sectorial.unitIds).size, sectorial.unitIds.length);
    assert.ok(sectorial.unitIds.every((id) => unitById.has(id)), sectorial.id);
    assert.ok(!('profileIds' in sectorial));
  }
  for (const unit of catalog.units) {
    const expected = catalog.sectorials.filter((s) => s.unitIds.includes(unit.id)).map((s) => s.id);
    assert.deepEqual(unit.sectorialIds, expected, unit.name);
  }
  // Decisiones del propietario: la imagen v4 prevalece sobre Human Sphere.
  assert.ok(bySectorial['jsa-shindenbutai'].has('IOANN BANN'));
  assert.ok(!bySectorial['jsa-oban'].has('SĀCHĀ'));
  assert.ok(bySectorial['jsa-shindenbutai'].has('SĀCHĀ'));
  assert.ok(bySectorial['jsa-oban'].has('YUAN YUAN') && !bySectorial['jsa-vanilla'].has('YUAN YUAN'));
  for (const sectorial of Object.values(bySectorial)) {
    for (const unit of ['KAIZOKU', 'ATOMU SPECBOT_1', 'ATOMU SPECBOT_2']) assert.ok(sectorial.has(unit), unit);
  }
  assert.deepEqual(['jsa-vanilla', 'jsa-oban', 'jsa-shindenbutai'].map((id) => bySectorial[id].has('AÏDA SWANSON')), [false, false, true]);
  assert.deepEqual(['jsa-vanilla', 'jsa-oban', 'jsa-shindenbutai'].map((id) => bySectorial[id].has('SAMSA')), [false, true, false]);
  assert.deepEqual(['jsa-vanilla', 'jsa-oban', 'jsa-shindenbutai'].map((id) => bySectorial[id].has('MIYAMOTO MUSHASHI')), [true, true, false]);
  assert.deepEqual(['jsa-vanilla', 'jsa-oban', 'jsa-shindenbutai'].map((id) => bySectorial[id].has('YOJIMBO')), [false, true, true]);
  const kaizoku = catalog.units.find((unit) => unit.name === 'KAIZOKU');
  assert.deepEqual(kaizoku.sharedSpecialRules, ['Coraje', 'Infinity Spec-Ops', 'Inmunidad (Shock)', 'Terreno (Total)']);
  for (const profile of kaizoku.profiles) {
    assert.ok(!profile.specialRules.some((rule) => /MEJORADO|SpecBall/.test(rule)), profile.name);
  }
  assert.ok(!bySectorial['jsa-oban'].has('SENKU') && bySectorial['jsa-vanilla'].has('SENKU'));
});
