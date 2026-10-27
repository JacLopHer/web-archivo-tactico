const normalize = (value) =>
  value
    .toLocaleLowerCase()
    .replace(/[\s()+\-[\]\/]/g, '')
    .replace(/ss+/g, 's');

function weaponKeys(name) {
  const normalized = normalize(name);
  const singularized = normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
  return [normalized, singularized];
}

export function splitEquipmentNames(equipment) {
  return equipment
    .split(/[|,]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function createWeaponIndex(weapons) {
  const normalizedEntries = new Map();

  for (const weapon of weapons) {
    for (const name of [weapon.name, ...(weapon.aliases ?? [])]) {
      for (const key of weaponKeys(name)) {
        normalizedEntries.set(key, weapon);
      }
    }
  }

  return {
    get(key) {
      return normalizedEntries.get(normalize(String(key)));
    },
    has(key) {
      return normalizedEntries.has(normalize(String(key)));
    },
    values() {
      return normalizedEntries.values();
    },
    entries() {
      return normalizedEntries.entries();
    },
    [Symbol.iterator]() {
      return normalizedEntries[Symbol.iterator]();
    },
  };
}

export function getRangeModifiers(weapon) {
  return weapon.rangeModifiers.trim()
    ? weapon.rangeModifiers.split(',').map((modifier) => modifier.trim())
    : [];
}

export function getRangeModifierLabel(value) {
  return value === '--' ? '' : value;
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
