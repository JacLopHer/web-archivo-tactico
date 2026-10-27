export const PROJECT_STORAGE_KEY = 'infinity-datacards.projects';
export const PROJECT_SCHEMA_VERSION = 1;
export const DEFAULT_PROJECT_NAME = 'Mi lista';

export class ProjectStorageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProjectStorageError';
  }
}

export function createInitialProjectStore(projectId) {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    activeProjectId: projectId,
    projects: [{ id: projectId, name: DEFAULT_PROJECT_NAME, cards: [] }],
  };
}

export function validateProjectStore(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProjectStorageError('El guardado local no contiene un objeto válido.');
  }
  if (value.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    throw new ProjectStorageError('La versión del guardado local no es compatible.');
  }
  if (!Array.isArray(value.projects) || value.projects.length === 0) {
    throw new ProjectStorageError('El guardado local debe contener al menos un proyecto.');
  }

  const projectIds = new Set();
  for (const project of value.projects) {
    if (
      !project ||
      typeof project.id !== 'string' ||
      !project.id.trim() ||
      typeof project.name !== 'string' ||
      !project.name.trim() ||
      !Array.isArray(project.cards)
    ) {
      throw new ProjectStorageError('Hay un proyecto con datos incompletos en el guardado local.');
    }
    if (projectIds.has(project.id)) {
      throw new ProjectStorageError('El guardado local contiene identificadores de proyecto repetidos.');
    }
    projectIds.add(project.id);

    const cardIds = new Set();
    for (const card of project.cards) {
      if (
        !card ||
        !Number.isSafeInteger(card.id) ||
        card.id < 0 ||
        typeof card.profileId !== 'string' ||
        !card.profileId.trim() ||
        (card.groupName !== undefined && typeof card.groupName !== 'string')
      ) {
        throw new ProjectStorageError('Hay una ficha con datos incompletos en el guardado local.');
      }
      if (cardIds.has(card.id)) {
        throw new ProjectStorageError('El guardado local contiene identificadores de ficha repetidos.');
      }
      cardIds.add(card.id);
    }
  }

  if (typeof value.activeProjectId !== 'string' || !projectIds.has(value.activeProjectId)) {
    throw new ProjectStorageError('El proyecto activo no existe en el guardado local.');
  }

  return value;
}

export function loadProjectStore(storage, createInitialStore) {
  let serialized;
  try {
    serialized = storage.getItem(PROJECT_STORAGE_KEY);
  } catch {
    throw new ProjectStorageError('No se pudo leer el almacenamiento local del navegador.');
  }

  if (serialized === null) {
    return { store: validateProjectStore(createInitialStore()), loaded: false };
  }

  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new ProjectStorageError('El guardado local contiene JSON inválido y no se ha modificado.');
  }
  return { store: validateProjectStore(parsed), loaded: true };
}

export function saveProjectStore(storage, store) {
  const validStore = validateProjectStore(store);
  try {
    storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(validStore));
  } catch {
    throw new ProjectStorageError('No se pudo guardar en el almacenamiento local del navegador.');
  }
}

export function createProject(store, project) {
  const name = project.name.trim();
  if (!project.id.trim() || !name) {
    throw new ProjectStorageError('Indica un nombre válido para el proyecto.');
  }
  if (store.projects.some((item) => item.id === project.id)) {
    throw new ProjectStorageError('El identificador del proyecto ya está en uso.');
  }
  return validateProjectStore({
    ...store,
    activeProjectId: project.id,
    projects: [...store.projects, { id: project.id, name, cards: [] }],
  });
}

export function setActiveProject(store, projectId) {
  if (!store.projects.some((project) => project.id === projectId)) {
    throw new ProjectStorageError('No se encontró el proyecto seleccionado.');
  }
  return { ...store, activeProjectId: projectId };
}

export function renameProject(store, projectId, name) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new ProjectStorageError('El nombre del proyecto no puede estar vacío.');
  if (!store.projects.some((project) => project.id === projectId)) {
    throw new ProjectStorageError('No se encontró el proyecto que quieres renombrar.');
  }
  return {
    ...store,
    projects: store.projects.map((project) =>
      project.id === projectId ? { ...project, name: trimmedName } : project,
    ),
  };
}

export function deleteProject(store, projectId, replacementProjectId) {
  if (!store.projects.some((project) => project.id === projectId)) {
    throw new ProjectStorageError('No se encontró el proyecto que quieres eliminar.');
  }
  if (store.projects.length === 1) {
    return createInitialProjectStore(replacementProjectId);
  }

  const projects = store.projects.filter((project) => project.id !== projectId);
  return {
    ...store,
    activeProjectId: store.activeProjectId === projectId ? projects[0].id : store.activeProjectId,
    projects,
  };
}

export function updateProjectCards(store, projectId, cards) {
  if (!store.projects.some((project) => project.id === projectId)) {
    throw new ProjectStorageError('No se encontró el proyecto que quieres actualizar.');
  }
  return validateProjectStore({
    ...store,
    projects: store.projects.map((project) =>
      project.id === projectId ? { ...project, cards } : project,
    ),
  });
}

export function shouldAutosaveProjects({ hydrated, dirty, persistenceBlocked }) {
  return hydrated && dirty && !persistenceBlocked;
}
