import assert from 'node:assert/strict';
import test from 'node:test';
import { PRINT_LAYOUTS, getCellSizeMm, paginateCompactEntries, paginateEntries } from '../src/domain/printLayout.mjs';

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

test('la cuadrícula detallada es de 3 fichas por A4 y la compacta de 10', () => {
  assert.equal(PRINT_LAYOUTS.detailed.cols * PRINT_LAYOUTS.detailed.rows, 3);
  assert.equal(PRINT_LAYOUTS.compact.cols * PRINT_LAYOUTS.compact.rows, 10);
  for (const layout of Object.values(PRINT_LAYOUTS)) {
    const cell = getCellSizeMm(layout);
    const totalHeight = cell.height * layout.rows + layout.gapMm * (layout.rows - 1) + 2 * layout.marginMm;
    const totalWidth = cell.width * layout.cols + layout.gapMm * (layout.cols - 1) + 2 * layout.marginMm;
    assert.ok(Math.abs(totalHeight - 297) < 1e-9);
    assert.ok(Math.abs(totalWidth - 210) < 1e-9);
  }
});

test('paginateEntries agrupa de 3 en 3 y respeta los modos de salto', () => {
  const cards = entries([...Array(5).fill('A'), ...Array(2).fill('B')]);

  assert.deepEqual(paginateEntries(cards, 3, 'automatic').map((page) => page.length), [3, 2, 2]);
  assert.deepEqual(paginateEntries(cards, 3, 'group').map((page) => page.length), [3, 2, 2]);
  assert.deepEqual(paginateEntries(cards, 3, 'card').map((page) => page.length), Array(7).fill(1));
  assert.deepEqual(paginateEntries([], 3), []);
  assert.deepEqual(paginateEntries(entries(['A']), 3).map((page) => page.length), [1]);
});

test('colecciones de 20+ fichas sin grupo ocupan hojas completas de 10 o de 3', () => {
  const cards = entries(Array(23).fill(undefined));

  assert.deepEqual(paginateEntries(cards, 10).map((page) => page.length), [10, 10, 3]);
  assert.deepEqual(paginateEntries(cards, 3).map((page) => page.length), [3, 3, 3, 3, 3, 3, 3, 2]);
});
