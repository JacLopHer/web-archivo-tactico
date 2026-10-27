import type { TroopProfile } from '../types/catalog';

export interface ImportedProfileLine {
  originalName: string;
  lineNumber: number;
  candidateIds: string[];
  profileId: string;
  groupName?: string;
  sourceLine?: string;
  rangedEquipment?: string;
  meleeEquipment?: string;
  cap?: string;
  points?: string;
  resolution?: 'exact' | 'details' | 'ambiguous' | 'unmatched';
}

export interface ParsedListImport {
  format: 'infinity-army' | 'profile-list';
  entries: ImportedProfileLine[];
}

export function normalizeProfileName(value: string): string;
export function parseProfileList(text: string, profiles: TroopProfile[]): ImportedProfileLine[];
export function parseInfinityArmyList(text: string, profiles: TroopProfile[]): ImportedProfileLine[];
export function parseListImport(text: string, profiles: TroopProfile[]): ParsedListImport;
