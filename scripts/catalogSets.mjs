// Conjuntos de ejércitos que genera scripts/buildCatalog.mjs. Los IDs de ejército (roster) proceden
// de infinity/es/metadata; el sectorial se identifica por el slug de su logotipo, que usa el importador.
// `sectorials` = [id de roster, ...]; el primero es la vainilla (genérico) de la facción.

export const factionDirectoryOrder = [
  'panoceania', 'yu-jing', 'ariadna', 'haqqislam', 'nomads', 'aleph', 'combined-army', 'tohaa', 'o-12', 'non-aligned',
];

export const catalogSets = {
  'nomads-aleph': {
    output: 'src/data/nomadsAlephCatalog.json',
    label: 'Nómadas y Aleph',
    factions: [
      {
        id: 'nomads', name: 'Nómadas', shortName: 'NOM',
        sectorials: [
          { armyId: 501, id: 'nomads-generic', name: 'Nomads' },
          { armyId: 502, id: 'nomads-corregidor', name: 'Corregidor Jurisdictional Command' },
          { armyId: 503, id: 'nomads-bakunin', name: 'Bakunin Jurisdictional Command' },
          { armyId: 504, id: 'nomads-tunguska', name: 'Tunguska Jurisdictional Command' },
        ],
      },
      {
        id: 'aleph', name: 'Aleph', shortName: 'ALEPH',
        sectorials: [
          { armyId: 701, id: 'aleph-generic', name: 'Aleph' },
          { armyId: 702, id: 'aleph-steel-phalanx', name: 'Steel Phalanx' },
          { armyId: 703, id: 'aleph-oss', name: 'Operations Subsection of the S.S.S. (OSS)' },
        ],
      },
    ],
  },
  panoceania: {
    output: 'src/data/armies/panoceania.json',
    label: 'PanOceanía',
    factions: [{ id: 'panoceania', name: 'PanOceanía', shortName: 'PAN', armyIds: [101, 102, 103, 104, 105, 106, 107] }],
  },
  'yu-jing': {
    output: 'src/data/armies/yu-jing.json',
    label: 'Yu Jing',
    factions: [{ id: 'yu-jing', name: 'Yu Jing', shortName: 'YJ', armyIds: [201, 202, 204, 205] }],
  },
  ariadna: {
    output: 'src/data/armies/ariadna.json',
    label: 'Ariadna',
    // Moblots: el roster de la FRRM lista una habilidad base distinta de la vainilla; se separa, no se mezcla.
    allowBaseSplits: ['ariadna:233:1'],
    factions: [{ id: 'ariadna', name: 'Ariadna', shortName: 'ARI', armyIds: [301, 302, 303, 304, 305, 306] }],
  },
  haqqislam: {
    output: 'src/data/armies/haqqislam.json',
    label: 'Haqqislam',
    // Shihab Remotes y Khawarijs: algunos sectoriales traen habilidades base distintas de la vainilla.
    allowBaseSplits: ['haqqislam:316:1', 'haqqislam:303:1'],
    factions: [{ id: 'haqqislam', name: 'Haqqislam', shortName: 'HAQ', armyIds: [401, 402, 403, 404] }],
  },
  'combined-army': {
    output: 'src/data/armies/combined-army.json',
    label: 'Ejército Combinado',
    factions: [{ id: 'combined-army', name: 'Ejército Combinado', shortName: 'CA', armyIds: [601, 602, 603, 604, 605] }],
  },
  tohaa: {
    output: 'src/data/armies/tohaa.json',
    label: 'Tohaa',
    factions: [{ id: 'tohaa', name: 'Tohaa', shortName: 'TOH', armyIds: [801] }],
  },
  'o-12': {
    output: 'src/data/armies/o-12.json',
    label: 'O-12',
    factions: [{ id: 'o-12', name: 'O-12', shortName: 'O-12', armyIds: [1001, 1002, 1003] }],
  },
  'non-aligned': {
    output: 'src/data/armies/non-aligned.json',
    label: 'Ejércitos No Alineados',
    factions: [{ id: 'non-aligned', name: 'Ejércitos No Alineados', shortName: 'NA2', armyIds: [901, 902, 904, 905, 908, 909] }],
  },
};
