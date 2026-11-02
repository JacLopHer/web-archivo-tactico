const equipmentOnlyIds = new Set([144]);
const verifiedProfileNamesByInfinityArmyId = new Map([
  [73, { profileName: 'Sepsitor' }],
  [114, { profileName: 'Sepsitor Plus' }],
  [154, { profileName: 'Pitcher' }],
  [174, { profileName: 'Cibermina' }],
  [176, { profileName: 'Dispersador de Minas' }],
  [209, {
    profileName: 'Torreta Artillada (F. Combi)',
    wikiSource: 'Infinity Wiki, Armed Turret and Weapon Chart (Rifles): https://infinitythewiki.com/Armed_Turret and https://infinitythewiki.com/Weapon_Chart#RIFLES',
  }],
  [215, {
    profileName: 'Fusil de Precisión',
    wikiSource: 'Infinity Wiki, Armed Turret and Weapon Chart (Marksman Rifles): https://infinitythewiki.com/Armed_Turret and https://infinitythewiki.com/Weapon_Chart#MARKSMAN_RIFLES',
  }],
  [219, {
    profileName: 'Torreta Artillada (Fusil AP)',
    wikiSource: 'Infinity Wiki, Armed Turret and Weapon Chart (Rifles): https://infinitythewiki.com/Armed_Turret and https://infinitythewiki.com/Weapon_Chart#RIFLES',
  }],
  [222, {
    profileName: 'Fusil',
    wikiSource: 'Infinity Wiki, Armed Turret and Weapon Chart (Rifles): https://infinitythewiki.com/Armed_Turret and https://infinitythewiki.com/Weapon_Chart#RIFLES',
  }],
  [228, {
    profileName: 'E/Mitter',
    wikiSource: 'Infinity Wiki, Armed Turret and Weapon Chart (Uncategorized): https://infinitythewiki.com/Armed_Turret and https://infinitythewiki.com/Weapon_Chart#UNCATEGORIZED',
  }],
]);

const profileFields = [
  'rangeNote',
  'rangeModifiers',
  'damage',
  'burst',
  'ammunition',
  'saveAttribute',
  'saves',
  'properties',
];

export function supplementVerifiedWeapons(catalog, verifiedProfiles) {
  const profilesByName = new Map(verifiedProfiles
    .filter((profile) => profile.verificationStatus === 'verified')
    .map((profile) => [profile.name, profile]));
  const supplements = new Map([...verifiedProfileNamesByInfinityArmyId].map(([id, supplement]) => {
    const profile = profilesByName.get(supplement.profileName);
    if (!profile) throw new Error(`Falta el perfil verificado «${supplement.profileName}» para el arma Infinity Army ${id}`);
    return [id, { ...profile, source: [profile.source, supplement.wikiSource].filter(Boolean).join('; ') }];
  }));
  const discoBaller = {
    name: 'Disco Baller',
    rangeModifiers: '',
    rangeNote: 'Weapon Chart: 0, +3, -3, -6, --, --, --, --.',
    damage: '1',
    burst: '--',
    ammunition: '--',
    saveAttribute: '--',
    saves: '--',
    properties: 'Ataque Especulativo, Desechable (2), Doble Disparo, Sin Objetivo, [*]',
    source: 'Infinity Wiki, Weapon Chart (Uncategorized), perfil Disco Baller; Disco Baller: https://infinitythewiki.com/Weapon_Chart#UNCATEGORIZED and https://infinitythewiki.com/Disco_Baller',
    verificationStatus: 'verified',
  };
  supplements.set(208, discoBaller);
  const retainedWeapons = catalog.weapons.filter((weapon) => !equipmentOnlyIds.has(weapon.infinityArmyWeaponId));
  catalog.weapons.splice(0, catalog.weapons.length, ...retainedWeapons);
  const weaponsById = new Map(catalog.weapons.map((weapon) => [weapon.infinityArmyWeaponId, weapon]));

  for (const weapon of catalog.weapons) {
    const profile = supplements.get(weapon.infinityArmyWeaponId);
    if (!profile) continue;

    const missingMetadata = weapon.verificationNote?.includes('no proporcionan su ficha');
    const missingAmmunition = /id de munición 0/.test(weapon.verificationNote ?? '');
    const wikiProfile = weapon.infinityArmyWeaponId === 208;
    const wikiSupplement = Boolean(verifiedProfileNamesByInfinityArmyId.get(weapon.infinityArmyWeaponId)?.wikiSource);
    if (!missingMetadata && !missingAmmunition && !wikiProfile && !wikiSupplement) continue;
    const isTurret = weapon.name.startsWith('Torreta Artillada (');
    const hasProfileNameSuffix = weapon.name.startsWith(`${profile.name} (`);
    if (weapon.name !== profile.name && !isTurret && !hasProfileNameSuffix && !weapon.name.startsWith('Arma Infinity Army ')) {
      throw new Error(`El arma Infinity Army ${weapon.infinityArmyWeaponId} no coincide con el perfil verificado «${profile.name}»: «${weapon.name}»`);
    }

    if (!isTurret && !hasProfileNameSuffix) weapon.name = profile.name;
    if (missingMetadata || wikiProfile || wikiSupplement) {
      for (const field of profileFields) weapon[field] = profile[field];
      if (profile.rangeNote === undefined) delete weapon.rangeNote;
      else weapon.rangeNote = profile.rangeNote;
    } else {
      weapon.ammunition = profile.ammunition;
    }
    const sourceBase = weapon.source.split('; datos complementados con ficha verificada: ')[0];
    weapon.source = `${sourceBase}; datos complementados con ficha verificada: ${profile.source}`;
    weapon.verificationStatus = 'verified';
    delete weapon.verificationNote;
  }

  for (const unit of catalog.units) {
    for (const profile of unit.profiles) {
      const emptyWeaponEntries = Number(
        profile.verificationNote?.match(/(\d+) entrada\(s\) de arma de Infinity Army no contienen ID y no pueden identificarse\./)?.[1] ?? 0,
      );
      const unresolvedMetadataIds = [...(profile.verificationNote ?? '').matchAll(
        /Faltan los metadatos de Infinity Army para el arma (\d+)\./g,
      )].map((match) => Number(match[1]))
        .filter((id) => !weaponsById.has(id) && !equipmentOnlyIds.has(id));
      const unresolvedWeapons = [...new Set(profile.infinityArmyWeaponIds ?? [])]
        .map((id) => weaponsById.get(id))
        .filter((weapon) => weapon?.verificationStatus === 'incomplete');
      const notes = [
        emptyWeaponEntries
          ? `${emptyWeaponEntries} entrada(s) de arma de Infinity Army no contienen ID y no pueden identificarse.`
          : '',
        ...unresolvedMetadataIds.map((id) => `Faltan los metadatos de Infinity Army para el arma ${id}.`),
        ...unresolvedWeapons.map((weapon) => weapon.verificationNote).filter(Boolean),
      ].filter(Boolean);

      profile.verificationStatus = notes.length ? 'incomplete' : 'verified';
      if (notes.length) profile.verificationNote = [...new Set(notes)].join(' ');
      else delete profile.verificationNote;
    }
    unit.weaponProfilesVerificationStatus = unit.profiles.some((profile) =>
      profile.verificationStatus === 'incomplete') ? 'incomplete' : 'verified';
  }
}
