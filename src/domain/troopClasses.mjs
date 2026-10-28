export const troopClasses = [
  'Light Infantry',
  'Medium Infantry',
  'Heavy Infantry',
  'Skirmishers',
  'Warbands',
  'Remotes',
  'TAGs',
  'Discontinued',
  'No Profile',
  'unclassified',
];

export const troopClassLabels = {
  'Light Infantry': 'IL — Infantería Ligera',
  'Medium Infantry': 'IM — Infantería Media',
  'Heavy Infantry': 'IP — Infantería Pesada',
  Skirmishers: 'BAT — Batidor',
  Warbands: 'WB — Warband',
  Remotes: 'REM — Remoto',
  TAGs: 'TAG — Tactical Armored Gear',
  Discontinued: 'Descatalogada',
  'No Profile': 'Sin perfil',
  unclassified: 'Sin clasificar',
};

export const troopClassShortLabels = {
  'Light Infantry': 'IL',
  'Medium Infantry': 'IM',
  'Heavy Infantry': 'IP',
  Skirmishers: 'BAT',
  Warbands: 'WB',
  Remotes: 'REM',
  TAGs: 'TAG',
  Discontinued: 'Descatalogada',
  'No Profile': 'Sin perfil',
  unclassified: 'Sin clasificar',
};

export const troopClassSource =
  'Japanese Secessionist Army Units, Human Sphere: https://www.human-sphere.com/Japanese_Secessionist_Army';

const tableEntries = [
  { name: 'Aragoto', troopClass: 'Light Infantry', catalogUnits: ['ARAGOTO'] },
  { name: 'Kaizoku Spec-Ops', troopClass: 'Light Infantry', catalogUnits: ['KAIZOKU'] },
  { name: 'Keisotsu Butai', troopClass: 'Light Infantry', catalogUnits: ['KEISOTSU'] },
  { name: 'Kempeitai', troopClass: 'Light Infantry', catalogUnits: ['KEMPEI'] },
  { name: 'Kuroshi Rider', troopClass: 'Light Infantry', catalogUnits: ['KUROSHI RIDER'] },
  {
    name: 'Aragoto Senkenbutai Riku-Gun-Shoi',
    troopClass: 'Light Infantry',
    catalogUnits: ['ARAGOTO'],
  },
  { name: 'Kyoshō Saibāyunitto', troopClass: 'Light Infantry', catalogUnits: ['KYOSHŌ'] },
  { name: 'Metsuke Officer', troopClass: 'Light Infantry', catalogUnits: ['METSUKE'] },
  { name: 'Senku Troop', troopClass: 'Light Infantry', catalogUnits: ['SENKU'] },
  { name: 'Taguraida', troopClass: 'Light Infantry', catalogUnits: [] },
  {
    name: 'JSA TAG Support Pilots',
    troopClass: 'Light Infantry',
    catalogUnits: ['PILOTO MECHAZOID', 'PILOTO O-YOROI'],
  },
  {
    name: 'Tokusetsu Butai',
    troopClass: 'Light Infantry',
    catalogUnits: ['TOKUSETSU EISEI', 'TOKUSETSU KOHEI'],
  },
  { name: 'Yuriko Oda', troopClass: 'Light Infantry', catalogUnits: ['YURIKO ODA'] },
  { name: 'Genbutai', troopClass: 'Medium Infantry', catalogUnits: ['GENBU'] },
  { name: 'Jizamurai Hanryodan', troopClass: 'Medium Infantry', catalogUnits: ['JIZAMURAI'] },
  { name: 'Raiden', troopClass: 'Medium Infantry', catalogUnits: ['RAIDEN'] },
  { name: 'Ryuken Unit-9', troopClass: 'Medium Infantry', catalogUnits: ['RYŪKEN'] },
  { name: 'S.T.R.S. Tanuki Team', troopClass: 'Medium Infantry', catalogUnits: ['TANUKI'] },
  { name: 'Shurayuki', troopClass: 'Medium Infantry', catalogUnits: ['SHURAYUKI'] },
  { name: 'Sōhei Tsugekitai', troopClass: 'Medium Infantry', catalogUnits: ['SŌHEI'] },
  { name: 'Teishin Guntai', troopClass: 'Medium Infantry', catalogUnits: ['TEISHIN'] },
  { name: 'Daiyōkai Dengekitai', troopClass: 'Heavy Infantry', catalogUnits: ['DAIYŌKAI'] },
  { name: 'Domaru Butai', troopClass: 'Heavy Infantry', catalogUnits: ['DOMARU'] },
  { name: 'Hatamoto Imperial Guard', troopClass: 'Heavy Infantry', catalogUnits: ['HATAMOTO'] },
  { name: 'Karakuri', troopClass: 'Heavy Infantry', catalogUnits: ['KARAKURI'] },
  { name: 'Takeshi "Neko" Oyama', troopClass: 'Heavy Infantry', catalogUnits: ['OYAMA'] },
  { name: 'Shikami', troopClass: 'Heavy Infantry', catalogUnits: ['SHIKAMI'] },
  { name: 'Shizoku Kogeki-Tai', troopClass: 'Heavy Infantry', catalogUnits: ['SHIZOKU FTO'] },
  { name: 'Tankō Zensenbutai', troopClass: 'Heavy Infantry', catalogUnits: ['TANKŌ'] },
  { name: 'Kurayami Ninjas', troopClass: 'Skirmishers', catalogUnits: ['NINJA KURAYAMI'] },
  { name: 'Kyojin', troopClass: 'Skirmishers', catalogUnits: ['KYOJIN KILLER'] },
  { name: 'Ninja', troopClass: 'Skirmishers', catalogUnits: ['NINJA'] },
  { name: 'Nokizaru', troopClass: 'Skirmishers', catalogUnits: ['NOKIZARU'] },
  { name: 'Oniwaban', troopClass: 'Skirmishers', catalogUnits: ['ONIWA BAN'] },
  { name: 'Saito Togan', troopClass: 'Skirmishers', catalogUnits: ['SAITO TŌGAN'] },
  { name: 'Shinobu Kitsune', troopClass: 'Skirmishers', catalogUnits: ['SHINOBU'] },
  { name: 'Miyamoto Mushashi', troopClass: 'Warbands', catalogUnits: ['MIYAMOTO MUSHASHI'] },
  { name: 'Yamabushi', troopClass: 'Warbands', catalogUnits: ['YAMABUSHI'] },
  { name: 'Yojimbo', troopClass: 'Warbands', catalogUnits: ['YOJIMBO', 'YOJIMBO MOTORIZADO'] },
  {
    name: 'Aibōt (Atom, Garon, Robio y Uran)',
    troopClass: 'Remotes',
    catalogUnits: [
      'ATOMU SPECBOT_1',
      'ATOMU SPECBOT_2',
      'ATOM AIBŌT',
      'GARON AIBŌT',
      'ROBIO AIBŌT',
      'URAN AIBŌT',
    ],
  },
  { name: 'Yáokòng (Wèibīng y Hùsòng)', troopClass: 'Remotes', catalogUnits: [] },
  { name: 'Yáopú Pangguling', troopClass: 'Remotes', catalogUnits: ['PANGGULING'] },
  { name: 'Yáoxiè (Rui Shi y Lù Duān)', troopClass: 'Remotes', catalogUnits: ['RUI SHI', 'LÙ DUĀN'] },
  { name: 'Yáozāo', troopClass: 'Remotes', catalogUnits: ['YÁOZǍO'] },
  { name: 'Mechazoid Sokorentai', troopClass: 'TAGs', catalogUnits: ['MECHAZOID'] },
  { name: 'O-Yoroi', troopClass: 'TAGs', catalogUnits: ['O-YOROI'] },
  { name: 'Asuka Kisaragi', troopClass: 'Discontinued', catalogUnits: [] },
  { name: 'Haramaki', troopClass: 'Discontinued', catalogUnits: [] },
  // Raiden figura también como descatalogada (ediciones anteriores); su perfil N5 vigente es Infantería Media.
  { name: 'Raiden', troopClass: 'Discontinued', catalogUnits: [] },
  { name: 'Kuge Delegate', troopClass: 'No Profile', catalogUnits: [] },
  {
    name: 'Ioann Bann',
    troopClass: 'Warbands',
    catalogUnits: ['IOANN BANN'],
    source: 'Confirmación expresa del propietario, 2026-10-28',
  },
  ...[
    ['Warcor', 'Light Infantry', 'WARCOR', 'Warcor'],
    ['Monstrucker', 'Light Infantry', 'MONSTRUCKER', 'Monstrucker'],
    ['Aïda Swanson', 'Light Infantry', 'AÏDA SWANSON', 'Aida_Swanson'],
    ['Sāchā', 'Light Infantry', 'SĀCHĀ', 'S%C4%81ch%C4%81'],
    ['Yuan Yuan', 'Warbands', 'YUAN YUAN', 'Yuan_Yuan'],
    ['Samsa', 'Medium Infantry', 'SAMSA', 'Samsa'],
    ['Raiden (perfil N5)', 'Medium Infantry', 'RAIDEN', 'Raiden'],
    ['Triphammer', 'TAGs', 'TRIPHAMMER', 'Triphammer'],
    ['Turtlemek (remoto en el perfil de Triphammer)', 'Remotes', 'TURTLEMEK', 'Triphammer'],
  ].map(([name, troopClass, unit, page]) => ({
    name,
    troopClass,
    catalogUnits: [unit],
    source: `Página individual de Human Sphere: https://www.human-sphere.com/${page}`,
  })),
];

export function assertValidTroopClass(unitName, value) {
  if (!troopClasses.includes(value)) {
    throw new Error(
      `La unidad "${unitName}" tiene una clase de tropa inválida (${JSON.stringify(value)}). ` +
      `Valores permitidos: ${troopClasses.join(', ')}.`,
    );
  }
}

export function getTroopClassLabel(value) {
  assertValidTroopClass('desconocida', value);
  return troopClassLabels[value];
}

export function getTroopClassShortLabel(value) {
  assertValidTroopClass('desconocida', value);
  return troopClassShortLabels[value];
}

export function buildTroopClassAssignments(catalogUnitNames) {
  const knownNames = new Set(catalogUnitNames);
  const classesByUnit = new Map(catalogUnitNames.map((name) => [name, new Set()]));
  const sourcesByUnit = new Map(catalogUnitNames.map((name) => [name, new Set()]));
  const unmatchedTableEntries = [];

  for (const entry of tableEntries) {
    const matchedUnits = entry.catalogUnits.filter((name) => knownNames.has(name));
    if (!matchedUnits.length) unmatchedTableEntries.push(entry.name);
    for (const unitName of matchedUnits) {
      classesByUnit.get(unitName).add(entry.troopClass);
      sourcesByUnit.get(unitName).add(entry.source ?? troopClassSource);
    }
  }

  const assignments = new Map();
  const ambiguousUnits = [];
  for (const [unitName, classes] of classesByUnit) {
    const tableClasses = [...classes];
    if (tableClasses.length > 1) ambiguousUnits.push({ unitName, tableClasses });
    const troopClass = tableClasses.length === 1 ? tableClasses[0] : 'unclassified';
    const sources = [...sourcesByUnit.get(unitName)];
    assertValidTroopClass(unitName, troopClass);
    assignments.set(unitName, {
      troopClass,
      source: sources.length ? sources.join(' · ') : troopClassSource,
      verificationStatus: tableClasses.length === 1 ? 'verified' : 'incomplete',
    });
  }

  return {
    assignments,
    unmatchedTableEntries,
    ambiguousUnits,
    unclassifiedUnits: [...assignments]
      .filter(([, assignment]) => assignment.troopClass === 'unclassified')
      .map(([unitName]) => unitName),
  };
}
