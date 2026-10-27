import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalog = JSON.parse(
  await readFile(new URL('../src/data/legacyJsaCatalog.json', import.meta.url), 'utf8'),
);

test('el catálogo migrado conserva el inventario heredado', () => {
  assert.equal(catalog.profiles.length, 181);
  assert.equal(catalog.weapons.length, 228);
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

test('perfiles y armas heredados no se presentan como verificados', () => {
  assert.ok(catalog.profiles.every((profile) => profile.verificationStatus === 'unverified'));
  assert.ok(catalog.weapons.every((weapon) => weapon.verificationStatus === 'unverified'));
  assert.equal(catalog.metadata.verificationStatus, 'unverified');
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
