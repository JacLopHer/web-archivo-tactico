export const A4_MM = { width: 210, height: 297 };

// Cuadrícula de fichas por hoja A4 vertical: compacta 2×5 (10 por hoja) y detallada 1×3 (3 por hoja).
export const PRINT_LAYOUTS = {
  compact: { cols: 2, rows: 5, marginMm: 6, gapMm: 0 },
  detailed: { cols: 1, rows: 3, marginMm: 10, gapMm: 0 },
};

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
