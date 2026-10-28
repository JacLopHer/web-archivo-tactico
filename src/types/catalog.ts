import type { TroopClass } from '../domain/troopClasses.mjs';

export type VerificationStatus = 'unverified' | 'verified' | 'incomplete';

export interface TroopStats {
  movement: string;
  cc: string;
  bs: string;
  physical: string;
  willpower: string;
  armor: string;
  bts: string;
  wounds: string;
  silhouette: string;
  availability: string;
}

export interface TroopProfile {
  id: string;
  name: string;
  variantName: string;
  unitId: string;
  unitName: string;
  troopType: string;
  troopClass: TroopClass;
  troopClassSource: string;
  troopClassVerificationStatus: 'verified' | 'incomplete';
  stats: TroopStats;
  woundsLabel: string;
  sharedSpecialRules: string[];
  additionalSpecialRules: string[];
  skillsAndEquipment: string;
  rangedEquipment: string;
  meleeEquipment: string;
  cap: string;
  points: string;
  factionId: string;
  sectorialIds: string[];
  edition: string;
  source: string;
  verificationStatus: VerificationStatus;
}

export interface TroopVariant {
  id: string;
  name: string;
  armyName: string;
  specialRules: string[];
  rangedEquipment: string;
  meleeEquipment: string;
  cap: string;
  points: string;
  sectorialIds?: string[];
  infinityArmyOptionId?: number;
  orders?: string[];
}

export interface TroopUnit {
  id: string;
  name: string;
  troopType: string;
  troopClass: TroopClass;
  troopClassSource: string;
  troopClassVerificationStatus: 'verified' | 'incomplete';
  stats: TroopStats;
  woundsLabel: string;
  sharedSpecialRules: string[];
  factionId: string;
  sectorialIds: string[];
  edition: string;
  source: string;
  verificationStatus: VerificationStatus;
  profiles: TroopVariant[];
  infinityArmyId?: number;
  officialName?: string;
  requestedName?: string;
  characteristics?: string[];
  availabilityBySectorial?: Record<string, string>;
  characteristicsBySectorial?: Record<string, string[]>;
}

export interface Sectorial {
  id: string;
  name: string;
  factionId?: string;
  rosterImage?: string;
  unitIds: string[];
  source: string;
  verificationStatus: 'unmapped' | 'unit-level' | 'mapped';
}

export interface Faction {
  id: string;
  name: string;
  shortName: string;
}

export interface FactionDirectory {
  schemaVersion: number;
  metadata: {
    source: string;
    sourceUrl: string;
    checkedAt: string;
    verificationStatus: VerificationStatus;
    note: string;
  };
  factions: Array<Faction & {
    armyName: string;
    catalogStatus: 'metadata-only' | 'partial';
    iconStatus: 'awaiting-authorized-asset';
    sectorials: Array<{
      id: string;
      name: string;
      kind: 'generic' | 'sectorial';
    }>;
  }>;
}

export interface WeaponProfile {
  id: string;
  name: string;
  aliases?: string[];
  rangeModifiers: string;
  rangeNote?: string;
  damage: string;
  burst: string;
  ammunition: string;
  saveAttribute: string;
  saves: string;
  properties: string;
  source: string;
  verificationStatus: VerificationStatus;
}

export interface WeaponProfilesCatalog {
  schemaVersion: number;
  metadata: {
    edition: string;
    source: string;
    verificationStatus: VerificationStatus;
    note: string;
  };
  profiles: WeaponProfile[];
}

export interface ExtraFactionsCatalog {
  schemaVersion: number;
  factions: Faction[];
  metadata: {
    edition: string;
    source: string;
    sourceUrl: string;
    checkedAt: string;
    verificationStatus: VerificationStatus;
    editionNote: string;
    note: string;
  };
  sectorials: Sectorial[];
  troopClassGroups: Array<{ troopClass: TroopClass; unitIds: string[] }>;
  units: TroopUnit[];
}

export interface JsaCatalog {
  schemaVersion: number;
  faction: Faction;
  metadata: {
    edition: string;
    source: string;
    verificationStatus: VerificationStatus;
    note: string;
  };
  sectorials: Sectorial[];
  troopClassGroups: Array<{ troopClass: TroopClass; unitIds: string[] }>;
  units: TroopUnit[];
  references: Array<{
    id: string;
    title: string;
    headers: string[];
    rows: string[][];
    note?: string;
  }>;
}
