import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalog = JSON.parse(
  await readFile(new URL('../src/data/legacyJsaCatalog.json', import.meta.url), 'utf8'),
);
const weaponCatalog = JSON.parse(
  await readFile(new URL('../src/data/weaponProfiles.json', import.meta.url), 'utf8'),
);

test('el catálogo migrado conserva el inventario heredado', () => {
  assert.equal(catalog.profiles.length, 181);
  assert.equal(weaponCatalog.profiles.length, 231);
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

test('solo los perfiles cotejados con el PDF figuran como verificados', () => {
  const verifiedWeapons = weaponCatalog.profiles.filter((weapon) => weapon.verificationStatus === 'verified');
  const unverifiedWeapons = weaponCatalog.profiles.filter((weapon) => weapon.verificationStatus === 'unverified');
  const expectedSourceCounts = {
    '183': 7,
    '184': 23,
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
  const sourceCounts = Object.fromEntries(
    Object.keys(expectedSourceCounts).map((page) => [
      page,
      verifiedWeapons.filter((weapon) => weapon.source.endsWith(`p. ${page}`)).length,
    ]),
  );

  assert.equal(verifiedWeapons.length, 175);
  assert.equal(unverifiedWeapons.length, 56);
  assert.deepEqual(sourceCounts, expectedSourceCounts);
  assert.equal(weaponCatalog.metadata.verificationStatus, 'incomplete');
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

test('conserva el sufijo (+1R) sin reinterpretarlo como cambio de perfil', () => {
  const profile = weaponCatalog.profiles.find((weapon) => weapon.name === 'Arco Táctico(+1R)');
  assert.ok(profile);
  assert.equal(profile.verificationStatus, 'unverified');
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
