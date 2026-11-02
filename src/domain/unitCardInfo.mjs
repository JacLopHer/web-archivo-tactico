const ORDER_LABELS = {
  REGULAR: { short: 'REG', label: 'Orden Regular' },
  IRREGULAR: { short: 'IRR', label: 'Orden Irregular' },
  IMPETUOUS: { short: 'IMP', label: 'Orden Impetuosa' },
  LIEUTENANT: { short: 'TEN', label: 'Orden de Teniente' },
  TACTICAL: { short: 'TAC', label: 'Orden de Sentido Táctico' },
};
const ORDER_SEQUENCE = Object.keys(ORDER_LABELS);
const STATUS_CHARACTERISTICS = new Set(['regular', 'irregular', 'impetuoso', 'no impetuoso', 'hackeable', 'no hackeable']);

const normalize = (value) => String(value).trim().toLowerCase();

export function parseOrders(orders = []) {
  const totals = new Map();
  for (const entry of orders) {
    const [type, rawCount] = String(entry).split(':');
    if (!ORDER_LABELS[type]) continue;
    const count = Number.parseInt(rawCount ?? '1', 10);
    totals.set(type, (totals.get(type) ?? 0) + (Number.isFinite(count) && count > 0 ? count : 1));
  }
  return ORDER_SEQUENCE.filter((type) => totals.has(type)).map((type) => ({
    type,
    count: totals.get(type),
    short: ORDER_LABELS[type].short,
    label: ORDER_LABELS[type].label,
  }));
}

export function isHackable(characteristics = []) {
  return characteristics.some((value) => normalize(value) === 'hackeable');
}

export function getUnitCardTags(profile) {
  return {
    orders: parseOrders(profile.orders),
    hackable: isHackable(profile.characteristics),
  };
}

// Regular/Irregular, Impetuoso y Hackeable ya se muestran como etiquetas; el resto de características sigue en el texto.
export function getCardRules(profile) {
  const characteristics = (profile.characteristics ?? []).filter((value) => !STATUS_CHARACTERISTICS.has(normalize(value)));
  return [...(profile.sharedSpecialRules ?? []), ...(profile.additionalSpecialRules ?? []), ...characteristics].join(', ');
}
