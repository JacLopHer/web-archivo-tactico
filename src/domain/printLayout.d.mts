export type PrintLayoutName = 'compact' | 'detailed' | 'duplex';
export type DuplexFlipEdge = 'long' | 'short';
export interface DuplexSlot<T> { slot: number; sheet: number; position: number | null; entry: T | null }
export interface DuplexSheet<T> { sheet: number; front: DuplexSlot<T>[]; back: DuplexSlot<T>[] }
export const DUPLEX_FLIP_EDGES: DuplexFlipEdge[];
export function mirrorSlotIndex(index: number, cols: number, rows: number, flipEdge: DuplexFlipEdge): number;
export function buildDuplexSheets<T extends { item: { groupName?: string } }>(
  entries: T[],
  flipEdge?: DuplexFlipEdge,
  mode?: PageBreakMode,
  layout?: PrintGrid,
): DuplexSheet<T>[];
export function isCardOverflowing(metrics: { scrollWidth: number; clientWidth: number; scrollHeight: number; clientHeight: number }): boolean;
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
