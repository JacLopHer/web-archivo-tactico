import assert from 'node:assert/strict';
import test from 'node:test';
import { DUPLEX_FLIP_EDGES, PRINT_LAYOUTS, A4_MM, buildDuplexSheets, getCellSizeMm, isCardOverflowing, mirrorSlotIndex, paginateCompactEntries, paginateEntries } from '../src/domain/printLayout.mjs';

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

const duplexLayout = PRINT_LAYOUTS.duplex;

test('el formato dúplex es 2×5 en A4 con celdas de 99×57 mm y márgenes imprimibles', () => {
  const cell = getCellSizeMm(duplexLayout);
  assert.equal(duplexLayout.cols * duplexLayout.rows, 10);
  assert.ok(Math.abs(cell.width - 99) < 1e-9 && Math.abs(cell.height - 57) < 1e-9);
  assert.ok(duplexLayout.marginMm >= 5);
  assert.ok(cell.width * duplexLayout.cols + 2 * duplexLayout.marginMm <= A4_MM.width + 1e-9);
  assert.ok(cell.height * duplexLayout.rows + 2 * duplexLayout.marginMm <= A4_MM.height + 1e-9);
});

test('el espejo del reverso es una permutación que invierte columnas (borde largo) o filas (corto)', () => {
  const { cols, rows } = duplexLayout;
  assert.deepEqual(DUPLEX_FLIP_EDGES, ['long', 'short']);
  assert.equal(mirrorSlotIndex(0, cols, rows, 'long'), 1);
  assert.equal(mirrorSlotIndex(1, cols, rows, 'long'), 0);
  assert.equal(mirrorSlotIndex(8, cols, rows, 'long'), 9);
  assert.equal(mirrorSlotIndex(0, cols, rows, 'short'), 8);
  assert.equal(mirrorSlotIndex(3, cols, rows, 'short'), 7);
  for (const edge of DUPLEX_FLIP_EDGES) {
    const mapped = Array.from({ length: 10 }, (_, slot) => mirrorSlotIndex(slot, cols, rows, edge));
    assert.deepEqual([...mapped].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    mapped.forEach((target, slot) => assert.equal(mirrorSlotIndex(target, cols, rows, edge), slot));
  }
  assert.throws(() => mirrorSlotIndex(0, 2, 5, 'diagonal'), RangeError);
  assert.throws(() => mirrorSlotIndex(10, 2, 5, 'long'), RangeError);
});

test('cada reverso queda detrás de su anverso, con repetidas, grupos y hojas parciales', () => {
  const cards = [
    ...Array.from({ length: 12 }, (_, id) => ({ item: { id, profileId: id < 3 ? 'ninja' : `p${id}`, groupName: 'A' } })),
    ...Array.from({ length: 3 }, (_, id) => ({ item: { id: 100 + id, profileId: 'ninja', groupName: 'B' } })),
  ];

  for (const edge of DUPLEX_FLIP_EDGES) {
    const sheets = buildDuplexSheets(cards, edge);
    assert.deepEqual(sheets.map((sheet) => sheet.front.filter((slot) => slot.entry).length), [10, 5]);
    assert.deepEqual(sheets.flatMap((sheet) => sheet.front.filter((slot) => slot.entry).map((slot) => slot.entry)), cards);

    for (const sheet of sheets) {
      assert.equal(sheet.front.length, 10);
      assert.equal(sheet.back.length, 10);
      sheet.front.forEach((front, slot) => {
        assert.equal(front.position, front.entry ? slot + 1 : null);
        if (!front.entry) return;
        const back = sheet.back[mirrorSlotIndex(slot, 2, 5, edge)];
        assert.equal(back.entry, front.entry);
        assert.equal(back.entry.item.id, front.entry.item.id);
        assert.equal(back.position, front.position);
      });
      assert.equal(sheet.back.filter((slot) => slot.entry).length, sheet.front.filter((slot) => slot.entry).length);
    }
  }
});

test('una misma ficha repetida conserva el emparejamiento por posición', () => {
  const same = { item: { id: 1, groupName: 'A' } };
  const [sheet] = buildDuplexSheets([same, same, same], 'long');

  assert.deepEqual(sheet.back.map((slot) => slot.position).slice(0, 4), [2, 1, null, 3]);
  assert.ok(sheet.back.every((slot) => slot.entry === (slot.position ? same : null)));
});

test('modo ficha por página y colección vacía en dúplex', () => {
  const cards = entries(['A', 'A', 'A']);
  assert.equal(buildDuplexSheets(cards, 'short', 'card').length, 3);
  assert.deepEqual(buildDuplexSheets([], 'long'), []);
});

test('detecta desbordes de contenido en una cara', () => {
  assert.equal(isCardOverflowing({ scrollWidth: 374, clientWidth: 374, scrollHeight: 215, clientHeight: 215 }), false);
  assert.equal(isCardOverflowing({ scrollWidth: 374, clientWidth: 374, scrollHeight: 230, clientHeight: 215 }), true);
  assert.equal(isCardOverflowing({ scrollWidth: 390, clientWidth: 374, scrollHeight: 215, clientHeight: 215 }), true);
});

test('el dúplex no separa grupos: rellena las diez posiciones y los reversos siguen a su ficha', () => {
  const cards = entries([...Array(7).fill('Grupo 1'), ...Array(8).fill('Grupo 2')]);
  const sheets = buildDuplexSheets(cards, 'long');

  assert.deepEqual(sheets.map((sheet) => sheet.front.filter((slot) => slot.entry).length), [10, 5]);
  assert.deepEqual(sheets[0].front.map((slot) => slot.entry?.item.groupName).slice(5, 9), ['Grupo 1', 'Grupo 1', 'Grupo 2', 'Grupo 2']);
  sheets.forEach((sheet) => sheet.front.forEach((front, slot) => {
    if (front.entry) assert.equal(sheet.back[mirrorSlotIndex(slot, 2, 5, 'long')].entry, front.entry);
  }));
});
