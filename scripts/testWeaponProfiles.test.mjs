import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createWeaponIndex,
  getProfileWeapons,
  getRangeModifierLabel,
  getRangeModifiers,
  splitEquipmentNames,
} from '../src/domain/weaponProfiles.mjs';

const catalog = JSON.parse(
  await readFile(new URL('../src/data/legacyJsaCatalog.json', import.meta.url), 'utf8'),
);
const weaponCatalog = JSON.parse(
  await readFile(new URL('../src/data/weaponProfiles.json', import.meta.url), 'utf8'),
);
const weaponIndex = createWeaponIndex(weaponCatalog.profiles);

test('separa equipo múltiple y conserva armamento secundario', () => {
  assert.deepEqual(splitEquipmentNames('Fusil Combi, Nanopulser || KOBARUTO'), [
    'Fusil Combi',
    'Nanopulser',
    'KOBARUTO',
  ]);
});

test('resuelve perfiles coincidentes y mantiene explícitos los no encontrados', () => {
  const profile = catalog.profiles.find((item) => item.name === 'SHINOBU');
  const weapons = getProfileWeapons(profile, weaponIndex);
  const combi = weapons.find((weapon) => weapon.name === 'Fusil Combi');
  const mono = weapons.find((weapon) => weapon.name === 'Arma CC Monofilo');

  assert.equal(combi.category, 'CD / EQ');
  assert.equal(combi.profile.name, 'Fusil Combi');
  assert.equal(mono.category, 'CC');
  assert.equal(mono.profile.name, 'Arma CC Monofilo');
  assert.equal(combi.profile.verificationStatus, 'verified');
  assert.equal(mono.profile.verificationStatus, 'verified');

  const unmatchedProfile = catalog.profiles.find((item) => item.rangedEquipment.includes('Arco Táctico(+1DE)'));
  const unmatched = getProfileWeapons(unmatchedProfile, weaponIndex)
    .find((weapon) => weapon.name === 'Arco Táctico(+1DE)');
  assert.equal(unmatched.profile, undefined);
});

test('cada perfil de arma conserva siete bandas de alcance cuando es a distancia', () => {
  const rangedWeapons = weaponCatalog.profiles.filter((weapon) => weapon.rangeModifiers);
  assert.ok(rangedWeapons.length > 0);
  assert.ok(rangedWeapons.every((weapon) => weapon.rangeModifiers.split(',').length === 7));
  assert.deepEqual(getRangeModifiers(rangedWeapons[0]), rangedWeapons[0].rangeModifiers.split(',').map((value) => value.trim()));
});

test('las armas sin perfil de alcance se representan sin bandas', () => {
  const meleeWeapon = weaponCatalog.profiles.find((weapon) => weapon.name === 'Arma CC Monofilo');
  assert.equal(meleeWeapon.rangeModifiers, '');
  assert.deepEqual(getRangeModifiers(meleeWeapon), []);
});

test('las bandas negras permanecen vacías mientras conservan su valor en los datos', () => {
  const weapon = weaponCatalog.profiles.find((item) => item.name === 'Panzerfaust');
  assert.equal(getRangeModifiers(weapon).at(-1), '--');
  assert.equal(getRangeModifierLabel('--'), '');
  assert.equal(getRangeModifierLabel('+3'), '+3');
});

test('resuelve alias heredados y conserva notas de despliegue fuera de los alcances', () => {
  const mina = weaponIndex.get('MinaShock');
  const minaHeredada = weaponIndex.get('MinasShock');
  const cibermina = weaponIndex.get('Cibermina');

  assert.equal(mina, minaHeredada);
  assert.equal(mina.name, 'Mina Shock');
  assert.equal(mina.verificationStatus, 'verified');
  assert.equal(cibermina.rangeNote, 'BLI=0 | PB=0 | EST=1 | S=0');
  assert.deepEqual(getRangeModifiers(cibermina), []);
});
