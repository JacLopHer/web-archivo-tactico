export function normalizeProfileName(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function parseProfileList(text, profiles) {
  return text
    .split(/\r?\n/)
    .map((line, index) => ({ originalName: line.trim(), lineNumber: index + 1 }))
    .filter((entry) => entry.originalName.length > 0)
    .map((entry) => {
      const normalizedName = normalizeProfileName(entry.originalName);
      const candidateIds = profiles
        .filter((profile) => normalizeProfileName(profile.name) === normalizedName)
        .map((profile) => profile.id);

      return {
        ...entry,
        candidateIds,
        profileId: candidateIds.length === 1 ? candidateIds[0] : '',
      };
    });
}
