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

// Equipo automático y periféricos: no son armas y no tienen perfil de arma.
const EQUIPMENT_ONLY = /^(ECM\b|Cobertura Desplegable|KOBARUTO|TURTLEMEK)/i;

function findWeapon(index, name) {
  const exact = index.get(normalize(name));
  if (exact) return { profile: exact };

  // El arma siempre es la base; el modificador (+1DE, PS=6, -3, Shock...) se muestra solo como texto.
  const match = name.match(/^(.*\S)\s*[([]([^)\]]*)[)\]]$/);
  if (match) {
    const base = index.get(normalize(match[1]));
    if (base) return { profile: base, modifier: match[2].trim() };
  }

  // Si el arma solo existe por modos, se devuelve una fila por cada modo.
  const modePrefix = `${normalize(match ? match[1] : name)}modo`;
  const modes = [...new Set(index.values())].filter((weapon) => normalize(weapon.name).startsWith(modePrefix));
  return modes.length ? { modes, modifier: match?.[2].trim() } : {};
}

export function getProfileWeapons(profile, index) {
  return [
    ...splitEquipmentNames(profile.rangedEquipment).map((name) => ({ name, category: 'CD / EQ' })),
    ...splitEquipmentNames(profile.meleeEquipment).map((name) => ({ name, category: 'CC' })),
  ].flatMap(({ name, category }) => {
    const { profile: found, modes, modifier } = findWeapon(index, name);
    if (modes) return modes.map((weapon) => ({ name: weapon.name, category, profile: weapon, modifier }));
    if (!found && EQUIPMENT_ONLY.test(name)) return [{ name, category, profile: undefined, equipment: true }];
    return [{ name, category, profile: found, modifier }];
  });
}
