export type TroopClass =
  | 'Light Infantry'
  | 'Medium Infantry'
  | 'Heavy Infantry'
  | 'Skirmishers'
  | 'Warbands'
  | 'Remotes'
  | 'TAGs'
  | 'Discontinued'
  | 'No Profile'
  | 'unclassified';

export type TroopClassAssignment = {
  troopClass: TroopClass;
  source: string;
  verificationStatus: 'verified' | 'incomplete';
};

export const troopClasses: readonly TroopClass[];
export const troopClassLabels: Record<TroopClass, string>;
export const troopClassSource: string;
export function assertValidTroopClass(unitName: string, value: unknown): asserts value is TroopClass;
export function getTroopClassLabel(value: TroopClass): string;
export const troopClassShortLabels: Record<TroopClass, string>;
export function getTroopClassShortLabel(value: TroopClass): string;
export function buildTroopClassAssignments(catalogUnitNames: string[]): {
  assignments: Map<string, TroopClassAssignment>;
  unmatchedTableEntries: string[];
  ambiguousUnits: Array<{ unitName: string; tableClasses: TroopClass[] }>;
  unclassifiedUnits: string[];
};
