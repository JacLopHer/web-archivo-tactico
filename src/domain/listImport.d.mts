import type { TroopProfile } from '../types/catalog';

export interface ImportedProfileLine {
  originalName: string;
  lineNumber: number;
  candidateIds: string[];
  profileId: string;
}

export function normalizeProfileName(value: string): string;
export function parseProfileList(text: string, profiles: TroopProfile[]): ImportedProfileLine[];
