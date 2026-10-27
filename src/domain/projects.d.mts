export interface ProjectCard {
  id: number;
  profileId: string;
  groupName?: string;
}

export interface Project {
  id: string;
  name: string;
  cards: ProjectCard[];
}

export interface ProjectStore {
  schemaVersion: number;
  activeProjectId: string;
  projects: Project[];
}

export class ProjectStorageError extends Error {}

export const PROJECT_STORAGE_KEY: string;
export const PROJECT_SCHEMA_VERSION: number;
export const DEFAULT_PROJECT_NAME: string;

export function createInitialProjectStore(projectId: string): ProjectStore;
export function validateProjectStore(value: unknown): ProjectStore;
export function loadProjectStore(
  storage: Pick<Storage, 'getItem'>,
  createInitialStore: () => ProjectStore,
): { store: ProjectStore; loaded: boolean };
export function saveProjectStore(storage: Pick<Storage, 'setItem'>, store: ProjectStore): void;
export function createProject(
  store: ProjectStore,
  project: { id: string; name: string },
): ProjectStore;
export function setActiveProject(store: ProjectStore, projectId: string): ProjectStore;
export function renameProject(store: ProjectStore, projectId: string, name: string): ProjectStore;
export function deleteProject(
  store: ProjectStore,
  projectId: string,
  replacementProjectId: string,
): ProjectStore;
export function updateProjectCards(
  store: ProjectStore,
  projectId: string,
  cards: ProjectCard[],
): ProjectStore;
export function shouldAutosaveProjects(state: {
  hydrated: boolean;
  dirty: boolean;
  persistenceBlocked: boolean;
}): boolean;
