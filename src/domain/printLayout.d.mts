export type PrintLayoutName = 'compact' | 'detailed';
export type PageBreakMode = 'automatic' | 'group' | 'card';
export interface PrintGrid { cols: number; rows: number; marginMm: number; gapMm: number }

export const A4_MM: { width: number; height: number };
export const PRINT_LAYOUTS: Record<PrintLayoutName, PrintGrid>;
export function getCellSizeMm(layout: PrintGrid): { width: number; height: number };

export function paginateEntries<T extends { item: { groupName?: string } }>(
  entries: T[],
  maxCardsPerPage?: number,
  mode?: PageBreakMode,
): T[][];

export function paginateCompactEntries<T extends { item: { groupName?: string } }>(
  entries: T[],
  maxCardsPerPage?: number,
): T[][];
