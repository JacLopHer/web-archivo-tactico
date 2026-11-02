import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getCardRules, getUnitCardTags, parseOrders } from '../src/domain/unitCardInfo.mjs';

const catalog = JSON.parse(readFileSync(new URL('../src/data/nomadsAlephCatalog.json', import.meta.url), 'utf8'));

test('parseOrders agrupa y ordena las órdenes del perfil', () => {
  assert.deepEqual(parseOrders(['LIEUTENANT:1', 'REGULAR:1', 'TACTICAL:1']).map(({ type, count }) => [type, count]), [
    ['REGULAR', 1], ['LIEUTENANT', 1], ['TACTICAL', 1],
  ]);
  assert.equal(parseOrders(['LIEUTENANT:2'])[0].count, 2);
  assert.deepEqual(parseOrders(['DESCONOCIDA:1', undefined]), []);
  assert.deepEqual(parseOrders(), []);
});

test('hackeable solo se activa con la característica exacta', () => {
  assert.equal(getUnitCardTags({ characteristics: ['Regular', 'Hackeable'] }).hackable, true);
  assert.equal(getUnitCardTags({ characteristics: ['No Hackeable'] }).hackable, false);
  assert.equal(getUnitCardTags({}).hackable, false);
});

test('el texto de reglas omite las características que ya son etiquetas', () => {
  assert.equal(
    getCardRules({
      sharedSpecialRules: ['Coraje'],
      additionalSpecialRules: ['Teniente'],
      characteristics: ['Regular', 'No Impetuoso', 'Hackeable', 'Petaca 2.0'],
    }),
    'Coraje, Teniente, Petaca 2.0',
  );
});

test('el catálogo aporta órdenes de teniente y Sentido Táctico por perfil', () => {
  const shukra = catalog.units.find((unit) => unit.name === 'SHUKRA');
  const lieutenant = shukra.profiles.find((profile) => profile.specialRules.includes('Teniente'));
  assert.ok(parseOrders(lieutenant.orders).some((order) => order.type === 'LIEUTENANT'));
  const types = new Set(catalog.units.flatMap((unit) => unit.profiles).flatMap((profile) => parseOrders(profile.orders).map((order) => order.type)));
  for (const type of ['REGULAR', 'IRREGULAR', 'IMPETUOUS', 'LIEUTENANT', 'TACTICAL']) assert.ok(types.has(type), type);
});
