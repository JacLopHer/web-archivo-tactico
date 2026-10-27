import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import catalogData from './data/legacyJsaCatalog.json';
import weaponProfilesData from './data/weaponProfiles.json';
import { createWeaponIndex, getProfileWeapons, getRangeModifierLabel, getRangeModifiers } from './domain/weaponProfiles.mjs';
import { paginateCompactEntries } from './domain/printLayout.mjs';
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
const catalogProfiles: TroopProfile[] = catalog.units.flatMap((unit) =>
  unit.profiles.map((profile) => ({
    id: profile.id,
    name: profile.armyName,
    variantName: profile.name,
    unitId: unit.id,
    unitName: unit.name,
    troopType: unit.troopType,
    stats: unit.stats,
    woundsLabel: unit.woundsLabel,
    sharedSpecialRules: unit.sharedSpecialRules,
    additionalSpecialRules: profile.specialRules,
    skillsAndEquipment: [...unit.sharedSpecialRules, ...profile.specialRules].join(' · '),
    rangedEquipment: profile.rangedEquipment,
    meleeEquipment: profile.meleeEquipment,
    cap: profile.cap,
    points: profile.points,
    factionId: unit.factionId,
    sectorialIds: unit.sectorialIds,
    edition: unit.edition,
    source: unit.source,
    verificationStatus: unit.verificationStatus,
  })),
);
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

// Las imágenes se buscan en public/units/<slug>.png (miniatura) y public/units/icons/<slug>.png (icono).
const unitSlug = (name: string) => name
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const unitIconSlugByName: Record<string, string> = {
  'SHINOBU': 'oniwaban-shinobu-kitsune',
  'NINJA': 'ninjas',
  'NOKIZARU': 'nokizaru-unit',
  'NINJA KURAYAMI': 'kurayami-ninjas',
  'KYOJIN KILLER': 'kyojin-killers',
  'ONIWA BAN': 'oniwaban',
  'SAITO TŌGAN': 'saito-togan',
  'ARAGOTO': 'aragoto-senkenbutai',
  'KYOSHŌ': 'kyosh-saibayunitto',
  'SENKU': 'senku-troops',
  'KEMPEI': 'kempeitai',
  'KEISOTSU': 'keisotsu',
  'YURIKO ODA FTO': 'keisotsu-kaizoku-yuriko-oda',
  'YURIKO ODA': 'keisotsu-kaizoku-yuriko-oda',
  'TOKUSETSU EISEI': 'tokusetsu-butai',
  'TOKUSETSU KOHEI': 'tokusetsu-butai',
  'WARCOR': 'warcors-war-correspondents',
  'PILOTO MECHAZOID': 'mechazoid-sokorentai',
  'PILOTO O-YOROI': 'o-yoroi-kidobutai',
  'KAIZOKU': 'kaizoku-spec-ops',
  'ATOMU SPECBOT_1': 'atom-aib-t',
  'ATOMU SPECBOT_2': 'atom-aib-t',
  'TEISHIN': 'teishin-guntai',
  'KUROSHI RIDER': 'kuroshi-rider',
  'YUAN YUAN': 'yuan-yuan',
  'MONSTRUCKER': 'monstruckers',
  'AÏDA SWANSON': 'aida-swanson',
  'AÏDA SWANSON FTO': 'aida-swanson',
  'RAIDEN': 'raiden-seibutai',
  'RYŪKEN': 'ryuken-unit-9',
  'JIZAMURAI': 'jizamurai-hanryodan',
  'SŌHEI': 's-hei-tsugekitai',
  'SHURAYUKI': 'shurayuki',
  'KARAKURI': 'karakuri-special-project',
  'DAIYŌKAI': 'daiy-kai-dengekitai',
  'GENBU': 'genbutai',
  'SHIKAMI': 'shikami',
  'HATAMOTO': 'hatamoto-imperial-guard',
  'DOMARU': 'domaru-butai',
  'OYAMA': 'domaru-takeshi-neko-oyama',
  'TANKŌ': 'tank-zensenbutai',
  'SHIZOKU FTO': 'shizoku-kogeki-tai',
  'TANUKI': 's-t-r-s-tanuki-team',
  'YAMABUSHI FTO': 'yamabushi',
  'YAMABUSHI': 'yamabushi',
  'MIYAMOTO MUSHASHI': 'miyamoto-mushashi',
  'IOANN BANN': 'ioann-bann-varangian-dog-warrior',
  'YOJIMBO': 'yojimbo-sword-for-hire',
  'YOJIMBO MOTORIZADO': 'yojimbo-sword-for-hire',
  'SAMSA': 'freelance-operator-samsa',
  'GARON AIBŌT': 'garon-aib-t',
  'ROBIO AIBŌT': 'robio-aib-t',
  'PANGGULING': 'yaopu-pangguling',
  'PANGGULING FTO': 'yaopu-pangguling',
  'ATOM AIBŌT': 'atom-aib-t',
  'LÙ DUĀN': 'yaoxie-lu-duan',
  'URAN AIBŌT': 'uran-aib-t',
  'RUI SHI': 'yaoxie-rui-shi',
  'YÁOZǍO': 'yaozao',
  'O-YOROI': 'o-yoroi-kidobutai',
  'MECHAZOID': 'mechazoid-sokorentai',
  'TRIPHAMMER': 'triphammers-repurposed-industrial-tags',
};

const unitIconPath = (name: string) => {
  const iconSlug = unitIconSlugByName[name];
  return iconSlug
    ? `units/icons/${iconSlug}.svg`
    : `units/icons/${unitSlug(name)}.png`;
};

function App() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(catalogProfiles[0]?.id ?? '');
  const [selectedUnitId, setSelectedUnitId] = useState(catalog.units[0]?.id ?? '');
  const [selectedSectorial, setSelectedSectorial] = useState('');
  const [pendingImport, setPendingImport] = useState<{
    format: 'infinity-army' | 'profile-list';
    resolved: Array<ImportedProfileLine & { id: string }>;
    unresolved: Array<ImportedProfileLine & { id: string }>;
  } | null>(null);
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [pageBreakMode, setPageBreakMode] = useState<'automatic' | 'group' | 'card'>('automatic');
  const [printLayout, setPrintLayout] = useState<'detailed' | 'compact'>('detailed');
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());
  const markImageBroken = (key: string) => setBrokenImages((current) => (current.has(key) ? current : new Set(current).add(key)));
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [previewEntryHeights, setPreviewEntryHeights] = useState<Record<number, number>>({});
  const [clipboardBusy, setClipboardBusy] = useState(false);
  const [clipboardFeedback, setClipboardFeedback] = useState<{ message: string; isError: boolean } | null>(null);
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
  const discardImportButtonRef = useRef<HTMLButtonElement>(null);
  const clearCollectionButtonRef = useRef<HTMLButtonElement>(null);
  const cancelClearButtonRef = useRef<HTMLButtonElement>(null);
  const cancelProjectActionButtonRef = useRef<HTMLButtonElement>(null);
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const closePrintPreviewButtonRef = useRef<HTMLButtonElement>(null);
  const collectionListRef = useRef<HTMLOListElement>(null);
  const projectStoreRef = useRef<ProjectStore | null>(null);
  projectStoreRef.current = projectStore;
  const activeProjectId = projectStore?.activeProjectId;
  const activeProject = projectStore?.projects.find((project) => project.id === activeProjectId);
  const collection = activeProject?.cards ?? [];
  const selectedUnit = catalog.units.find((unit) => unit.id === selectedUnitId);
  const pendingResolvedCount = pendingImport?.resolved.length ?? 0;
  const pendingUnresolvedCount = pendingImport?.unresolved.length ?? 0;
  const collectionEntries = collection.map((item, index) => {
    const profile = catalogProfiles.find((candidate) => candidate.id === item.profileId);
    return {
      item,
      index,
      profile,
      startsGroup: Boolean(index > 0 && item.groupName && item.groupName !== collection[index - 1]?.groupName),
    };
  }).filter((entry): entry is typeof entry & { profile: TroopProfile } => Boolean(entry.profile));
  const previewPages = useMemo(() => {
    if (printLayout === 'compact') {
      if (pageBreakMode === 'card') return collectionEntries.map((entry) => [entry]);
      return paginateCompactEntries(collectionEntries);
    }

    const pages: Array<typeof collectionEntries> = [[]];
    const pageHeight = paperSize === 'A4' ? 297 : 279.4;
    const availableHeight = pageHeight - 20 - 12;
    let usedHeight = 0;

    collectionEntries.forEach((entry, entryIndex) => {
      const entryHeight = previewEntryHeights[entry.item.id] ?? 85;
      const startsPage = entryIndex > 0 && (
        (pageBreakMode === 'card')
        || (pageBreakMode === 'group' && entry.startsGroup)
        || usedHeight + entryHeight > availableHeight
      );
      if (startsPage) {
        pages.push([]);
        usedHeight = 0;
      }
      pages[pages.length - 1].push(entry);
      usedHeight += entryHeight;
    });

    return pages;
  }, [collectionEntries, pageBreakMode, paperSize, printLayout, previewEntryHeights]);

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

    return catalogProfiles.filter((profile) => {
      const matchesQuery =
        !normalizedQuery ||
        `${profile.name} ${profile.unitName} ${profile.variantName} ${profile.troopType} ${profile.rangedEquipment} ${profile.meleeEquipment}`
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
          .includes(normalizedQuery);
      const matchesSectorial = !sectorial || sectorial.profileIds.includes(profile.id);
      return matchesQuery && matchesSectorial;
    });
  }, [query, selectedSectorial]);

  const filteredUnits = catalog.units.filter((unit) =>
    filteredProfiles.some((profile) => profile.unitId === unit.id),
  );
  const unitProfiles = filteredProfiles.filter((profile) => profile.unitId === selectedUnitId);

  useEffect(() => {
    if (!filteredUnits.some((unit) => unit.id === selectedUnitId)) {
      const nextProfile = filteredProfiles.find((profile) => profile.id === selectedId) ?? filteredProfiles[0];
      setSelectedUnitId(nextProfile?.unitId ?? '');
      setSelectedId(nextProfile?.id ?? '');
      return;
    }

    if (!unitProfiles.some((profile) => profile.id === selectedId)) {
      setSelectedId(unitProfiles[0]?.id ?? '');
    }
  }, [filteredProfiles, filteredUnits, selectedId, selectedUnitId, unitProfiles]);

  const selectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
    const firstProfile = filteredProfiles.find((profile) => profile.unitId === unitId);
    if (firstProfile) setSelectedId(firstProfile.id);
  };

  const selectSectorial = (value: string) => {
    setSelectedSectorial(value);
    if (!value) return;
    const sectorial = catalog.sectorials.find((item) => item.id === value);
    if (sectorial && !sectorial.profileIds.includes(selectedId)) {
      const firstProfile = catalogProfiles.find((profile) => sectorial.profileIds.includes(profile.id));
      if (firstProfile) {
        setSelectedUnitId(firstProfile.unitId);
        setSelectedId(firstProfile.id);
      }
    }
  };

  const importListFromClipboard = async () => {
    if (!navigator.clipboard?.readText) {
      setClipboardFeedback({
        message: 'Este navegador no permite acceder al portapapeles. Copia la lista e inténtalo en un contexto seguro, como localhost o HTTPS.',
        isError: true,
      });
      return;
    }

    setClipboardBusy(true);
    setClipboardFeedback(null);
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        setClipboardFeedback({
          message: 'El portapapeles está vacío. Copia una lista antes de importarla.',
          isError: true,
        });
        return;
      }

      const parsed = parseListImport(clipboardText, catalogProfiles);
      const timestamp = Date.now();
      const entries = parsed.entries.map((entry) => ({
        ...entry,
        id: `${timestamp}-${entry.lineNumber}`,
      }));

      if (!entries.length) {
        setClipboardFeedback({
          message: 'No se encontraron perfiles reconocibles en el portapapeles.',
          isError: true,
        });
        return;
      }

      setPendingImport({
        format: parsed.format,
        resolved: entries.filter((entry) => entry.profileId),
        unresolved: entries.filter((entry) => !entry.profileId),
      });
    } catch (error) {
      const message = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'El navegador denegó el acceso al portapapeles. Permite el acceso e inténtalo de nuevo.'
        : 'No se pudo leer el portapapeles. Comprueba los permisos del navegador e inténtalo de nuevo.';
      setClipboardFeedback({ message, isError: true });
    } finally {
      setClipboardBusy(false);
    }
  };

  const acceptPendingImport = () => {
    if (!pendingImport) return;
    if (pendingImport.resolved.length) {
      addProfilesToCollection(pendingImport.resolved.map((entry) => ({
        profileId: entry.profileId,
        groupName: entry.groupName,
      })));
    }
    const resolvedCount = pendingImport.resolved.length;
    const unresolvedCount = pendingImport.unresolved.length;
    setClipboardFeedback({
      message: `Se añadieron ${resolvedCount} ${resolvedCount === 1 ? 'unidad validada' : 'unidades validadas'}.${unresolvedCount ? ` ${unresolvedCount} ${unresolvedCount === 1 ? 'unidad no validada' : 'unidades no validadas'} no se añadieron; añádelas manualmente desde el catálogo.` : ''}`,
      isError: unresolvedCount > 0,
    });
    setPendingImport(null);
  };

  const discardPendingImport = () => {
    setPendingImport(null);
    setClipboardFeedback({ message: 'Importación descartada; no se añadió ninguna unidad.', isError: false });
  };

  const addProfilesToCollection = (entries: Array<{ profileId: string; groupName?: string }>) => {
    if (!projectStore || !activeProject) return;
    const cards = [
      ...collection,
      ...entries.map((entry) => ({ id: nextCollectionId.current++, ...entry })),
    ];
    updateProjectStore(updateProjectCards(projectStore, activeProject.id, cards));
    const addedNames = entries
      .map(({ profileId }) => catalogProfiles.find((profile) => profile.id === profileId)?.variantName)
      .filter((name): name is string => Boolean(name));
    setCollectionAnnouncement(
      addedNames.length === 1
        ? `${addedNames[0]} añadida a la colección.`
        : `${addedNames.length} perfiles añadidos a la colección.`,
    );
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
    if (!printPreviewOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closePrintPreviewButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPrintPreviewOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previewButtonRef.current?.focus();
    };
  }, [printPreviewOpen]);

  useLayoutEffect(() => {
    if (!printPreviewOpen || !collectionListRef.current) return;
    if (printLayout === 'compact') {
      const mmPerPixel = 25.4 / 96;
      const cellWidth = ((paperSize === 'A4' ? 210 : 215.9) - 12 - 2) / 2;
      const cellHeight = ((paperSize === 'A4' ? 297 : 279.4) - 12 - 4 * 2) / 5;
      const cards = Array.from(collectionListRef.current.querySelectorAll<HTMLElement>('.collection-print-card'));
      cards.forEach((card) => {
        card.style.width = '';
        card.style.minHeight = '';
      });
      if (!cards.length) return;
      // La ficha se maqueta al ancho real de la celda; solo se reduce si la más alta no cabe.
      cards.forEach((card) => { card.style.width = `${cellWidth / mmPerPixel}px`; });
      const tallest = Math.max(...cards.map((card) => card.offsetHeight)) * mmPerPixel;
      if (!tallest) return;
      const scale = Math.min(1, cellHeight / tallest);
      cards.forEach((card) => {
        card.style.setProperty('--compact-card-scale', String(scale));
        card.style.width = `${cellWidth / scale / mmPerPixel}px`;
        card.style.minHeight = `${cellHeight / scale / mmPerPixel}px`;
      });
      return;
    }
    const pixelsPerMillimeter = 96 / 25.4;
    const measurements = Array.from(
      collectionListRef.current.querySelectorAll<HTMLElement>('.collection-entry'),
    ).map((entry) => {
      const id = Number(entry.dataset.collectionId);
      const card = entry.querySelector<HTMLElement>('.collection-print-card');
      const height = card ? card.getBoundingClientRect().height / pixelsPerMillimeter + 8 : 85;
      return [id, height] as const;
    });

    setPreviewEntryHeights((current) => {
      if (measurements.every(([id, height]) => Math.abs((current[id] ?? 0) - height) < 0.5)) return current;
      return Object.fromEntries(measurements);
    });
  }, [brokenImages, collection, pageBreakMode, paperSize, printLayout, printPreviewOpen]);

  useEffect(() => {
    if (!projectConfirmation) return;
    cancelProjectActionButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProjectConfirmation(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectConfirmation]);

  useEffect(() => {
    if (!pendingImport) return;
    discardImportButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') discardPendingImport();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingImport]);

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
        catalogProfiles.map((profile) => profile.id),
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
    <main className={`app-shell print-layout-${printLayout}${printPreviewOpen ? ` print-preview-open print-preview-${paperSize.toLowerCase()}` : ''}`}>
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
          <label className="print-control">
            <span>Formato de impresión</span>
            <select
              value={printLayout}
              onChange={(event) => setPrintLayout(event.target.value === 'compact' ? 'compact' : 'detailed')}
            >
              <option value="detailed">Detallado · ficha completa</option>
              <option value="compact">Compacto · hasta 10 por grupo</option>
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

      <section className="list-import panel-surface" aria-labelledby="import-title">
        <div className="panel-heading import-panel-heading">
          <div className="import-heading-title">
            <h2 id="import-title">Importar lista</h2>
          </div>
          <p className="import-heading-help">
            Importa desde el portapapeles una lista exportada de Infinity Army.
          </p>
          <button
            className="action-button primary import-list-button"
            type="button"
            onClick={importListFromClipboard}
            disabled={clipboardBusy || !projectsHydrated || !activeProject}
            title="Importa y analiza la lista que hayas copiado al portapapeles"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
              <rect x="6" y="5" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5V3.8A.8.8 0 0 1 8.8 3h4.4a.8.8 0 0 1 .8.8V5M4 7v9.2a.8.8 0 0 0 .8.8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {clipboardBusy ? 'Importando…' : 'Importar lista'}
          </button>
        </div>
        {clipboardFeedback && (
          <p className={`clipboard-feedback${clipboardFeedback.isError ? ' is-error' : ''}`} role="status">
            {clipboardFeedback.message}
          </p>
        )}
      </section>

      <div className="workspace">
        <section className="roster-panel catalog-families" aria-label="Unidades del catálogo">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">JAPANESE SECESSIONIST ARMY</span>
              <h2>Unidades</h2>
              <small className="profile-list-hint">Selecciona una unidad para ver sus perfiles</small>
            </div>
            <span className="result-count">{filteredUnits.length}</span>
          </div>
          <div className="profile-list family-list">
            {filteredUnits.map((unit) => {
              const profileCount = filteredProfiles.filter((profile) => profile.unitId === unit.id).length;
              return (
              <button
                className={`profile-option family-option ${selectedUnitId === unit.id ? 'is-selected' : ''}`}
                key={unit.id}
                onClick={() => selectUnit(unit.id)}
                type="button"
              >
                        {!brokenImages.has(`i:${unitSlug(unit.name)}`) && (
                          <img
                            className="family-option-icon"
                            src={`${import.meta.env.BASE_URL}${unitIconPath(unit.name)}`}
                            alt=""
                            aria-hidden="true"
                            onError={() => markImageBroken(`i:${unitSlug(unit.name)}`)}
                          />
                        )}
                        <span className="profile-summary"><strong>{unit.name}</strong></span>
                        <span className="family-variant-count">{profileCount} {profileCount === 1 ? 'perfil' : 'perfiles'}</span>
                      </button>
              );
            })}
            {filteredProfiles.length === 0 && (
              <div className="empty-state">No hay perfiles que coincidan con esa búsqueda.</div>
            )}
          </div>
        </section>

        <section className="roster-panel catalog-variants" aria-label={`Perfiles de ${selectedUnit?.name || 'la unidad seleccionada'}`}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PERFILES DISPONIBLES</span>
              <h2>{selectedUnit?.name || 'Selecciona una unidad'}</h2>
              <small className="profile-list-hint">Elige una variante y añádela a la lista</small>
            </div>
            <span className="result-count">{unitProfiles.length}</span>
          </div>
          {selectedUnit?.sharedSpecialRules.length ? (
            <div className="unit-shared-rules">
              <strong>REGLAS COMPARTIDAS</strong>
              <span>{selectedUnit.sharedSpecialRules.join(' · ')}</span>
            </div>
          ) : null}
          <div className="profile-list variant-list">
            {unitProfiles.map((profile) => {
              const equipmentLabel = [profile.rangedEquipment, profile.meleeEquipment].filter(Boolean).join(' · ');
              const showEquipment = !equipmentLabel
                || equipmentLabel.trim().toLocaleLowerCase() !== profile.variantName.trim().toLocaleLowerCase();
              const isFtoProfile = profile.name.includes(' FTO');
              return (
              <div className={`variant-option${selectedId === profile.id ? ' is-selected' : ''}`} key={profile.id}>
                <button className="variant-option-main" type="button" onClick={() => setSelectedId(profile.id)}>
                  <span className="variant-profile-title">
                    <strong>{profile.variantName}</strong>
                    {isFtoProfile && <span className="variant-origin-badge" title="Perfil de Fireteam Option">FTO</span>}
                  </span>
                  {showEquipment && <span>{equipmentLabel || 'Sin armamento registrado'}</span>}
                  {profile.additionalSpecialRules.length > 0 && (
                    <span className="variant-special-rules">
                      Reglas del perfil: {profile.additionalSpecialRules.join(' · ')}
                    </span>
                  )}
                  <small>{profile.points} PTS · CAP {profile.cap}</small>
                </button>
                <button
                  className="variant-add-button"
                  type="button"
                  aria-label={`Añadir ${profile.unitName}: ${profile.variantName}, ${profile.points} puntos`}
                  title="Añadir a la lista"
                  onClick={() => {
                    setSelectedId(profile.id);
                    addProfilesToCollection([{ profileId: profile.id }]);
                  }}
                >
                  Añadir
                </button>
              </div>
              );
            })}
            {!unitProfiles.length && (
              <div className="empty-state">Selecciona una unidad para consultar sus perfiles.</div>
            )}
          </div>
        </section>

        <section
          className="collection-section"
          aria-labelledby="collection-title"
          role={printPreviewOpen ? 'dialog' : undefined}
          aria-modal={printPreviewOpen || undefined}
          aria-describedby={printPreviewOpen ? 'print-preview-description' : undefined}
        >
          <style>{`@page { size: ${paperSize} portrait; margin: ${printLayout === 'compact' ? '6mm' : '10mm'}; }`}</style>
          <p className="sr-only" aria-live="polite">{collectionAnnouncement}</p>
          <div className="panel-heading collection-panel-heading">
            <div>
              <span className="eyebrow">{printPreviewOpen ? 'VISTA PREVIA DE IMPRESIÓN' : 'COLECCIÓN ACTUAL'}</span>
              <h2 id="collection-title">Lista activa</h2>
            </div>
            <div className="collection-count">
              <span className="result-count">{collection.length}</span>
              {printPreviewOpen && (
                <button
                  ref={closePrintPreviewButtonRef}
                  className="action-button"
                  type="button"
                  onClick={() => setPrintPreviewOpen(false)}
                  aria-label="Cerrar vista previa"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
          {printPreviewOpen && (
            <p className="print-preview-description" id="print-preview-description">
              {printLayout === 'compact'
                ? `Formato compacto: la misma ficha completa con atributos, reglas y tablas de armas, reducida en dos columnas por cinco filas para hasta 10 por hoja. Cada grupo de hasta 10 va en su propia hoja y los grupos más grandes se reparten. Papel ${paperSize === 'A4' ? 'A4' : 'Carta'} vertical.`
                : `Vista detallada según el papel y los saltos seleccionados. El ajuste final puede variar ligeramente según el navegador y la impresora. Papel ${paperSize === 'A4' ? 'A4' : 'Carta'}.`}
            </p>
          )}
          <div className="collection-controls">
            <label className="print-control">
              <span>Tamaño de papel</span>
              <select
                value={paperSize}
                onChange={(event) => setPaperSize(event.target.value === 'Letter' ? 'Letter' : 'A4')}
              >
                <option value="A4">A4</option>
                <option value="Letter">Carta (Letter)</option>
              </select>
            </label>
            <label className="print-control">
              <span>Saltos de página</span>
              <select
                value={pageBreakMode}
                onChange={(event) => {
                  const value = event.target.value;
                  setPageBreakMode(value === 'group' || value === 'card' ? value : 'automatic');
                }}
              >
                <option value="automatic">Automáticos</option>
                <option value="group">Al inicio de cada grupo</option>
                <option value="card">Una ficha por página</option>
              </select>
            </label>
            <button
              ref={previewButtonRef}
              className="action-button primary print-button"
              type="button"
              onClick={() => printPreviewOpen ? window.print() : setPrintPreviewOpen(true)}
              disabled={!collection.length}
            >
              {printPreviewOpen ? 'Imprimir / Guardar PDF' : 'Vista previa'}
            </button>
            <button
              ref={clearCollectionButtonRef}
              className="action-button clear-collection-button"
              type="button"
              onClick={() => setClearConfirmationOpen(true)}
              disabled={!collection.length}
            >
              Limpiar
            </button>
          </div>
          {collection.length ? (
            <ol className={`collection-list${printPreviewOpen ? ' print-preview-pages' : ''}`} ref={collectionListRef}>
              {(printPreviewOpen ? previewPages : [collectionEntries]).map((page, pageIndex) => (
                <li className="print-preview-page" key={`page-${pageIndex}`} data-preview-page={pageIndex + 1}>
                  <ol className="print-preview-page-entries">
              {page.map(({ item, index, profile, startsGroup }) => {
                const profileWeapons = getProfileWeapons(profile, weaponIndex);
                return (
                  <li
                    className={`collection-entry${startsGroup ? ' starts-group' : ''}${index > 0 ? ' starts-card' : ''}`}
                    key={item.id}
                    data-page-breaks={pageBreakMode}
                    data-collection-id={item.id}
                  >
                    <div className="collection-entry-summary">
                      <div className="collection-entry-name">
                        {!brokenImages.has(`i:${unitSlug(profile.unitName)}`) && (
                          <img
                            className="collection-entry-icon"
                            src={`${import.meta.env.BASE_URL}${unitIconPath(profile.unitName)}`}
                            alt=""
                            onError={() => markImageBroken(`i:${unitSlug(profile.unitName)}`)}
                          />
                        )}
                        <strong>{profile.unitName}</strong>
                        <span title={[profile.rangedEquipment, profile.meleeEquipment].filter(Boolean).join(' · ')}>
                          {[profile.rangedEquipment, profile.meleeEquipment].filter(Boolean).join(' · ') || 'Sin armamento registrado'}
                        </span>
                      </div>
                      <span className="collection-entry-points">{profile.points} PTS · CAP {profile.cap}</span>
                      <div className="collection-entry-actions">
                        <button type="button" aria-label={`Mover ${profile.unitName}: ${profile.variantName} arriba`} onClick={() => moveCollectionItem(index, -1)} disabled={index === 0}>↑</button>
                        <button type="button" aria-label={`Mover ${profile.unitName}: ${profile.variantName} abajo`} onClick={() => moveCollectionItem(index, 1)} disabled={index === collection.length - 1}>↓</button>
                        <button type="button" aria-label={`Eliminar ${profile.unitName}: ${profile.variantName}`} onClick={() => {
                          if (!projectStore || !activeProject) return;
                          updateProjectStore(updateProjectCards(
                            projectStore,
                            activeProject.id,
                            collection.filter((candidate) => candidate.id !== item.id),
                          ));
                        }}>×</button>
                      </div>
                    </div>
                    <article className="collection-print-card datacard">
                      <div className="collection-print-meta">
                        {item.groupName ? `${item.groupName} · ` : ''}FICHA {index + 1}
                      </div>
                      <header className="unit-header">
                        <div
                          className="unit-portrait"
                          role="img"
                          aria-label={`Icono de ${profile.unitName}`}
                        >
                          <span>{profile.unitName.slice(0, 1)}</span>
                          <small>JSA</small>
                          {!brokenImages.has(`i:${unitSlug(profile.unitName)}`) && (
                            <img
                              className="unit-icon"
                              src={`${import.meta.env.BASE_URL}${unitIconPath(profile.unitName)}`}
                              alt=""
                              onError={() => markImageBroken(`i:${unitSlug(profile.unitName)}`)}
                            />
                          )}
                        </div>
                        <div className="unit-heading">
                          <div className="unit-name-row">
                            <h2>{profile.unitName}</h2>
                            {!brokenImages.has(`m:${unitSlug(profile.unitName)}`) && (
                              <div className="unit-miniature" aria-hidden="true">
                                <img
                                  src={`${import.meta.env.BASE_URL}units/${unitSlug(profile.unitName)}.png`}
                                  alt=""
                                  onError={() => markImageBroken(`m:${unitSlug(profile.unitName)}`)}
                                />
                              </div>
                            )}
                            <div className="unit-type-row">
                              <span>{profile.troopType}</span>
                              <span className="unit-edition">{profile.edition}</span>
                              <span className="unit-cost"><strong>{profile.points}</strong> PTS</span>
                              <span className="unit-cap">CAP <strong>{profile.cap}</strong></span>
                            </div>
                          </div>
                        </div>
                      </header>
                      <div className="stat-grid">
                        {statLabels.map(([key, label]) => (
                          <div className="stat" key={key}>
                            <span>{key === 'wounds' ? profile.woundsLabel : label}</span>
                            <strong>{profile.stats[key]}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="skills-band">
                        <div className="skills-band-title">HABILIDADES ESP.</div>
                        <p>{profile.skillsAndEquipment || 'No registrado en la fuente heredada.'}</p>
                      </div>
                      <div className="card-lower">
                        <section className="weapon-section" aria-label={`Perfiles de armamento de ${profile.unitName}: ${profile.variantName}`}>
                          <div className="weapon-section-heading">
                            <div className="section-title">PERFILES DE ARMAMENTO</div>
                          </div>
                          {profileWeapons.length ? (
                            <div className="weapon-table-scroll">
                              <div className="weapon-table">
                                <div className="weapon-table-head">
                                  <span>ARMA</span>
                                  <div className="range-head" aria-label="Distancias en centímetros">
                                    {rangeBands.map((range, rangeIndex) => (
                                      <span key={range} style={{ left: `${(rangeIndex / (rangeBands.length - 1)) * 100}%` }}>
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
                                {profileWeapons.map(({ name, category, profile: weaponProfile }, weaponPosition) => (
                                  <div className="weapon-entry" key={`${name}-${weaponPosition}`}>
                                    {weaponProfile ? (
                                      <div className="weapon-main-row">
                                        <div className="weapon-name-cell">
                                          <div className="weapon-name-line">
                                            <strong className="weapon-name">{name}</strong>
                                            <span className="weapon-category">{category}</span>
                                          </div>
                                          {weaponProfile.properties && (
                                            <span className="weapon-properties">{weaponProfile.properties}</span>
                                          )}
                                        </div>
                                        {weaponProfile.rangeNote ? (
                                          <div className="range-note">{weaponProfile.rangeNote}</div>
                                        ) : getRangeModifiers(weaponProfile).length ? (
                                          <div className="range-track" aria-label={`Modificadores de alcance: ${weaponProfile.rangeModifiers}`}>
                                            {getRangeModifiers(weaponProfile).map((value, rangeIndex) => {
                                              const tone = value === '0' ? 'neutral' : value.startsWith('+') ? 'positive' : value === '-3' ? 'short' : value === '-6' ? 'long' : 'unavailable';
                                              return <span className={`range-band ${tone}`} key={`${rangeIndex}-${value}`}>{getRangeModifierLabel(value)}</span>;
                                            })}
                                          </div>
                                        ) : (
                                          <div className="range-blank" aria-label="Sin perfil de alcance" />
                                        )}
                                        <span className="weapon-value">{weaponProfile.damage}</span>
                                        <span className="weapon-value">{weaponProfile.burst}</span>
                                        <span className="weapon-value">{weaponProfile.ammunition}</span>
                                        <span className="weapon-value">{weaponProfile.saveAttribute}</span>
                                        <span className="weapon-value">{weaponProfile.saves}</span>
                                      </div>
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
                  </li>
                );
              })}
                  </ol>
                </li>
              ))}
            </ol>
          ) : (
            <p className="collection-empty">Selecciona un perfil del catálogo para añadirlo aquí.</p>
          )}
        </section>

      </div>
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
      {pendingImport && (
        <div
          className="dialog-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) discardPendingImport();
          }}
        >
          <section
            className="confirm-dialog import-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="import-dialog-title"
            aria-describedby="import-dialog-description"
          >
            <div className="dialog-eyebrow">CONFIRMAR IMPORTACIÓN</div>
            <h2 id="import-dialog-title">¿Añadir esta lista?</h2>
            <p id="import-dialog-description">
              {pendingImport.format === 'infinity-army' ? 'Lista exportada de Infinity Army' : 'Lista de perfiles'} · proyecto «{activeProject?.name ?? 'actual'}».
            </p>
            <div className="import-count-summary">
              <p className="import-count-valid">
                <strong>{pendingResolvedCount}</strong>
                <span>{pendingResolvedCount === 1 ? 'unidad validada' : 'unidades validadas'}</span>
              </p>
              {pendingUnresolvedCount > 0 && (
                <p className="import-count-unresolved">
                  <strong>{pendingUnresolvedCount}</strong>
                  <span>{pendingUnresolvedCount === 1 ? 'unidad no validada' : 'unidades no validadas'}</span>
                </p>
              )}
            </div>
            {pendingUnresolvedCount > 0 && (
              <p className="import-unresolved-note">
                Las unidades no validadas no se añadirán; tendrás que añadirlas manualmente desde el catálogo.
              </p>
            )}
            <div className="dialog-actions">
              <button
                ref={discardImportButtonRef}
                className="action-button"
                type="button"
                onClick={discardPendingImport}
              >
                Descartar
              </button>
              <button className="action-button primary" type="button" onClick={acceptPendingImport}>
                Aceptar e importar
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
