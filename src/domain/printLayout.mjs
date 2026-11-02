export const A4_MM = { width: 210, height: 297 };

// Cuadrícula de fichas por hoja A4 vertical: compacta 2×5 (10 por hoja) y detallada 1×3 (3 por hoja).
export const PRINT_LAYOUTS = {
  compact: { cols: 2, rows: 5, marginMm: 6, gapMm: 0 },
  detailed: { cols: 1, rows: 3, marginMm: 10, gapMm: 0 },
  // Tarjetas a doble cara: 10 posiciones por cara, anverso (unidad) y reverso (armas).
  duplex: { cols: 2, rows: 5, marginMm: 6, gapMm: 0 },
};

export const DUPLEX_FLIP_EDGES = ['long', 'short'];

// Posición (fila mayor) del reverso que queda justo detrás de la posición `index` del anverso.
// Borde largo: se voltea sobre el eje vertical y se invierten las columnas.
// Borde corto: se voltea sobre el eje horizontal y se invierten las filas.
export function mirrorSlotIndex(index, cols, rows, flipEdge) {
  if (!DUPLEX_FLIP_EDGES.includes(flipEdge)) throw new RangeError('Borde de volteo no válido.');
  if (!Number.isInteger(index) || index < 0 || index >= cols * rows) throw new RangeError('Posición fuera de la hoja.');
  const row = Math.floor(index / cols);
  const col = index % cols;
  return flipEdge === 'long' ? row * cols + (cols - 1 - col) : (rows - 1 - row) * cols + col;
}

// Cada hoja produce una página de anversos y otra de reversos, siempre consecutivas (para dúplex).
// Cada posición conserva la entrada completa, de modo que el reverso nunca depende de su índice en la lista.
export function buildDuplexSheets(entries, flipEdge = 'long', mode = 'automatic', layout = PRINT_LAYOUTS.duplex) {
  const slotCount = layout.cols * layout.rows;
  // A diferencia de los otros formatos, los grupos distintos comparten hoja; solo «card» fuerza una ficha por hoja.
  const pages = mode === 'card'
    ? paginateEntries(entries, slotCount, mode)
    : Array.from({ length: Math.ceil(entries.length / slotCount) }, (_, i) => entries.slice(i * slotCount, (i + 1) * slotCount));
  return pages.map((page, sheetIndex) => {
    const front = Array.from({ length: slotCount }, (_, slot) => page[slot] ?? null);
    const sheet = sheetIndex + 1;
    const frontSlots = front.map((entry, slot) => ({ slot, sheet, position: entry ? slot + 1 : null, entry }));
    const backSlots = Array.from({ length: slotCount }, (_, slot) => ({ slot, sheet, position: null, entry: null }));
    frontSlots.forEach((frontSlot) => {
      if (!frontSlot.entry) return;
      const target = mirrorSlotIndex(frontSlot.slot, layout.cols, layout.rows, flipEdge);
      backSlots[target] = { slot: target, sheet, position: frontSlot.position, entry: frontSlot.entry };
    });
    return { sheet, front: frontSlots, back: backSlots };
  });
}

// Se considera desborde cualquier contenido más grande que su recuadro (tolerancia de medio píxel).
export function isCardOverflowing({ scrollWidth, clientWidth, scrollHeight, clientHeight }) {
  return scrollWidth > clientWidth + 0.5 || scrollHeight > clientHeight + 0.5;
}

export function getCellSizeMm(layout) {
  const { cols, rows, marginMm, gapMm } = layout;
  return {
    width: (A4_MM.width - 2 * marginMm - (cols - 1) * gapMm) / cols,
    height: (A4_MM.height - 2 * marginMm - (rows - 1) * gapMm) / rows,
  };
}

// «automatic» y «group» nunca mezclan grupos en una hoja; «card» pone una ficha por hoja.
export function paginateEntries(entries, maxCardsPerPage = 10, mode = 'automatic') {
  if (!Number.isSafeInteger(maxCardsPerPage) || maxCardsPerPage < 1) {
    throw new RangeError('El máximo de fichas por página debe ser un entero positivo.');
  }
  if (mode === 'card') return entries.map((entry) => [entry]);

  const pages = [];
  let currentGroup = Symbol('no-group');
  let currentPage = [];

  const finishPage = () => {
    if (currentPage.length) pages.push(currentPage);
    currentPage = [];
  };

  for (const entry of entries) {
    const group = entry.item.groupName ?? '';
    if (currentPage.length && group !== currentGroup) finishPage();
    currentGroup = group;

    if (currentPage.length === maxCardsPerPage) finishPage();
    currentPage.push(entry);
  }

  finishPage();
  return pages;
}

export function paginateCompactEntries(entries, maxCardsPerPage = 10) {
  return paginateEntries(entries, maxCardsPerPage, 'automatic');
}
