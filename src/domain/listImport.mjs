export function normalizeProfileName(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const equipmentNameAliases = [
  ['apsubmachinegun', 'subfusilap'],
  ['viraltacticalbow', 'arcotacticoviral'],
  ['emgrenades', 'granadasem'],
  ['submachinegun', 'subfusil'],
  ['emcarbine', 'carabinaem'],
  ['ccweapon', 'armacc'],
  ['pistol', 'pistola'],
  ['1sd', '1de'],
].sort(([left], [right]) => right.length - left.length);

function normalizeEquipmentName(value) {
  let normalized = normalizeProfileName(value);
  for (const [alias, canonical] of equipmentNameAliases) {
    normalized = normalized.replaceAll(alias, canonical);
  }
  return normalized;
}

function findProfileName(rawName, profiles) {
  const normalizedName = normalizeProfileName(rawName);
  const matches = profiles
    .flatMap((profile) => [...new Set([profile.name, ...(profile.importNames ?? [])])]
      .map((name) => ({ profile, name, normalizedProfileName: normalizeProfileName(name) })))
    .filter(({ normalizedProfileName }) => normalizedProfileName && normalizedName.startsWith(normalizedProfileName))
    .sort((left, right) => right.normalizedProfileName.length - left.normalizedProfileName.length);
  const longestMatchLength = matches[0]?.normalizedProfileName.length ?? 0;
  const matchedProfiles = matches.filter(({ normalizedProfileName }) => normalizedProfileName.length === longestMatchLength);
  const candidates = [...new Map(matchedProfiles.map(({ profile }) => [profile.id, profile])).values()];
  if (!matchedProfiles.length) return { profileName: rawName.trim(), candidates: [] };

  let rawPrefixLength = 0;
  while (
    rawPrefixLength < rawName.length
    && normalizeProfileName(rawName.slice(0, rawPrefixLength)).length < longestMatchLength
  ) {
    rawPrefixLength += 1;
  }
  const trailingProfilePunctuation = matchedProfiles[0].name.match(/[^a-z0-9]+$/i)?.[0] ?? '';
  if (
    trailingProfilePunctuation
    && rawName.slice(rawPrefixLength, rawPrefixLength + trailingProfilePunctuation.length).toLowerCase()
      === trailingProfilePunctuation.toLowerCase()
  ) {
    rawPrefixLength += trailingProfilePunctuation.length;
  }

  return {
    profileName: rawName.slice(0, rawPrefixLength).trim().replace(/\s+/g, ' '),
    remaining: rawName.slice(rawPrefixLength).trim(),
    candidates,
  };
}

// Excepciones: el slug del logotipo no coincide con el ID local del sectorial.
const sectorialHintAliases = {
  operations: 'aleph-oss',
  'non-aligned-armies': 'non-aligned-generic',
};

// Un perfil idéntico puede existir una vez por sectorial; el logotipo de la lista indica cuál corresponde.
function matchesSectorialHint(profile, hint) {
  if (!hint) return false;
  return (profile.sectorialIds ?? []).some((id) => id === `${hint}-generic`
    || id.endsWith(`-${hint}`)
    || id === sectorialHintAliases[hint]);
}

function chooseCandidate(candidates, entry, sectorialHint) {
  if (candidates.length <= 1) return candidates[0];

  const importedEquipment = normalizeEquipmentName(`${entry.rangedEquipment} ${entry.meleeEquipment}`);
  const unitPoints = Number(entry.points) / (entry.quantity ?? 1);
  const ranked = candidates
    .map((profile) => {
      let score = 0;
      score += Number(profile.points) === unitPoints ? 4 : -4;
      score += normalizeProfileName(profile.cap) === normalizeProfileName(entry.cap) ? 2 : -2;
      const equipment = [profile.rangedEquipment, profile.meleeEquipment]
        .flatMap((value) => value.split(/[|,]/))
        .map(normalizeEquipmentName)
        .filter(Boolean);
      score += equipment.filter((item) => importedEquipment.includes(item)).length;
      return { profile, score };
    })
    .sort((left, right) => right.score - left.score);

  if (ranked[0].score <= 0) return undefined;
  const tied = ranked.filter(({ score }) => score === ranked[0].score);
  if (tied.length === 1) return tied[0].profile;
  const byHint = tied.filter(({ profile }) => matchesSectorialHint(profile, sectorialHint));
  return byHint.length === 1 ? byHint[0].profile : undefined;
}

export function parseProfileList(text, profiles) {
  return text
    .split(/\r?\n/)
    .map((line, index) => ({ originalName: line.trim(), lineNumber: index + 1 }))
    .filter((entry) => entry.originalName.length > 0)
    .map((entry) => {
      const normalizedName = normalizeProfileName(entry.originalName);
      const candidateIds = profiles
        .filter((profile) => [profile.name, ...(profile.importNames ?? [])]
          .some((name) => normalizeProfileName(name) === normalizedName))
        .map((profile) => profile.id);

      return {
        ...entry,
        candidateIds,
        profileId: candidateIds.length === 1 ? candidateIds[0] : '',
      };
    });
}

function isArmyUnitLine(line) {
  return /\(\s*[+-]?\d+(?:[.,]\d+)?\s*\|\s*\d+\s*\)\s*\.?\s*$/.test(line);
}

function stripArmyMarkup(line) {
  return line
    .replace(/\[(imglogoarmy|img)(?:=[^\]]*)?\][\s\S]*?\[\/\1\]/gi, ' ')
    .replace(/\[url(?:=[^\]]*)?\][\s\S]*?\[\/url\]/gi, ' ')
    .replace(/\[\/?(?:b|i|u)\]/gi, '')
    .trim();
}

function getDisplayName(rawLine) {
  const boldName = rawLine.match(/\[b\]\s*([\s\S]*?)\s*\[\/b\]/i)?.[1];
  return boldName?.replace(/\s+/g, ' ').trim();
}

function parseArmyUnitLine(line, lineNumber, groupName, profiles, rawLine, sectorialHint) {
  const costMatch = line.match(/\(\s*([+-]?\d+(?:[.,]\d+)?)\s*\|\s*(\d+)\s*\)\s*\.?\s*$/);
  const sides = line.slice(0, costMatch.index).split(/\s+\/\s+/);
  // «3X NOMBRE»: la lista indica el coste total de las N unidades.
  const quantityMatch = sides[0].match(/^\s*(\d+)\s*[xX]\s+/);
  const quantity = quantityMatch ? Number(quantityMatch[1]) : undefined;
  const rawRangedEquipment = sides[0].slice(quantityMatch?.[0].length ?? 0).trim();
  const meleeEquipment = sides.slice(1).join('/').trim();
  const { profileName, remaining, candidates } = findProfileName(rawRangedEquipment, profiles);
  const displayName = getDisplayName(rawLine);
  const entry = {
    originalName: profileName || rawRangedEquipment,
    ...(displayName ? { displayName } : {}),
    ...(quantity && quantity > 1 ? { quantity } : {}),
    lineNumber,
    groupName,
    sourceLine: line.trim(),
    rangedEquipment: remaining ?? '',
    meleeEquipment,
    cap: costMatch[1].replace(',', '.'),
    points: costMatch[2],
  };
  const selected = chooseCandidate(candidates, entry, sectorialHint);
  const candidateIds = selected ? [selected.id] : candidates.map((profile) => profile.id);
  const resolution = selected
    ? candidates.length === 1 ? 'exact' : 'details'
    : candidates.length ? 'ambiguous' : 'unmatched';

  return {
    ...entry,
    candidateIds,
    profileId: selected?.id ?? '',
    resolution,
  };
}

export function parseInfinityArmyList(text, profiles) {
  const entries = [];
  let groupName = '';
  const sectorialHint = text.match(/\/logo\/factions\/([a-z0-9-]+)\.svg/i)?.[1].toLowerCase();

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = stripArmyMarkup(rawLine);
    const groupMatch = line.match(/^(?:GRUPO|GROUP)\s+([12])(?:\s*\d+)?\b/i);
    if (groupMatch) {
      groupName = `Grupo ${groupMatch[1]}`;
    } else if (isArmyUnitLine(line)) {
      entries.push(parseArmyUnitLine(line, index + 1, groupName, profiles, rawLine, sectorialHint));
    }
  });

  return entries;
}

export function parseListImport(text, profiles) {
  const lines = text.split(/\r?\n/).map(stripArmyMarkup);
  if (lines.some(isArmyUnitLine)) {
    return {
      format: 'infinity-army',
      entries: parseInfinityArmyList(text, profiles),
    };
  }
  return {
    format: 'profile-list',
    entries: parseProfileList(text, profiles),
  };
}
