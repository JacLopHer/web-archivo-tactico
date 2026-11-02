export interface ParsedOrder {
  type: 'REGULAR' | 'IRREGULAR' | 'IMPETUOUS' | 'LIEUTENANT' | 'TACTICAL';
  count: number;
  short: string;
  label: string;
}
export interface CardProfileInfo {
  orders?: string[];
  characteristics?: string[];
  sharedSpecialRules?: string[];
  additionalSpecialRules?: string[];
}
export function parseOrders(orders?: string[]): ParsedOrder[];
export function isHackable(characteristics?: string[]): boolean;
export function getUnitCardTags(profile: CardProfileInfo): { orders: ParsedOrder[]; hackable: boolean };
export function getCardRules(profile: CardProfileInfo): string;
