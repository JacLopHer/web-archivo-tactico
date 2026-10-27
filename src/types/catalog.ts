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
}

export interface TroopUnit {
  id: string;
  name: string;
  troopType: string;
  stats: TroopStats;
  woundsLabel: string;
  sharedSpecialRules: string[];
  factionId: string;
  sectorialIds: string[];
  edition: string;
  source: string;
  verificationStatus: VerificationStatus;
  profiles: TroopVariant[];
}

export interface Sectorial {
  id: string;
  name: string;
  rosterImage: string;
  profileIds: string[];
  verificationStatus: 'unmapped' | 'mapped';
}

export interface Faction {
  id: string;
  name: string;
  shortName: string;
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
  units: TroopUnit[];
  references: Array<{
    id: string;
    title: string;
    headers: string[];
    rows: string[][];
    note?: string;
  }>;
}
