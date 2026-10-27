export function paginateCompactEntries<T extends { item: { groupName?: string } }>(
  entries: T[],
  maxCardsPerPage?: number,
): T[][];
