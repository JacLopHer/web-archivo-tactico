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
  assert.equal(weaponCatalog.profiles.length, 228);
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
  };
  const sourceCounts = Object.fromEntries(
    Object.keys(expectedSourceCounts).map((page) => [
      page,
      verifiedWeapons.filter((weapon) => weapon.source.endsWith(`p. ${page}`)).length,
    ]),
  );

  assert.equal(verifiedWeapons.length, 129);
  assert.equal(unverifiedWeapons.length, 99);
  assert.deepEqual(sourceCounts, expectedSourceCounts);
  assert.equal(weaponCatalog.metadata.verificationStatus, 'incomplete');
  assert.ok(unverifiedWeapons.every((weapon) => weapon.source.includes('Ultima versión .html')));
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
