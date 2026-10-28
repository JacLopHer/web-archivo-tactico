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
const troopProfiles = catalog.units.flatMap((unit) =>
  unit.profiles.map((profile) => ({
    id: profile.id,
    name: profile.armyName,
    troopType: unit.troopType,
    stats: unit.stats,
    woundsLabel: unit.woundsLabel,
    skillsAndEquipment: [...unit.sharedSpecialRules, ...profile.specialRules].join(' · '),
    rangedEquipment: profile.rangedEquipment,
    meleeEquipment: profile.meleeEquipment,
    cap: profile.cap,
    points: profile.points,
    factionId: unit.factionId,
    sectorialIds: unit.sectorialIds,
    edition: unit.edition,
    source: unit.source,
    verificationStatus: unit.verificationStatus,
  })),
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
  const profile = troopProfiles.find((item) => item.name === 'SHINOBU');
  const weapons = getProfileWeapons(profile, weaponIndex);
  const combi = weapons.find((weapon) => weapon.name === 'Fusil Combi');
  const mono = weapons.find((weapon) => weapon.name === 'Arma CC Monofilo');

  assert.equal(combi.category, 'CD / EQ');
  assert.equal(combi.profile.name, 'Fusil Combi');
  assert.equal(mono.category, 'CC');
  assert.equal(mono.profile.name, 'Arma CC Monofilo');
  assert.equal(combi.profile.verificationStatus, 'verified');
  assert.equal(mono.profile.verificationStatus, 'verified');

  const unmatchedProfile = troopProfiles.find((item) => item.rangedEquipment.includes('Arco Táctico(+1DE)'));
  const withModifier = getProfileWeapons(unmatchedProfile, weaponIndex)
    .find((weapon) => weapon.modifier === '+1DE');
  assert.equal(withModifier.profile.name, 'Arco Táctico');
});

test('los modificadores se muestran como texto sobre el arma base y los modos generan una fila cada uno', () => {
  const lookup = (equipment, melee = '') => getProfileWeapons({ rangedEquipment: equipment, meleeEquipment: melee }, weaponIndex);

  const grenades = lookup('Granadas(PS=6)')[0];
  assert.equal(grenades.profile.name, 'Granadas');
  assert.equal(grenades.modifier, 'PS=6');
  assert.equal(lookup('Arco Táctico(+1R)')[0].profile.name, 'Arco Táctico(+1R)');
  assert.equal(lookup('', 'Arma CC PARA(-3)')[0].profile.name, 'Arma CC PARA');

  const modes = lookup('Ametralladora MULTI');
  assert.deepEqual(modes.map((weapon) => weapon.name), [
    'Ametralladora MULTI (Modo AP)',
    'Ametralladora MULTI (Modo Shock)',
    'Ametralladora MULTI (Modo Antimaterial)',
  ]);
  assert.equal(lookup('Flammenspeer').length, 2);
  assert.equal(lookup('Pistola de Abordaje').length, 2);
});

test('el equipo automático y los periféricos se marcan como equipo y no como armas sin perfil', () => {
  const items = getProfileWeapons({ rangedEquipment: 'ECM: Hacker [-6], Cobertura Desplegable, KOBARUTO, TURTLEMEK', meleeEquipment: '' }, weaponIndex);
  assert.equal(items.length, 4);
  assert.ok(items.every((item) => item.equipment && !item.profile));
});

test('todas las armas del catálogo se resuelven o son equipo', () => {
  const unresolved = troopProfiles.flatMap((item) => getProfileWeapons(item, weaponIndex))
    .filter((weapon) => !weapon.profile && !weapon.equipment);
  assert.deepEqual(unresolved, []);
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
