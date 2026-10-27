import type { TroopProfile, WeaponProfile } from '../types/catalog';

export function splitEquipmentNames(equipment: string): string[];
export function createWeaponIndex(weapons: WeaponProfile[]): Map<string, WeaponProfile>;
export function getRangeModifiers(weapon: WeaponProfile): string[];
export function getRangeModifierLabel(value: string): string;
export function getProfileWeapons(
  profile: TroopProfile,
  index: Map<string, WeaponProfile>,
): Array<{ name: string; category: string; profile: WeaponProfile | undefined }>;
