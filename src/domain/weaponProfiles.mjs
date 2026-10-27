const normalize = (value) => value.toLocaleLowerCase().replace(/[\s()+\-[\]\/]/g, '');

export function splitEquipmentNames(equipment) {
  return equipment
    .split(/[|,]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function createWeaponIndex(weapons) {
  return new Map(weapons.map((weapon) => [normalize(weapon.name), weapon]));
}

export function getRangeModifiers(weapon) {
  return weapon.rangeModifiers.trim()
    ? weapon.rangeModifiers.split(',').map((modifier) => modifier.trim())
    : [];
}

export function getProfileWeapons(profile, index) {
  return [
    ...splitEquipmentNames(profile.rangedEquipment).map((name) => ({ name, category: 'CD / EQ' })),
    ...splitEquipmentNames(profile.meleeEquipment).map((name) => ({ name, category: 'CC' })),
  ].map(({ name, category }) => ({
    name,
    category,
    profile: index.get(normalize(name)),
  }));
}
