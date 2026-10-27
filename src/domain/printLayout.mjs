export function paginateCompactEntries(entries, maxCardsPerPage = 10) {
  if (!Number.isSafeInteger(maxCardsPerPage) || maxCardsPerPage < 1) {
    throw new RangeError('El máximo de fichas por página debe ser un entero positivo.');
  }

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
