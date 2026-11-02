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
  unitOfficialName?: string;
  unitRosterName?: string;
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
  verificationNote?: string;
  iconPath?: string;
  iconPathsBySectorial?: Record<string, string | undefined>;
  disabled?: boolean;
  characteristics?: string[];
  orders?: string[];
  availabilityBySectorial?: Record<string, string | undefined>;
  characteristicsBySectorial?: Record<string, string[] | undefined>;
  importNames?: string[];
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
  verificationStatus?: VerificationStatus;
  verificationNote?: string;
  disabled?: boolean;
  sectorialIds?: string[];
  infinityArmyOptionId?: number;
  infinityArmyWeaponIds?: number[];
  importNames?: string[];
  orders?: string[];
  iconPath?: string;
  iconPathsBySectorial?: Record<string, string | undefined>;
  iconSourcesBySectorial?: Record<string, string | undefined>;
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
  infinityArmyGroupId?: number;
  infinityArmyBaseVariant?: string;
  officialName?: string;
  requestedName?: string;
  rosterName?: string;
  iconPath?: string;
  iconSource?: string;
  iconPathsBySectorial?: Record<string, string | undefined>;
  iconSourcesBySectorial?: Record<string, string | undefined>;
  baseProfileVariants?: Array<{
    id: number;
    name: string;
    troopType: string;
    troopClass: TroopClass;
    stats: TroopStats;
    woundsLabel: string;
    specialRules: string[];
    characteristics: string[];
    weapons: string[];
    iconPath?: string;
    iconSource?: string;
    iconPathsBySectorial?: Record<string, string | undefined>;
    iconSourcesBySectorial?: Record<string, string | undefined>;
  }>;
  baseProfileMappingStatus?: 'verified' | 'incomplete';
  characteristics?: string[];
  availabilityBySectorial?: Record<string, string | undefined>;
  characteristicsBySectorial?: Record<string, string[] | undefined>;
  availabilityVerificationStatus?: 'verified' | 'incomplete';
  weaponProfilesVerificationStatus?: 'verified' | 'incomplete';
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
  logos: {
    metadataUrl: string;
    checkedAt: string;
    assets: Record<string, {
      path: string | null;
      officialUrl: string;
      sourceUrl: string | null;
      verificationStatus: 'verified' | 'missing';
    }>;
    factions: Record<string, string | null>;
    sectorials: Record<string, string | null>;
  };
  factions: Array<Faction & {
    armyName: string;
    catalogStatus: 'metadata-only' | 'partial' | 'complete';
    iconStatus: 'awaiting-authorized-asset' | 'verified';
    sectorials: Array<{
      id: string;
      name: string;
      kind: 'generic' | 'sectorial';
    }>;
  }>;
}

export interface WeaponProfile {
  id: string;
  infinityArmyWeaponId?: number;
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
  verificationNote?: string;
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
    editionSourceUrl: string;
    iconSource?: string;
    apiVersions: Record<string, string>;
    baseProfileSplits?: string[];
    note: string;
  };
  sectorials: Sectorial[];
  troopClassGroups: Array<{ troopClass: TroopClass; unitIds: string[] }>;
  units: TroopUnit[];
  weapons?: WeaponProfile[];
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
