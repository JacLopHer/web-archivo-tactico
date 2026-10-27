import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import catalogData from './data/legacyJsaCatalog.json';
import weaponProfilesData from './data/weaponProfiles.json';
import { createWeaponIndex, getProfileWeapons, getRangeModifierLabel, getRangeModifiers } from './domain/weaponProfiles.mjs';
import { parseListImport } from './domain/listImport.mjs';
import {
  createInitialProjectStore,
  createProjectsBackup,
  createProject,
  addProjectCopies,
  deleteProject,
  loadProjectStore,
  parseProjectsBackup,
  renameProject,
  saveProjectStore,
  setActiveProject,
  shouldAutosaveProjects,
  updateProjectCards,
} from './domain/projects.mjs';
import type { JsaCatalog, TroopProfile, WeaponProfilesCatalog } from './types/catalog';
import type { ImportedProfileLine } from './domain/listImport.mjs';
import type { ProjectStore } from './domain/projects.mjs';

const catalog = catalogData as JsaCatalog;
const weaponProfiles = weaponProfilesData as WeaponProfilesCatalog;
const weaponIndex = createWeaponIndex(weaponProfiles.profiles);
const rangeBands = ['0', '20', '40', '60', '80', '100', '120', '240'];

const statLabels: Array<[keyof TroopProfile['stats'], string]> = [
  ['movement', 'MOV'],
  ['cc', 'CC'],
  ['bs', 'CD'],
  ['physical', 'FIS'],
  ['willpower', 'VOL'],
  ['armor', 'BLI'],
  ['bts', 'PB'],
  ['wounds', 'VITA / EST'],
  ['silhouette', 'S'],
  ['availability', 'DISP'],
];

function App() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(catalog.profiles[0]?.id ?? '');
  const [selectedSectorial, setSelectedSectorial] = useState('');
  const [listText, setListText] = useState('');
  const [importedEntries, setImportedEntries] = useState<Array<ImportedProfileLine & { id: string }>>([]);
  const [importedFormat, setImportedFormat] = useState<'infinity-army' | 'profile-list'>('profile-list');
  const [projectStore, setProjectStore] = useState<ProjectStore | null>(null);
  const [projectsHydrated, setProjectsHydrated] = useState(false);
  const [projectsDirty, setProjectsDirty] = useState(false);
  const [persistenceBlocked, setPersistenceBlocked] = useState(false);
  const [persistenceError, setPersistenceError] = useState('');
  const [persistenceMessage, setPersistenceMessage] = useState('Cargando proyectos locales…');
  const [newProjectName, setNewProjectName] = useState('');
  const [renameProjectName, setRenameProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isRenamingProject, setIsRenamingProject] = useState(false);
  const [projectConfirmation, setProjectConfirmation] = useState<'delete' | 'overwrite' | null>(null);
  const [backupMessage, setBackupMessage] = useState('');
  const [backupError, setBackupError] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [collectionAnnouncement, setCollectionAnnouncement] = useState('');
  const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false);
  const nextCollectionId = useRef(0);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const clearCollectionButtonRef = useRef<HTMLButtonElement>(null);
  const cancelClearButtonRef = useRef<HTMLButtonElement>(null);
  const cancelProjectActionButtonRef = useRef<HTMLButtonElement>(null);
  const projectStoreRef = useRef<ProjectStore | null>(null);
  projectStoreRef.current = projectStore;
  const activeProjectId = projectStore?.activeProjectId;
  const activeProject = projectStore?.projects.find((project) => project.id === activeProjectId);
  const collection = activeProject?.cards ?? [];
  const selectedProfile = catalog.profiles.find((profile) => profile.id === selectedId);
  const profileWeapons = selectedProfile ? getProfileWeapons(selectedProfile, weaponIndex) : [];
  const resolvedImportCount = importedEntries.filter((entry) => entry.profileId).length;

  useEffect(() => {
    try {
      const result = loadProjectStore(
        window.localStorage,
        () => createInitialProjectStore(`project-${crypto.randomUUID()}`),
      );
      setProjectStore(result.store);
      nextCollectionId.current = Math.max(
        0,
        ...result.store.projects.flatMap((project) => project.cards.map((card) => card.id + 1)),
      );
      setPersistenceMessage(
        result.loaded ? 'Proyectos recuperados del almacenamiento local.' : 'Lista inicial lista; se guardará al primer cambio.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido al leer los proyectos locales.';
      setProjectStore(createInitialProjectStore(`project-${crypto.randomUUID()}`));
      setPersistenceBlocked(true);
      setPersistenceError(message);
      setPersistenceMessage(`No se guardaron los cambios: ${message}`);
    } finally {
      setProjectsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!projectStore || !shouldAutosaveProjects({
      hydrated: projectsHydrated,
      dirty: projectsDirty,
      persistenceBlocked,
    })) return;

    try {
      saveProjectStore(window.localStorage, projectStore);
      setPersistenceMessage('Guardado localmente en este navegador.');
      setPersistenceError('');
      setPersistenceBlocked(false);
      setProjectsDirty(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido al guardar los proyectos locales.';
      setPersistenceError(message);
      setPersistenceMessage(`No se guardaron los cambios: ${message}`);
      setPersistenceBlocked(true);
    }
  }, [projectStore, projectsHydrated, projectsDirty, persistenceBlocked]);

  const updateProjectStore = (nextStore: ProjectStore) => {
    projectStoreRef.current = nextStore;
    setProjectStore(nextStore);
    setProjectsDirty(true);
    setPersistenceMessage('Cambios pendientes de guardado local.');
  };

  const createProjectId = () => `project-${crypto.randomUUID()}`;

  const filteredProfiles = useMemo(() => {
    const normalizedQuery = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const sectorial = catalog.sectorials.find((item) => item.id === selectedSectorial);

    return catalog.profiles.filter((profile) => {
      const matchesQuery =
        !normalizedQuery ||
        `${profile.name} ${profile.troopType} ${profile.rangedEquipment} ${profile.meleeEquipment}`
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
          .includes(normalizedQuery);
      const matchesSectorial = !sectorial || sectorial.profileIds.includes(profile.id);
      return matchesQuery && matchesSectorial;
    });
  }, [query, selectedSectorial]);

  useEffect(() => {
    if (!filteredProfiles.some((profile) => profile.id === selectedId)) {
      setSelectedId(filteredProfiles[0]?.id ?? '');
    }
  }, [filteredProfiles, selectedId]);

  const selectSectorial = (value: string) => {
    setSelectedSectorial(value);
    if (!value) return;
    const sectorial = catalog.sectorials.find((item) => item.id === value);
    if (sectorial && !sectorial.profileIds.includes(selectedId)) {
      setSelectedId(sectorial.profileIds[0] ?? '');
    }
  };

  const analyzeList = () => {
    const timestamp = Date.now();
    const parsed = parseListImport(listText, catalog.profiles);
    setImportedFormat(parsed.format);
    setImportedEntries(
      parsed.entries.map((entry) => ({
        ...entry,
        id: `${timestamp}-${entry.lineNumber}`,
      })),
    );
  };

  const updateImportedProfile = (entryId: string, profileId: string) => {
    setImportedEntries((entries) =>
      entries.map((entry) => (entry.id === entryId ? { ...entry, profileId } : entry)),
    );
  };

  const addProfilesToCollection = (entries: Array<{ profileId: string; groupName?: string }>) => {
    if (!projectStore || !activeProject) return;
    const cards = [
      ...collection,
      ...entries.map((entry) => ({ id: nextCollectionId.current++, ...entry })),
    ];
    updateProjectStore(updateProjectCards(projectStore, activeProject.id, cards));
    const addedNames = entries
      .map(({ profileId }) => catalog.profiles.find((profile) => profile.id === profileId)?.name)
      .filter((name): name is string => Boolean(name));
    setCollectionAnnouncement(
      addedNames.length === 1
        ? `${addedNames[0]} añadida a la colección.`
        : `${addedNames.length} perfiles añadidos a la colección.`,
    );
  };

  const addResolvedImports = () => {
    const resolved = importedEntries.filter((entry) => entry.profileId);
    addProfilesToCollection(resolved.map((entry) => ({
      profileId: entry.profileId,
      groupName: entry.groupName,
    })));
    setImportedEntries((entries) => entries.filter((entry) => !entry.profileId));
  };

  const removeResolvedImports = () => {
    setImportedEntries((entries) => entries.filter((entry) => !entry.profileId));
  };

  const moveCollectionItem = (index: number, direction: -1 | 1) => {
    if (!projectStore || !activeProject) return;
    const target = index + direction;
    if (target < 0 || target >= collection.length) return;
    const reordered = [...collection];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    updateProjectStore(updateProjectCards(projectStore, activeProject.id, reordered));
  };

  useEffect(() => {
    if (!clearConfirmationOpen) return;
    cancelClearButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setClearConfirmationOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearCollectionButtonRef.current?.focus();
    };
  }, [clearConfirmationOpen]);

  useEffect(() => {
    if (!projectConfirmation) return;
    cancelProjectActionButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProjectConfirmation(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectConfirmation]);

  const clearCollection = () => {
    if (!collection.length || !projectStore || !activeProject) return;
    updateProjectStore(updateProjectCards(projectStore, activeProject.id, []));
    setCollectionAnnouncement('Se han eliminado todas las fichas de la colección.');
    setClearConfirmationOpen(false);
  };

  const confirmProjectAction = () => {
    if (!projectStore || !activeProject) return;
    if (projectConfirmation === 'delete') {
      updateProjectStore(deleteProject(projectStore, activeProject.id, createProjectId()));
      setIsRenamingProject(false);
      setCollectionAnnouncement(`Proyecto ${activeProject.name} eliminado.`);
    } else if (projectConfirmation === 'overwrite') {
      setPersistenceBlocked(false);
      setProjectsDirty(true);
      setPersistenceMessage('Reintentando el guardado local…');
    }
    setProjectConfirmation(null);
  };

  const submitNewProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectStore || !newProjectName.trim()) return;
    updateProjectStore(createProject(projectStore, { id: createProjectId(), name: newProjectName }));
    setNewProjectName('');
    setIsCreatingProject(false);
    setIsRenamingProject(false);
    setCollectionAnnouncement(`Proyecto ${newProjectName.trim()} creado.`);
  };

  const submitRenameProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectStore || !activeProject || !renameProjectName.trim()) return;
    updateProjectStore(renameProject(projectStore, activeProject.id, renameProjectName));
    setIsRenamingProject(false);
    setCollectionAnnouncement(`Proyecto renombrado a ${renameProjectName.trim()}.`);
  };

  const exportProjectsBackup = () => {
    if (!projectStore) return;
    try {
      const backup = createProjectsBackup(projectStore);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `infinity-datacards-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupMessage('Copia de seguridad descargada.');
      setBackupError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la copia de seguridad.';
      setBackupError(message);
      setBackupMessage('');
    }
  };

  const importProjectsBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setBackupError('El archivo supera el límite de 5 MB.');
      setBackupMessage('');
      return;
    }
    if (!projectStore) {
      setBackupError('Espera a que se carguen los proyectos antes de importar.');
      setBackupMessage('');
      return;
    }

    setBackupBusy(true);
    setBackupError('');
    setBackupMessage('');
    try {
      const backupStore = parseProjectsBackup(
        await file.text(),
        catalog.profiles.map((profile) => profile.id),
      );
      const currentStore = projectStoreRef.current;
      if (!currentStore) throw new Error('No hay proyectos cargados para añadir la copia.');
      const nextStore = addProjectCopies(currentStore, backupStore.projects, createProjectId);
      nextCollectionId.current = Math.max(
        nextCollectionId.current,
        ...nextStore.projects.flatMap((project) => project.cards.map((card) => card.id + 1)),
      );
      updateProjectStore(nextStore);
      const count = backupStore.projects.length;
      setBackupMessage(
        `${count} ${count === 1 ? 'proyecto añadido' : 'proyectos añadidos'} como copias. Tus proyectos se conservaron.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo leer la copia de seguridad.';
      setBackupError(message);
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="header-identity">
          <a className="brand" href="#" aria-label="Infinity Datacards, inicio">
            <span className="brand-mark">∞</span>
            <span>
              <strong>INFINITY</strong>
              <small>DATACARDS</small>
            </span>
          </a>
          <div className="header-copy">
            <span className="eyebrow">ARCHIVO TÁCTICO · FASE 01</span>
            <h1>Tu fuerza, <span>ficha a ficha.</span></h1>
            <p>Consulta los perfiles de JSA y prepara el terreno para tus próximas listas.</p>
          </div>
        </div>
        <span className="edition-tag">N5 · PILOTO JSA</span>
      </header>

      <section className="project-manager panel-surface" aria-label="Gestión de proyectos">
        <div className="project-nav">
          <label className="project-select">
            <span className="sr-only">Proyecto activo</span>
            <select
              value={activeProject?.id ?? ''}
              disabled={!projectsHydrated || !projectStore}
              onChange={(event) => {
                if (!projectStore) return;
                updateProjectStore(setActiveProject(projectStore, event.target.value));
                setIsCreatingProject(false);
                setIsRenamingProject(false);
              }}
              aria-label="Proyecto activo"
            >
              {projectStore?.projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
          {isCreatingProject && (
            <form className="project-inline-form" onSubmit={submitNewProject}>
              <input
                autoFocus
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                maxLength={60}
                placeholder="Nombre de la lista"
                aria-label="Nombre del nuevo proyecto"
                disabled={!projectsHydrated}
              />
              <button className="action-button primary" type="submit" aria-label="Crear proyecto" title="Crear proyecto" disabled={!projectsHydrated || !newProjectName.trim()}>
                Crear
              </button>
              <button className="action-button" type="button" aria-label="Cancelar creación" title="Cancelar" onClick={() => {
                setIsCreatingProject(false);
                setNewProjectName('');
              }}>×</button>
            </form>
          )}
          {isRenamingProject && (
            <form className="project-inline-form" onSubmit={submitRenameProject}>
              <input
                autoFocus
                value={renameProjectName}
                onChange={(event) => setRenameProjectName(event.target.value)}
                maxLength={60}
                aria-label="Nuevo nombre del proyecto"
                disabled={!activeProject}
              />
              <button className="action-button primary" type="submit" aria-label="Guardar nombre" title="Guardar nombre" disabled={!renameProjectName.trim()}>Guardar</button>
              <button className="action-button" type="button" aria-label="Cancelar renombrado" title="Cancelar" onClick={() => setIsRenamingProject(false)}>×</button>
            </form>
          )}
          {!isCreatingProject && !isRenamingProject && (
            <div className="project-actions">
              <button
                className="action-button"
                type="button"
                aria-label="Renombrar proyecto activo"
                title="Renombrar proyecto activo"
                disabled={!activeProject}
                onClick={() => {
                  setRenameProjectName(activeProject?.name ?? '');
                  setIsRenamingProject(true);
                }}
              >
                Renombrar
              </button>
              <button
                className="action-button"
                type="button"
                aria-label="Crear proyecto"
                title="Crear proyecto"
                disabled={!projectsHydrated}
                onClick={() => setIsCreatingProject(true)}
              >
                + Nuevo
              </button>
              <button
                className="action-button clear-collection-button"
                type="button"
                aria-label="Eliminar proyecto activo"
                title="Eliminar proyecto activo"
                disabled={!activeProject}
                onClick={() => setProjectConfirmation('delete')}
              >
                Eliminar
              </button>
            </div>
          )}
          <div className="project-backup-controls">
            <button
              className="action-button"
              type="button"
              onClick={exportProjectsBackup}
              aria-label="Descargar copia de seguridad"
              title="Descargar copia de seguridad"
              disabled={!projectsHydrated || !projectStore || backupBusy}
            >
              ↓ Copia
            </button>
            <button
              className="action-button"
              type="button"
              onClick={() => backupFileInputRef.current?.click()}
              aria-label="Añadir proyectos desde una copia de seguridad"
              title="Añadir proyectos desde una copia de seguridad"
              disabled={!projectsHydrated || !projectStore || backupBusy}
            >
              {backupBusy ? '…' : '↑ Añadir'}
            </button>
          </div>
          <input
            ref={backupFileInputRef}
            className="visually-hidden-file-input"
            type="file"
            accept=".json,application/json"
            aria-label="Seleccionar archivo de copia de seguridad"
            onChange={importProjectsBackup}
          />
          <span
            className={`persistence-indicator${persistenceError ? ' is-error' : ''}`}
            role="status"
            title={persistenceError || persistenceMessage}
            aria-label={persistenceError ? `Error de guardado: ${persistenceError}` : persistenceMessage}
          >
            <span className="persistence-dot" />
            {persistenceError ? 'Error' : !projectsHydrated ? 'Cargando' : projectsDirty ? 'Guardando' : 'Guardado'}
          </span>
        </div>
        {(backupMessage || backupError || persistenceError) && (
          <p className={`project-feedback${backupError || persistenceError ? ' is-error' : ''}`} role="status">
            {persistenceError ? persistenceError : backupError || backupMessage}
            {persistenceError && (
              <button className="action-button" type="button" onClick={() => setProjectConfirmation('overwrite')}>
                Reintentar / reemplazar guardado local
              </button>
            )}
          </p>
        )}
      </section>

      <section className="catalog-controls" aria-label="Filtros del catálogo">
        <label className="select-control">
          <span>Facción</span>
          <select value={catalog.faction.id} disabled aria-label="Facción">
            <option value={catalog.faction.id}>{catalog.faction.name}</option>
          </select>
        </label>
        <label className="select-control">
          <span>Sectorial</span>
          <select value={selectedSectorial} onChange={(event) => selectSectorial(event.target.value)}>
            <option value="">Catálogo JSA · sin filtrar sectorial</option>
            {catalog.sectorials.map((sectorial) => (
              <option
                key={sectorial.id}
                value={sectorial.id}
                disabled={sectorial.verificationStatus !== 'mapped'}
              >
                {sectorial.name}
                {sectorial.verificationStatus !== 'mapped' ? ' · datos pendientes' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="search-control">
          <span>Buscar unidad, perfil o armamento</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej. Ninja, Domaru, Spitfire…"
          />
        </label>
      </section>

      <div className="data-notice" role="status">
        <span className="notice-icon">!</span>
        <p>
          <strong>Catálogo de perfiles aceptado para el MVP.</strong> Los datos de tropa proceden de la herramienta JSA anterior.
          La disponibilidad sectorial sigue sin mapear y sus filtros permanecen desactivados.
        </p>
        <span className="profile-count">{filteredProfiles.length} perfiles</span>
      </div>

      <section className="list-import panel-surface" aria-labelledby="import-title">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">IMPORTAR LISTA</span>
            <h2 id="import-title">Pega una lista de perfiles</h2>
          </div>
          <span className="result-count">{importedEntries.length}</span>
        </div>
        <div className="import-input-area">
          <label htmlFor="profile-list-input">Lista de perfiles JSA o exportación de Infinity Army</label>
          <textarea
            id="profile-list-input"
            value={listText}
            onChange={(event) => setListText(event.target.value)}
            placeholder={'Pega aquí el texto copiado de Infinity Army o escribe perfiles, uno por línea.'}
            rows={5}
          />
          <div className="import-input-footer">
            <p>
              {importedFormat === 'infinity-army'
                ? 'Formato Infinity Army: grupos, coste y armamento se extraen del texto. Revisa las coincidencias antes de añadir.'
                : 'Para listas simples, escribe un perfil por línea. Los nombres ambiguos requieren selección manual.'}
            </p>
            <button className="action-button" type="button" onClick={analyzeList} disabled={!listText.trim()}>
              Analizar lista
            </button>
          </div>
        </div>
        {importedEntries.length > 0 && (
          <div className="import-review">
            <div className="import-review-heading">
              <strong>Revisión de coincidencias</strong>
              <div className="import-review-actions">
                <button
                  className="action-button"
                  type="button"
                  onClick={removeResolvedImports}
                  disabled={!resolvedImportCount}
                >
                  Quitar resueltas ({resolvedImportCount})
                </button>
                <button
                  className="action-button primary"
                  type="button"
                  onClick={addResolvedImports}
                  disabled={!resolvedImportCount}
                >
                  Añadir resueltas ({resolvedImportCount})
                </button>
              </div>
            </div>
            <ul className="import-entry-list">
              {importedEntries.map((entry) => {
                const profile = catalog.profiles.find((item) => item.id === entry.profileId);
                const status = profile
                  ? entry.resolution === 'details'
                    ? 'Coincidencia por armamento y coste'
                    : entry.candidateIds.length > 1 ? 'Coincidencia elegida manualmente' : 'Coincidencia exacta'
                  : entry.candidateIds.length > 1 ? 'Nombre ambiguo' : 'Sin coincidencia';
                return (
                  <li className="import-entry" key={entry.id}>
                    <div className="import-original">
                      <strong>{entry.originalName}</strong>
                      <span>
                        {entry.groupName ? `${entry.groupName} · ` : ''}
                        Línea {entry.lineNumber} · {status}
                        {entry.points ? ` · ${entry.points} PTS / ${entry.cap} CAP` : ''}
                      </span>
                      {entry.rangedEquipment && (
                        <span className="import-equipment">
                          CD/EQ: {entry.rangedEquipment}
                          {entry.meleeEquipment ? ` · CC: ${entry.meleeEquipment}` : ''}
                        </span>
                      )}
                      {importedFormat === 'infinity-army' && !entry.profileId && (
                        <span className="import-source-line">{entry.sourceLine}</span>
                      )}
                    </div>
                    <label className="import-profile-select">
                      <span className="sr-only">Perfil para {entry.originalName}</span>
                      <select
                        value={entry.profileId}
                        onChange={(event) => updateImportedProfile(entry.id, event.target.value)}
                      >
                        <option value="">Elegir perfil manualmente</option>
                        {catalog.profiles.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {item.troopType} · {item.points} PTS
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <div className="workspace">
        <section className="roster-panel" aria-label="Perfiles disponibles">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">JAPANESE SECESSIONIST ARMY</span>
              <h2>Perfiles</h2>
              <small className="profile-list-hint">Doble clic para añadir a la colección</small>
            </div>
            <span className="result-count">{filteredProfiles.length}</span>
          </div>
          <div className="profile-list">
            {filteredProfiles.map((profile) => (
              <button
                className={`profile-option ${selectedId === profile.id ? 'is-selected' : ''}`}
                key={profile.id}
                onClick={() => setSelectedId(profile.id)}
                onDoubleClick={() => addProfilesToCollection([{ profileId: profile.id }])}
                type="button"
              >
                <span className="profile-avatar" aria-hidden="true">{profile.name.slice(0, 1)}</span>
                <span className="profile-summary">
                  <strong>{profile.name}</strong>
                  <small>{profile.troopType}</small>
                  <small className="profile-equipment">{profile.rangedEquipment || profile.meleeEquipment || 'Sin armamento registrado'}</small>
                </span>
                <span className="profile-cost">{profile.points}<small>PTS</small></span>
              </button>
            ))}
            {filteredProfiles.length === 0 && (
              <div className="empty-state">No hay perfiles que coincidan con esa búsqueda.</div>
            )}
          </div>
        </section>

        <section className="detail-panel" aria-label="Ficha del perfil seleccionado">
          {selectedProfile ? (
            <>
            <div className="detail-actions">
              <span>Vista detallada del perfil</span>
              <button className="action-button primary" type="button" onClick={() => addProfilesToCollection([{ profileId: selectedProfile.id }])}>
                Añadir a la colección
              </button>
            </div>
            <article className="datacard">
              <header className="unit-header">
                <div
                  className="unit-portrait"
                  role="img"
                  aria-label={`Marcador provisional; imagen no disponible para ${selectedProfile.name}`}
                >
                  <span>{selectedProfile.name.slice(0, 1)}</span>
                  <small>JSA</small>
                </div>
                <div className="unit-heading">
                  <div className="unit-name-row">
                    <h2>{selectedProfile.name}</h2>
                    <div className="unit-type-row">
                      <span>{selectedProfile.troopType}</span>
                      <span className="unit-edition">{selectedProfile.edition}</span>
                      <span className="unit-cost"><strong>{selectedProfile.points}</strong> PTS</span>
                      <span className="unit-cap">CAP <strong>{selectedProfile.cap}</strong></span>
                    </div>
                  </div>
                </div>
              </header>
              <div className="stat-grid">
                {statLabels.map(([key, label]) => (
                  <div className="stat" key={key}>
                    <span>{key === 'wounds' ? selectedProfile.woundsLabel : label}</span>
                    <strong>{selectedProfile.stats[key]}</strong>
                  </div>
                ))}
              </div>
              <div className="skills-band">
                <div className="skills-band-title">HABILIDADES ESP.</div>
                <p>{selectedProfile.skillsAndEquipment || 'No registrado en la fuente heredada.'}</p>
              </div>
              <div className="card-lower">
                <section className="weapon-section" aria-label="Perfiles de armamento">
                  <div className="weapon-section-heading">
                    <div className="section-title">PERFILES DE ARMAMENTO</div>
                  </div>
                  {profileWeapons.length ? (
                    <div className="weapon-table-scroll">
                      <div className="weapon-table">
                        <div className="weapon-table-head">
                          <span>ARMA</span>
                          <div className="range-head" aria-label="Distancias en centímetros">
                            {rangeBands.map((range, index) => (
                              <span key={range} style={{ left: `${(index / (rangeBands.length - 1)) * 100}%` }}>
                                {range}
                              </span>
                            ))}
                          </div>
                          <span>PS</span>
                          <span>R</span>
                          <span>MUN</span>
                          <span>TS</span>
                          <span>Nº</span>
                        </div>
                        {profileWeapons.map(({ name, category, profile }, index) => (
                          <div className="weapon-entry" key={`${name}-${index}`}>
                            {profile ? (
                              <>
                                <div className="weapon-main-row">
                                  <div className="weapon-name-cell">
                                    <div className="weapon-name-line">
                                      <strong className="weapon-name">{name}</strong>
                                      <span className="weapon-category">{category}</span>
                                    </div>
                                    {profile.properties && (
                                      <span className="weapon-properties">{profile.properties}</span>
                                    )}
                                  </div>
                                  {profile.rangeNote ? (
                                    <div className="range-note">{profile.rangeNote}</div>
                                  ) : getRangeModifiers(profile).length ? (
                                    <div className="range-track" aria-label={`Modificadores de alcance: ${profile.rangeModifiers}`}>
                                      {getRangeModifiers(profile).map((value, bandIndex) => {
                                        const tone = value === '0' ? 'neutral' : value.startsWith('+') ? 'positive' : value === '-3' ? 'short' : value === '-6' ? 'long' : 'unavailable';
                                        return <span className={`range-band ${tone}`} key={`${bandIndex}-${value}`}>{getRangeModifierLabel(value)}</span>;
                                      })}
                                    </div>
                                  ) : (
                                    <div className="range-blank" aria-label="Sin perfil de alcance" />
                                  )}
                                  <span className="weapon-value">{profile.damage}</span>
                                  <span className="weapon-value">{profile.burst}</span>
                                  <span className="weapon-value">{profile.ammunition}</span>
                                  <span className="weapon-value">{profile.saveAttribute}</span>
                                  <span className="weapon-value">{profile.saves}</span>
                                </div>
                              </>
                            ) : (
                              <div className="weapon-unmatched">
                                <strong>{name}</strong>
                                <span>Sin perfil coincidente en el catálogo heredado; no se muestran valores inferidos.</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="empty-weapons">Este perfil no tiene armamento registrado en la fuente heredada.</p>
                  )}
                </section>
              </div>
            </article>
            </>
          ) : (
            <div className="empty-detail">Selecciona un perfil para consultar su ficha.</div>
          )}
        </section>
      </div>
      <section className="collection-section" aria-labelledby="collection-title">
        <p className="sr-only" aria-live="polite">{collectionAnnouncement}</p>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">VISTA PREVIA</span>
            <h2 id="collection-title">Colección de fichas</h2>
          </div>
          <div className="collection-heading-actions">
            <button
              ref={clearCollectionButtonRef}
              className="action-button clear-collection-button"
              type="button"
              onClick={() => setClearConfirmationOpen(true)}
              disabled={!collection.length}
            >
              Limpiar fichas
            </button>
            <span className="result-count">{collection.length}</span>
          </div>
        </div>
        {collection.length ? (
          <div className="collection-grid">
            {collection.map((item, index) => {
              const profile = catalog.profiles.find((candidate) => candidate.id === item.profileId);
              if (!profile) return null;
              return (
                <article className="collection-card" key={item.id}>
                  <div className="collection-card-toolbar">
                    <span>{item.groupName ? `${item.groupName} · ` : ''}FICHA {index + 1}</span>
                    <div>
                      <button type="button" aria-label={`Mover ${profile.name} arriba`} onClick={() => moveCollectionItem(index, -1)} disabled={index === 0}>↑</button>
                      <button type="button" aria-label={`Mover ${profile.name} abajo`} onClick={() => moveCollectionItem(index, 1)} disabled={index === collection.length - 1}>↓</button>
                      <button type="button" aria-label={`Eliminar ${profile.name}`} onClick={() => {
                        if (!projectStore || !activeProject) return;
                        updateProjectStore(updateProjectCards(
                          projectStore,
                          activeProject.id,
                          collection.filter((candidate) => candidate.id !== item.id),
                        ));
                      }}>×</button>
                    </div>
                  </div>
                  <button className="collection-card-main" type="button" onClick={() => setSelectedId(profile.id)}>
                    <span className="collection-card-heading">
                      <strong>{profile.name}</strong>
                      <span>{profile.points} PTS · CAP {profile.cap}</span>
                    </span>
                    <span className="collection-stats">
                      {statLabels.map(([key, label]) => (
                        <span key={key}><small>{key === 'wounds' ? profile.woundsLabel : label}</small><strong>{profile.stats[key]}</strong></span>
                      ))}
                    </span>
                    <span className="collection-card-details">
                      <span><small>HABILIDADES Y EQUIPO</small>{profile.skillsAndEquipment || 'No registrado en la fuente heredada.'}</span>
                      <span><small>ARMAMENTO</small>{[profile.rangedEquipment, profile.meleeEquipment].filter(Boolean).join(' · ') || 'No registrado'}</span>
                    </span>
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="collection-empty">Analiza una lista o añade perfiles del catálogo para preparar tu colección.</p>
        )}
      </section>
      {clearConfirmationOpen && (
        <div
          className="dialog-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setClearConfirmationOpen(false);
          }}
        >
          <section
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-dialog-title"
            aria-describedby="clear-dialog-description"
          >
            <div className="dialog-eyebrow">EDITAR COLECCIÓN</div>
            <h2 id="clear-dialog-title">¿Limpiar todas las fichas?</h2>
            <p id="clear-dialog-description">
              Se eliminarán las {collection.length} fichas de esta colección. Esta acción no se puede deshacer.
            </p>
            <div className="dialog-actions">
              <button
                ref={cancelClearButtonRef}
                className="action-button"
                type="button"
                onClick={() => setClearConfirmationOpen(false)}
              >
                Cancelar
              </button>
              <button className="action-button destructive" type="button" onClick={clearCollection}>
                Sí, limpiar fichas
              </button>
            </div>
          </section>
        </div>
      )}
      {projectConfirmation && (
        <div
          className="dialog-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setProjectConfirmation(null);
          }}
        >
          <section
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="project-dialog-title"
            aria-describedby="project-dialog-description"
          >
            <div className="dialog-eyebrow">GESTIONAR PROYECTOS</div>
            <h2 id="project-dialog-title">
              {projectConfirmation === 'delete' ? '¿Eliminar este proyecto?' : '¿Reintentar y reemplazar el guardado?'}
            </h2>
            <p id="project-dialog-description">
              {projectConfirmation === 'delete'
                ? `Se eliminará «${activeProject?.name}» y sus ${collection.length} fichas. Esta acción no se puede deshacer.${projectStore?.projects.length === 1 ? ' Se creará una lista vacía para que puedas continuar.' : ''}`
                : 'Se intentará guardar el estado actual. Si los datos locales anteriores están dañados o no son compatibles, se reemplazarán y no podrán recuperarse.'}
            </p>
            <div className="dialog-actions">
              <button
                ref={cancelProjectActionButtonRef}
                className="action-button"
                type="button"
                onClick={() => setProjectConfirmation(null)}
              >
                Cancelar
              </button>
              <button className="action-button destructive" type="button" onClick={confirmProjectAction}>
                {projectConfirmation === 'delete' ? 'Sí, eliminar proyecto' : 'Sí, reintentar guardado'}
              </button>
            </div>
          </section>
        </div>
      )}
      <footer className="app-footer">Catálogo piloto · JSA únicamente · preparado para ampliar con fuentes verificadas</footer>
    </main>
  );
}

export default App;
