import assert from 'node:assert/strict';
import test from 'node:test';
import { paginateCompactEntries } from '../src/domain/printLayout.mjs';

const entries = (groups) => groups.map((groupName, index) => ({
  item: { id: index, groupName },
}));

test('compacta un grupo de diez fichas en una sola página conservando el orden', () => {
  const cards = entries(Array(10).fill('Grupo 1'));
  const pages = paginateCompactEntries(cards);

  assert.equal(pages.length, 1);
  assert.equal(pages[0].length, 10);
  assert.deepEqual(pages[0], cards);
});

test('no mezcla grupos compactos distintos en una hoja y divide grupos largos cada diez', () => {
  const cards = entries([
    ...Array(8).fill('Grupo 1'),
    ...Array(12).fill('Grupo 2'),
  ]);
  const pages = paginateCompactEntries(cards);

  assert.deepEqual(pages.map((page) => page.length), [8, 10, 2]);
  assert.deepEqual(pages.flat(), cards);
});

test('conserva fichas repetidas y rechaza límites de página no válidos', () => {
  const repeated = { item: { id: 1, profileId: 'ninja', groupName: 'Grupo 1' } };
  const pages = paginateCompactEntries([repeated, repeated]);

  assert.deepEqual(pages, [[repeated, repeated]]);
  assert.throws(() => paginateCompactEntries([repeated], 0), RangeError);
});
