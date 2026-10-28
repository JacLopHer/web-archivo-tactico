export const sectorialAvailabilitySource =
  'Unit I.D. Assistant N5 v4 (ITS 18, oct. 2026): imágenes de roster de Vanilla, Oban y Shindenbutai en «1 N5 Versions (v4)/11_JSA». Contrastado con las categorías de Human Sphere; ante discrepancia prevalece la imagen. Los Spec-Ops (Kaizoku y Atomu), ausentes de las imágenes, y los mercenarios (Aïda Swanson, Samsa, Miyamoto Mushashi y Yojimbo) proceden de Infinity Army, donde figuran en los tres ejércitos.';

export const sectorialRosters = [
  { id: 'jsa-vanilla', image: 'Vanilla_JSA_v4.JPG' },
  { id: 'jsa-oban', image: 'JSA_Oban_v4.JPG' },
  { id: 'jsa-shindenbutai', image: 'JSA_Shindenbutai_v4.JPG' },
];

const V = 'jsa-vanilla';
const O = 'jsa-oban';
const S = 'jsa-shindenbutai';

// [nombre en el roster, unidades del catálogo, sectoriales que la incluyen]
const rosterEntries = [
  ['Keisotsu', ['KEISOTSU'], [V, O]],
  ['Senku', ['SENKU'], [V, S]],
  ['Kempeitai', ['KEMPEI'], [V, O]],
  ['Aragoto', ['ARAGOTO'], [V, O]],
  ['Kyoshō', ['KYOSHŌ'], [V, O]],
  ['Teishin', ['TEISHIN'], [V, S]],
  ['Metsuke', ['METSUKE'], [V, S]],
  ['Tokusetsu', ['TOKUSETSU EISEI', 'TOKUSETSU KOHEI'], [V, O, S]],
  ['Yuriko Oda', ['YURIKO ODA'], [V, O, S]],
  ['Kuroshi Rider', ['KUROSHI RIDER'], [O]],
  ['Warcors', ['WARCOR'], [V, O, S]],
  // Mercenarios: Infinity Army los lista en los tres ejércitos (las imágenes solo muestran algunos).
  ['Aïda Swanson', ['AÏDA SWANSON'], [V, O, S]],
  ['Monstruckers', ['MONSTRUCKER'], [S]],
  ['Sāchā', ['SĀCHĀ'], [S]],
  ['Tanuki', ['TANUKI'], [S]],
  ['Ryūken Unit-9', ['RYŪKEN'], [V, O]],
  ['Genbutai', ['GENBU'], [V, O]],
  ['Sōhei', ['SŌHEI'], [V]],
  ['Jizamurai', ['JIZAMURAI'], [V, S]],
  ['Raiden', ['RAIDEN'], [V, S]],
  ['Shurayuki', ['SHURAYUKI'], [V, S]],
  ['Samsa', ['SAMSA'], [V, O, S]],
  ['Domaru', ['DOMARU'], [V, O]],
  ['Tankō', ['TANKŌ'], [V, O]],
  ['Karakuri', ['KARAKURI'], [V, O]],
  ['Shikami', ['SHIKAMI'], [V, O]],
  ['Hatamoto', ['HATAMOTO'], [V, S]],
  ['Shizoku', ['SHIZOKU FTO'], [V, S]],
  ['Daiyōkai', ['DAIYŌKAI'], [V, O]],
  ['Takeshi \'Neko\' Oyama', ['OYAMA'], [V, O]],
  ['Ruby Monday', ['RUBY MONDAY'], [S]],
  // Los pilotos y Kobaruto acompañan a su TAG; es una inferencia, no figuran por separado en el roster.
  ['O-Yoroi', ['O-YOROI', 'PILOTO O-YOROI'], [V, O]],
  ['Mechazoid', ['MECHAZOID', 'PILOTO MECHAZOID'], [V, S]],
  ['Kobaruto', ['KOBARUTO'], [V, O, S]],
  ['Triphammers', ['TRIPHAMMER', 'TURTLEMEK'], [S]],
  ['Aibōt', ['GARON AIBŌT', 'ROBIO AIBŌT', 'ATOM AIBŌT', 'URAN AIBŌT'], [V, O, S]],
  ['Pangguling', ['PANGGULING'], [V, O, S]],
  ['Rui Shi', ['RUI SHI'], [V, O, S]],
  ['Lù Duān', ['LÙ DUĀN'], [V, O, S]],
  ['Yáozǎo', ['YÁOZǍO'], [V, O, S]],
  ['Ninjas', ['NINJA'], [V, O, S]],
  ['Nokizaru', ['NOKIZARU'], [V, S]],
  ['Kurayami Ninjas', ['NINJA KURAYAMI'], [V, S]],
  ['Kyojin Killers', ['KYOJIN KILLER'], [V, S]],
  ['Oniwaban', ['ONIWA BAN'], [V, O]],
  ['Shinobu Kitsune', ['SHINOBU'], [V, O]],
  ['Saito Tōgan', ['SAITO TŌGAN'], [V, O, S]],
  ['Miyamoto Mushashi', ['MIYAMOTO MUSHASHI'], [V, O, S]],
  ['Ioann Bann', ['IOANN BANN'], [V, S]],
  ['Yojimbo', ['YOJIMBO', 'YOJIMBO MOTORIZADO'], [V, O, S]],
  ['Yuan Yuan', ['YUAN YUAN'], [O]],
  ['Yamabushi', ['YAMABUSHI'], [S]],
  // Spec-Ops: no figuran en los rosters en imagen; Infinity Army los lista idénticos en JSA, Shindenbutai y Oban.
  ['Kaizoku Spec-Ops', ['KAIZOKU', 'ATOMU SPECBOT_1', 'ATOMU SPECBOT_2'], [V, O, S]],
  // Entradas del roster «Awaiting Release» sin unidad en el catálogo.
  ['Taguraida', [], [V, O, S]],
];

export function buildSectorialAvailability(catalogUnitNames) {
  const known = new Set(catalogUnitNames);
  const unitsBySectorial = new Map(sectorialRosters.map(({ id }) => [id, new Set()]));
  const unmatchedRosterEntries = [];
  const assigned = new Set();

  for (const [rosterName, unitNames, sectorialIds] of rosterEntries) {
    const matched = unitNames.filter((name) => known.has(name));
    if (matched.length !== unitNames.length || (!unitNames.length)) unmatchedRosterEntries.push(rosterName);
    for (const name of matched) {
      assigned.add(name);
      for (const id of sectorialIds) unitsBySectorial.get(id).add(name);
    }
  }

  return {
    unitsBySectorial,
    unmatchedRosterEntries,
    unlistedUnits: catalogUnitNames.filter((name) => !assigned.has(name)),
  };
}
