import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalog = JSON.parse(
  await readFile(new URL('../src/data/legacyJsaCatalog.json', import.meta.url), 'utf8'),
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
  assert.equal(catalog.profiles.length, 181);
  assert.equal(weaponCatalog.profiles.length, 227);
  assert.equal(catalog.references.length, 8);
});

test('cada perfil tiene una identidad única y los diez atributos tipados', () => {
  const profileIds = catalog.profiles.map((profile) => profile.id);
  assert.equal(new Set(profileIds).size, profileIds.length);

  for (const profile of catalog.profiles) {
    assert.deepEqual(Object.keys(profile.stats), [
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
  }
});

test('los perfiles de tropas heredados no se presentan como verificados', () => {
  assert.ok(catalog.profiles.every((profile) => profile.verificationStatus === 'unverified'));
  assert.equal(catalog.metadata.verificationStatus, 'unverified');
  assert.equal('weapons' in catalog, false);
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

test('no se asigna disponibilidad sectorial sin datos de pertenencia', () => {
  assert.ok(catalog.sectorials.length > 0);
  assert.ok(
    catalog.sectorials.every(
      (sectorial) => sectorial.verificationStatus === 'unmapped' && sectorial.profileIds.length === 0,
    ),
  );
  assert.ok(catalog.profiles.every((profile) => profile.sectorialIds.length === 0));
});
