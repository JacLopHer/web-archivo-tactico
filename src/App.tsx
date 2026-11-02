import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import catalogData from './data/legacyJsaCatalog.json';
import { extraFactionsCatalog } from './data/extraCatalogs';
import factionDirectoryData from './data/factionDirectory.json';
import weaponProfilesData from './data/weaponProfiles.json';
import { createWeaponIndex, getProfileWeapons, getRangeModifierLabel, getRangeModifiers } from './domain/weaponProfiles.mjs';
import { PRINT_LAYOUTS, buildDuplexSheets, getCellSizeMm, isCardOverflowing, paginateEntries } from './domain/printLayout.mjs';
import type { DuplexFlipEdge, DuplexSlot, PrintLayoutName } from './domain/printLayout.mjs';
import { assertValidTroopClass, getTroopClassLabel, getTroopClassShortLabel } from './domain/troopClasses.mjs';
import { parseListImport } from './domain/listImport.mjs';
import { getCardRules, getUnitCardTags } from './domain/unitCardInfo.mjs';
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
import type { FactionDirectory, JsaCatalog, TroopProfile, WeaponProfilesCatalog } from './types/catalog';
import type { TroopClass } from './domain/troopClasses.mjs';
import type { ImportedProfileLine } from './domain/listImport.mjs';
import type { ProjectStore } from './domain/projects.mjs';

const jsaCatalog = catalogData as JsaCatalog;
const catalog = {
  ...jsaCatalog,
  factions: [jsaCatalog.faction, ...extraFactionsCatalog.factions],
  units: [...jsaCatalog.units, ...extraFactionsCatalog.units],
  sectorials: [...jsaCatalog.sectorials, ...extraFactionsCatalog.sectorials],
  troopClassGroups: [...jsaCatalog.troopClassGroups, ...extraFactionsCatalog.troopClassGroups]
    .reduce<Array<{ troopClass: TroopClass; unitIds: string[] }>>((groups, group) => {
      const current = groups.find((candidate) => candidate.troopClass === group.troopClass);
      if (current) current.unitIds.push(...group.unitIds.filter((id) => !current.unitIds.includes(id)));
      else groups.push({ troopClass: group.troopClass, unitIds: [...group.unitIds] });
      return groups;
    }, []),
};
const factionDirectory = factionDirectoryData as FactionDirectory;
for (const unit of catalog.units) assertValidTroopClass(unit.name, unit.troopClass);
const weaponProfiles = weaponProfilesData as WeaponProfilesCatalog;
const existingWeaponIndex = createWeaponIndex(weaponProfiles.profiles);
const supplementalWeaponProfiles = (extraFactionsCatalog.weapons ?? []).filter((weapon) =>
  !existingWeaponIndex.has(weapon.name)
  && !(weapon.aliases ?? []).some((alias) => existingWeaponIndex.has(alias)),
);
const allCatalogProfiles: TroopProfile[] = catalog.units.flatMap((unit) =>
  unit.profiles.map((profile) => ({
    id: profile.id,
    name: profile.armyName,
    variantName: profile.name,
    unitId: unit.id,
    unitName: unit.name,
    unitOfficialName: unit.officialName,
    unitRosterName: unit.rosterName,
    troopType: unit.troopType,
    troopClass: unit.troopClass,
    troopClassSource: unit.troopClassSource,
    troopClassVerificationStatus: unit.troopClassVerificationStatus,
    stats: unit.stats,
    woundsLabel: unit.woundsLabel,
    sharedSpecialRules: unit.sharedSpecialRules,
    additionalSpecialRules: profile.specialRules,
    rangedEquipment: profile.rangedEquipment,
    meleeEquipment: profile.meleeEquipment,
    cap: profile.cap,
    points: profile.points,
    factionId: unit.factionId,
    sectorialIds: profile.sectorialIds ?? unit.sectorialIds,
    edition: unit.edition,
    source: unit.source,
    verificationStatus: profile.verificationStatus ?? unit.verificationStatus,
    verificationNote: profile.verificationNote,
    characteristics: unit.characteristics,
    orders: profile.orders,
    availabilityBySectorial: unit.availabilityBySectorial,
    characteristicsBySectorial: unit.characteristicsBySectorial,
    importNames: profile.importNames,
    disabled: profile.disabled,
    iconPath: unit.iconPath,
    iconPathsBySectorial: profile.iconPathsBySectorial,
    skillsAndEquipment: [...unit.sharedSpecialRules, ...profile.specialRules, ...(unit.characteristics ?? [])].join(' · '),
  })),
);
const catalogProfiles = allCatalogProfiles.filter((profile) => !profile.disabled);
const weaponIndex = createWeaponIndex([...weaponProfiles.profiles, ...supplementalWeaponProfiles]);
const rangeBands = ['0', '20', '40', '60', '80', '100', '120', '240'];

const ORDER_ICON_FILES: Record<string, string> = {
  REGULAR: 'regular',
  IRREGULAR: 'irregular',
  IMPETUOUS: 'impetuous',
  LIEUTENANT: 'lieutenant',
  TACTICAL: 'tactical',
  HACKABLE: 'hackable',
};
const PROPERTY_ACRONYMS = /(?<![\p{L}\d])(cc|cd|fís|da|ap|pb|bli|exp|ps|bts|arm)(?![\p{L}\d])/giu;

const sentenceCase = (text: string) => text
  .toLocaleLowerCase('es')
  .replace(/(^|[,:·]\s*)(\p{L})/gu, (_, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase('es')}`)
  .replace(PROPERTY_ACRONYMS, (token) => token.toLocaleUpperCase('es'));

// Iconos oficiales de Infinity Army (assets.corvusbelli.net/army/img/icon), guardados como PNG pequeños en public/orders.
const cardGlyphSrc = (type: string) => `${import.meta.env.BASE_URL}orders/${ORDER_ICON_FILES[type]}.png`;
const MINIATURE_STORAGE_KEY = 'infinity-datacards-miniatures';
const MINIATURE_MAX_SIDE = 480;
const loadMiniatures = (): Record<string, string> => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MINIATURE_STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};
const readMiniatureFile = (file: File) => new Promise<string>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(1, MINIATURE_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL('image/webp', 0.9));
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('No se pudo leer la imagen.'));
  };
  image.src = url;
});

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
const duplexStatLabels = [...statLabels.slice(0, 8), statLabels[9], statLabels[8]];

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
  'TURTLEMEK': 'turtlemek-ancillary-remote-unit',
  'METSUKE': 'metsuke-officers',
  'SĀCHĀ': 'sacha-xenotech-hunters',
  'RUBY MONDAY': 'kazuraba-ruby-monday',
  'KOBARUTO': 'kobaruto-hojo-bot',
};

const factionLogoPath = (factionId: string) => {
  const slug = factionDirectory.logos.factions[factionId];
  return slug
    ? factionDirectory.logos.assets[slug]?.path ?? 'units/factions/generic.svg'
    : 'units/factions/generic.svg';
};
const sectorialLogoPath = (sectorialId: string, factionId: string) => {
  const slug = factionDirectory.logos.sectorials[sectorialId];
  return slug
    ? factionDirectory.logos.assets[slug]?.path ?? factionLogoPath(factionId)
    : factionLogoPath(factionId);
};
const genericSectorialId = (factionId: string) => factionId === 'jsa' ? 'jsa-vanilla' : `${factionId}-generic`;

interface LogoSelectOption {
  value: string;
  label: string;
  iconPath: string;
  disabled?: boolean;
}

function LogoSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: LogoSelectOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  const openMenu = () => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  };
  const moveActiveOption = (startIndex: number, direction: 1 | -1) => {
    for (let offset = 1; offset <= options.length; offset += 1) {
      const index = (startIndex + direction * offset + options.length) % options.length;
      if (!options[index].disabled) {
        setActiveIndex(index);
        return;
      }
    }
  };
  const handleOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveOption(activeIndex, event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const indexes = options.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
      if (indexes.length) setActiveIndex(event.key === 'Home' ? indexes[0] : indexes[indexes.length - 1]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div
      className="select-control"
      onBlur={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <span>{label}</span>
      <div className="logo-select" ref={rootRef}>
        <button
          ref={triggerRef}
          className="logo-select-trigger"
          type="button"
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) openMenu();
            }
          }}
        >
          <img src={`${import.meta.env.BASE_URL}${selectedOption.iconPath}`} alt="" aria-hidden="true" />
          <span>{selectedOption.label}</span>
          <span className="logo-select-chevron" aria-hidden="true">▾</span>
        </button>
        {open && (
          <div
            className="logo-select-options"
            id={listboxId}
            role="listbox"
            aria-label={label}
            onKeyDown={(event) => {
              if (event.target === event.currentTarget && event.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.focus();
              }
            }}
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                ref={(element) => { optionRefs.current[index] = element; }}
                id={`${listboxId}-option-${index}`}
                className="logo-select-option"
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                tabIndex={activeIndex === index ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={handleOptionKeyDown}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <img src={`${import.meta.env.BASE_URL}${option.iconPath}`} alt="" aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const unitIconPath = (name: string, iconPath?: string) => {
  if (iconPath) return iconPath;
  const iconSlug = unitIconSlugByName[name];
  return iconSlug
    ? `units/icons/${iconSlug}.svg`
    : `units/icons/${unitSlug(name)}.png`;
};
const unitIconKey = (id: string, name: string, sectorialId = '') => `i:${id || unitSlug(name)}:${sectorialId}`;

function App() {
  const [query, setQuery] = useState('');
  const [selectedTroopClass, setSelectedTroopClass] = useState<TroopClass | ''>('');
  const [selectedId, setSelectedId] = useState(catalogProfiles[0]?.id ?? '');
  const [selectedUnitId, setSelectedUnitId] = useState(catalog.units[0]?.id ?? '');
  const [selectedFactionId, setSelectedFactionId] = useState(jsaCatalog.faction.id);
  const [selectedSectorial, setSelectedSectorial] = useState(genericSectorialId(jsaCatalog.faction.id));
  const [pendingImport, setPendingImport] = useState<{
    format: 'infinity-army' | 'profile-list';
    resolved: Array<ImportedProfileLine & { id: string }>;
    unresolved: Array<ImportedProfileLine & { id: string }>;
  } | null>(null);
  const [pageBreakMode, setPageBreakMode] = useState<'automatic' | 'group' | 'card'>('automatic');
  const [printLayout, setPrintLayout] = useState<PrintLayoutName>('duplex');
  const [duplexFlipEdge, setDuplexFlipEdge] = useState<DuplexFlipEdge>('long');
  const [duplexOverflow, setDuplexOverflow] = useState<string[]>([]);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());
  const markImageBroken = (key: string) => setBrokenImages((current) => (current.has(key) ? current : new Set(current).add(key)));
  const [miniatures, setMiniatures] = useState<Record<string, string>>(loadMiniatures);
  const [miniatureError, setMiniatureError] = useState('');
  const updateMiniatures = (next: Record<string, string>) => {
    try {
      window.localStorage.setItem(MINIATURE_STORAGE_KEY, JSON.stringify(next));
      setMiniatureError('');
    } catch {
      setMiniatureError('No hay espacio en el navegador para guardar la miniatura; prueba con una imagen más pequeña.');
      return;
    }
    setMiniatures(next);
  };
  const handleMiniatureFile = async (unitId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      updateMiniatures({ ...miniatures, [unitId]: await readMiniatureFile(file) });
    } catch (error) {
      setMiniatureError(error instanceof Error ? error.message : 'No se pudo cargar la imagen.');
    }
  };
  const removeMiniature = (unitId: string) => {
    const { [unitId]: _removed, ...rest } = miniatures;
    updateMiniatures(rest);
  };
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
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
  const selectedFaction = catalog.factions.find((faction) => faction.id === selectedFactionId) ?? jsaCatalog.faction;
  const factionSectorials = catalog.sectorials.filter((sectorial) => sectorial.factionId === selectedFactionId
    || (!sectorial.factionId && selectedFactionId === jsaCatalog.faction.id));
  const pendingResolvedCount = pendingImport?.resolved.length ?? 0;
  const pendingUnresolvedCount = pendingImport?.unresolved.length ?? 0;
  const collectionEntries = collection.map((item, index) => {
    const profile = allCatalogProfiles.find((candidate) => candidate.id === item.profileId);
    return {
      item,
      index,
      profile,
      startsGroup: Boolean(index > 0 && item.groupName && item.groupName !== collection[index - 1]?.groupName),
    };
  }).filter((entry): entry is typeof entry & { profile: TroopProfile } => Boolean(entry.profile));
  const printGrid = PRINT_LAYOUTS[printLayout];
  const previewPages = useMemo(
    () => paginateEntries(collectionEntries, printGrid.cols * printGrid.rows, pageBreakMode),
    [collectionEntries, pageBreakMode, printGrid],
  );
  const duplexSheets = useMemo(
    () => (printLayout === 'duplex' ? buildDuplexSheets(collectionEntries, duplexFlipEdge, pageBreakMode) : []),
    [collectionEntries, duplexFlipEdge, pageBreakMode, printLayout],
  );

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
      const matchesFaction = profile.factionId === selectedFactionId;
      const matchesQuery =
        !normalizedQuery ||
        `${profile.name} ${profile.unitName} ${profile.unitOfficialName ?? ''} ${profile.unitRosterName ?? ''} ${profile.variantName} ${profile.troopType} ${getTroopClassLabel(profile.troopClass)} ${profile.rangedEquipment} ${profile.meleeEquipment}`
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
          .includes(normalizedQuery);
      const matchesSectorial = !sectorial || (profile.sectorialIds
        ? profile.sectorialIds.includes(selectedSectorial)
        : sectorial.unitIds.includes(profile.unitId));
      const matchesTroopClass = !selectedTroopClass || profile.troopClass === selectedTroopClass;
      return matchesFaction && matchesQuery && matchesSectorial && matchesTroopClass;
    }).map((profile) => {
      if (!selectedSectorial || !profile.availabilityBySectorial?.[selectedSectorial]) return profile;
      return {
        ...profile,
        stats: { ...profile.stats, availability: profile.availabilityBySectorial[selectedSectorial] },
        characteristics: profile.characteristicsBySectorial?.[selectedSectorial] ?? profile.characteristics,
        skillsAndEquipment: [
          ...profile.sharedSpecialRules,
          ...profile.additionalSpecialRules,
          ...(profile.characteristicsBySectorial?.[selectedSectorial] ?? profile.characteristics ?? []),
        ].join(' · '),
      };
    });
  }, [query, selectedFactionId, selectedSectorial, selectedTroopClass]);

  const filteredUnits = catalog.units.filter((unit) => unit.factionId === selectedFactionId
    && filteredProfiles.some((profile) => profile.unitId === unit.id));
  const unitProfiles = filteredProfiles.filter((profile) => profile.unitId === selectedUnitId);
  const showClassPicker = !selectedTroopClass && !query.trim();
  const classPickerGroups = catalog.troopClassGroups
    .map((group) => ({
      troopClass: group.troopClass,
      unitCount: group.unitIds.filter((unitId) => filteredUnits.some((unit) => unit.id === unitId)).length,
    }))
    .filter((group) => group.unitCount > 0);

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

  const selectFaction = (value: string) => {
    const sectorialId = genericSectorialId(value);
    const sectorial = catalog.sectorials.find((item) => item.id === sectorialId);
    setSelectedFactionId(value);
    setSelectedSectorial(sectorialId);
    setSelectedTroopClass('');
    setQuery('');
    const firstProfile = catalogProfiles.find((profile) => profile.factionId === value
      && (profile.sectorialIds
        ? profile.sectorialIds.includes(sectorialId)
        : sectorial?.unitIds.includes(profile.unitId)));
    setSelectedUnitId(firstProfile?.unitId ?? '');
    setSelectedId(firstProfile?.id ?? '');
  };

  const selectSectorial = (value: string) => {
    setSelectedSectorial(value);
    if (!value) return;
    const sectorial = factionSectorials.find((item) => item.id === value);
    if (sectorial && !sectorial.unitIds.includes(selectedUnitId)) {
      const firstProfile = catalogProfiles.find((profile) => profile.factionId === selectedFactionId
        && (profile.sectorialIds
          ? profile.sectorialIds.includes(value)
          : sectorial.unitIds.includes(profile.unitId)));
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

      const parsed = parseListImport(clipboardText, allCatalogProfiles);
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
    const list = collectionListRef.current;
    if (!printPreviewOpen || !list) return;
    if (printLayout === 'duplex') {
      // Las tarjetas dúplex no se reducen: se mide cada cara y se avisa si su contenido no cabe.
      const checkOverflow = () => {
        const overflowing = Array.from(list.querySelectorAll<HTMLElement>('.duplex-card'))
          .filter((card) => isCardOverflowing(card))
          .map((card) => card.dataset.duplexKey ?? '');
        setDuplexOverflow((current) => (current.join('|') === overflowing.join('|') ? current : overflowing));
      };
      checkOverflow();
      list.addEventListener('load', checkOverflow, true);
      void document.fonts?.ready.then(checkOverflow);
      return () => list.removeEventListener('load', checkOverflow, true);
    }
    const mmPerPixel = 25.4 / 96;
    const { width: cellWidth, height: cellHeight } = getCellSizeMm(printGrid);
    const cellHeightPx = cellHeight / mmPerPixel;
    // Cada ficha se escala por separado hasta caber en su celda (máx. 1), así una ficha larga no reduce las demás.
    // Con zoom la ficha se maqueta más ancha al reducirse, así que se reajusta hasta que quepa.
    const fitCards = () => {
      list.querySelectorAll<HTMLElement>('.collection-print-card').forEach((card) => {
        const applyScale = (scale: number) => {
          card.style.setProperty('--compact-card-scale', String(scale));
          card.style.width = `${cellWidth / scale / mmPerPixel}px`;
          card.style.minHeight = `${cellHeightPx / scale}px`;
        };
        const height = () => card.getBoundingClientRect().height;
        let scale = 1;
        applyScale(scale);
        for (let attempt = 0; attempt < 12 && height() > cellHeightPx + 0.5; attempt += 1) {
          scale = Math.max(0.2, scale * ((cellHeightPx - 3) / height()));
          applyScale(scale);
        }
      });
    };
    fitCards();
    // Las miniaturas y las fuentes cargan después y cambian la altura de las fichas.
    list.addEventListener('load', fitCards, true);
    void document.fonts?.ready.then(fitCards);
    return () => list.removeEventListener('load', fitCards, true);
  }, [brokenImages, collection, duplexFlipEdge, pageBreakMode, printGrid, printLayout, printPreviewOpen]);

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
        allCatalogProfiles.map((profile) => profile.id),
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

  type DuplexEntry = DuplexSlot<(typeof collectionEntries)[number]>;
  const renderDuplexCard = (slot: DuplexEntry, face: 'front' | 'back') => {
    const key = `${slot.sheet}-${face}-${slot.slot + 1}`;
    if (!slot.entry) {
      return <div className="duplex-card duplex-card-empty" key={key} data-duplex-key={key} aria-hidden="true" />;
    }
    const { item, profile } = slot.entry;
    if (face === 'front') {
      const tags = getUnitCardTags(profile);
      const miniature = miniatures[profile.unitId];
      const sectorialId = profile.sectorialIds.includes(selectedSectorial) ? selectedSectorial : profile.sectorialIds[0];
      const iconKey = unitIconKey(profile.unitId, profile.unitName, sectorialId ?? selectedSectorial);
      const rules = getCardRules(profile) || 'No registrado en la fuente heredada.';
      return (
        <article className="duplex-card duplex-front" key={key} data-duplex-key={key} data-duplex-pair={`${slot.sheet}-${slot.position}`} data-collection-id={item.id}>
          <img className="duplex-watermark" src={`${import.meta.env.BASE_URL}${factionLogoPath(profile.factionId)}`} alt="" aria-hidden="true" />
          <div className="duplex-left">
            <div className="duplex-icon" aria-hidden="true">
              <span>{profile.unitName.slice(0, 1)}</span>
              {!brokenImages.has(iconKey) && (
                <img
                  src={`${import.meta.env.BASE_URL}${unitIconPath(
                    profile.unitName,
                    profile.iconPathsBySectorial?.[sectorialId ?? selectedSectorial] ?? profile.iconPath,
                  )}`}
                  alt=""
                  onError={() => markImageBroken(iconKey)}
                />
              )}
            </div>
            {(tags.orders.length > 0 || tags.hackable || profile.troopClass) && (
              <div className="duplex-tags" aria-label="Clase de tropa, órdenes y características">
                <strong className="duplex-troop" title={getTroopClassLabel(profile.troopClass)}>{getTroopClassShortLabel(profile.troopClass)}</strong>
                {tags.orders.map((order) => (
                  <span className="duplex-glyph" key={order.type} title={order.label}>
                    <img src={cardGlyphSrc(order.type)} alt={order.label} />
                    {order.count > 1 && <em>{order.count}</em>}
                  </span>
                ))}
                {tags.hackable && <span className="duplex-glyph" title="Hackeable"><img src={cardGlyphSrc('HACKABLE')} alt="Hackeable" /></span>}
              </div>
            )}
            {miniature && <img className="duplex-mini" src={miniature} alt={`Miniatura de ${profile.unitName}`} />}
            <div className="duplex-mini-actions">
              <label title={miniature ? 'Cambiar miniatura' : 'Subir miniatura'}>
                <input type="file" accept="image/*" onChange={(event) => handleMiniatureFile(profile.unitId, event)} />
                {miniature ? 'Cambiar' : 'Subir miniatura'}
              </label>
              {miniature && <button type="button" onClick={() => removeMiniature(profile.unitId)}>Quitar</button>}
            </div>
          </div>
          <p className="duplex-isc">{profile.unitOfficialName ? `ISC: ${profile.unitOfficialName}` : ''}</p>
          <header className="duplex-header">
            <strong>{profile.unitName}</strong>
          </header>
          <div className="duplex-stats">
            {duplexStatLabels.map(([statKey, label]) => (
              <div key={statKey}>
                <span>{statKey === 'wounds' ? profile.woundsLabel : label}</span>
                <strong>{profile.stats[statKey]}</strong>
              </div>
            ))}
          </div>
          <div className="duplex-skills">
            <strong>Habilidades Esp. y Equipo</strong>
            <p>{rules}</p>
          </div>
          <div className="duplex-gear">
            <div className="duplex-gear-box duplex-gear-ranged"><strong>Armamento | Equipo | Periféricos</strong><p>{profile.rangedEquipment || '—'}</p></div>
            <div className="duplex-gear-box duplex-gear-melee"><strong>Armas melé</strong><p>{profile.meleeEquipment || '—'}</p></div>
            <div className="duplex-gear-box duplex-gear-small"><strong>CAP</strong><p>{profile.cap}</p></div>
            <div className="duplex-gear-box duplex-gear-small"><strong>C</strong><p>{profile.points}</p></div>
          </div>
        </article>
      );
    }
    const weapons = getProfileWeapons(profile, weaponIndex);
    return (
      <article className="duplex-card duplex-back" key={key} data-duplex-key={key} data-duplex-pair={`${slot.sheet}-${slot.position}`} data-collection-id={item.id}>
        <header className="duplex-back-header">
          <strong>{profile.unitName}</strong>
        </header>
        <div className="duplex-weapon-table">
          <div className="duplex-weapon-head">
            <span>NOMBRE</span>
            <span className="duplex-head-range">DISTANCIA</span>
            <span>PS</span><span>R</span><span>MUN.</span><span>TS: ATR</span><span>Nº</span>
            <span>PROPIEDADES</span>
          </div>
          <div className="duplex-distance-head" aria-label="Distancias en centímetros">
            <span />
            {rangeBands.slice(1).map((range) => <span key={range}>{range}</span>)}
          </div>
          <div className="duplex-weapon-rows">
            {weapons.length === 0 && <p className="duplex-note">Sin armamento registrado en la fuente consultada.</p>}
            {weapons.map(({ name, profile: weaponProfile, modifier, equipment: isEquipment }, weaponPosition) => {
              if (!weaponProfile) {
                return (
                  <div className="duplex-weapon duplex-weapon-wide" key={`${name}-${weaponPosition}`}>
                    <strong>{name}</strong>
                    <span>{isEquipment ? 'Equipo' : 'Sin ficha de arma coincidente; no se muestran valores inferidos.'}</span>
                  </div>
                );
              }
              const rangeGroups: Array<{ value: string; span: number }> = [];
              getRangeModifiers(weaponProfile).forEach((value) => {
                const last = rangeGroups[rangeGroups.length - 1];
                if (last && last.value === value) last.span += 1;
                else rangeGroups.push({ value, span: 1 });
              });
              return (
                <div className="duplex-weapon" key={`${name}-${weaponPosition}`}>
                  <span className="duplex-weapon-name">
                    {name}
                    {modifier && !name.includes(modifier) && ` (${modifier})`}
                  </span>
                  {weaponProfile.rangeNote ? (
                    <span className="duplex-range-note">{weaponProfile.rangeNote}</span>
                  ) : (
                    <span className="duplex-range">
                      {rangeGroups.map(({ value, span }, groupIndex) => {
                        const tone = value === '0' ? 'neutral' : value.startsWith('+') ? 'positive' : value === '-3' ? 'short' : value === '-6' ? 'long' : 'unavailable';
                        return (
                          <span className={`range-band ${tone}`} key={`${groupIndex}-${value}`} style={{ gridColumn: `span ${span}` }}>
                            {getRangeModifierLabel(value)}
                          </span>
                        );
                      })}
                    </span>
                  )}
                  <span>{weaponProfile.damage}</span>
                  <span>{weaponProfile.burst}</span>
                  <span>{weaponProfile.ammunition}</span>
                  <span>{weaponProfile.saveAttribute}</span>
                  <span>{weaponProfile.saves}</span>
                  <span className="duplex-weapon-props">
                    {sentenceCase([
                      weaponProfile.properties,
                      weaponProfile.verificationStatus === 'incomplete'
                        ? `Dato pendiente: ${weaponProfile.verificationNote ?? 'información incompleta en Infinity Army.'}`
                        : '',
                    ].filter(Boolean).join(' · '))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>      </article>
    );
  };

  return (
    <main className={`app-shell print-layout-${printLayout}${printPreviewOpen ? ` print-preview-open print-preview-a4` : ''}`}>
      <header className="topbar">
        <div className="header-identity">
          <a className="brand" href="#" aria-label="Infinity Datacards, inicio">
            <span className="brand-mark">∞</span>
            <span>
              <strong>INFINITY</strong>
              <small>DATACARDS</small>
            </span>
          </a>
          <img
            className="header-faction-logo"
            src={`${import.meta.env.BASE_URL}${factionLogoPath(selectedFactionId)}`}
            alt=""
            aria-hidden="true"
          />
          <div className="header-copy">
            <span className="eyebrow">ARCHIVO TÁCTICO · FASE 01</span>
            <h1>Tu fuerza, <span>ficha a ficha.</span></h1>
            <p>Consulta perfiles de JSA y de los ejércitos genéricos de Infinity N5 con sus sectoriales, y prepara tus próximas listas.</p>
          </div>
        </div>
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
          <span
            className={`persistence-indicator${persistenceError ? ' is-error' : ''}`}
            role="status"
            title={persistenceError || persistenceMessage}
            aria-label={persistenceError ? `Error de guardado: ${persistenceError}` : persistenceMessage}
          >
            <span className="persistence-dot" />
            {persistenceError ? 'Error' : !projectsHydrated ? 'Cargando' : projectsDirty ? 'Guardando' : 'Guardado'}
          </span>
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
          <div className="list-import panel-surface" aria-labelledby="import-title">
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
          </div>
        </div>
        {clipboardFeedback && (
          <p className={`clipboard-feedback${clipboardFeedback.isError ? ' is-error' : ''}`} role="status">
            {clipboardFeedback.message}
          </p>
        )}
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
        <LogoSelect
          label="Facción"
          value={selectedFactionId}
          options={catalog.factions.map((faction) => ({
            value: faction.id,
            label: faction.name,
            iconPath: factionLogoPath(faction.id),
          }))}
          onChange={selectFaction}
        />
        <LogoSelect
          label="Sectorial"
          value={selectedSectorial}
          options={factionSectorials.map((sectorial) => ({
              value: sectorial.id,
              label: `${sectorial.id === genericSectorialId(selectedFactionId)
                && !/\bgen[eé]rica\b/i.test(sectorial.name) ? `${sectorial.name} (genérica)` : sectorial.name}${sectorial.verificationStatus === 'unmapped' ? ' · datos pendientes' : ''}${sectorial.verificationStatus === 'unit-level' ? ' · por unidad' : ''}`,
              iconPath: sectorialLogoPath(sectorial.id, selectedFactionId),
              disabled: sectorial.verificationStatus === 'unmapped',
            }))}
          onChange={selectSectorial}
        />
      </section>

      <div className="workspace">
        <section className="roster-panel catalog-families" aria-label="Unidades del catálogo">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{selectedFaction.name.toLocaleUpperCase()}</span>
              <h2>Unidades</h2>
              <small className="profile-list-hint">
                {showClassPicker ? 'Elige una clase de tropa o busca por nombre' : 'Selecciona una unidad para ver sus perfiles'}
              </small>
            </div>
            <span className="result-count">{showClassPicker ? classPickerGroups.length : filteredUnits.length}</span>
          </div>
          <label className="search-control unit-search">
            <span>Buscar unidad, perfil o armamento</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. Ninja, Domaru, Spitfire…"
            />
          </label>
          {selectedTroopClass && (
            <div className="troop-class-current" data-troop-class={selectedTroopClass}>
              <button type="button" className="troop-class-back" onClick={() => setSelectedTroopClass('')}>← Clases</button>
              <span className="troop-class-badge">{getTroopClassShortLabel(selectedTroopClass)}</span>
              <strong>{getTroopClassLabel(selectedTroopClass)}</strong>
            </div>
          )}
          <div className="profile-list family-list">
            {showClassPicker && classPickerGroups.map((group) => (
              <button
                className="profile-option family-option troop-class-option"
                data-troop-class={group.troopClass}
                key={group.troopClass}
                onClick={() => setSelectedTroopClass(group.troopClass)}
                type="button"
              >
                <span className="troop-class-badge">{getTroopClassShortLabel(group.troopClass)}</span>
                <span className="profile-summary"><strong>{getTroopClassLabel(group.troopClass).replace(/^\S+ — /, '')}</strong></span>
                <span className="family-variant-count">{group.unitCount} {group.unitCount === 1 ? 'unidad' : 'unidades'}</span>
              </button>
            ))}
            {!showClassPicker && filteredUnits.map((unit) => {
              const profileCount = filteredProfiles.filter((profile) => profile.unitId === unit.id).length;
              return (
              <button
                className={`profile-option family-option ${selectedUnitId === unit.id ? 'is-selected' : ''}`}
                key={unit.id}
                onClick={() => selectUnit(unit.id)}
                type="button"
              >
                        {!brokenImages.has(unitIconKey(unit.id, unit.name, selectedSectorial)) && (
                          <img
                            className="family-option-icon"
                            src={`${import.meta.env.BASE_URL}${unitIconPath(
                              unit.name,
                              unit.iconPathsBySectorial?.[selectedSectorial] ?? unit.iconPath,
                            )}`}
                            alt=""
                            aria-hidden="true"
                            onError={() => markImageBroken(unitIconKey(unit.id, unit.name, selectedSectorial))}
                          />
                        )}
                        <span className="profile-summary"><strong>{unit.name}</strong></span>
                        <span className="family-variant-count">{profileCount} {profileCount === 1 ? 'perfil' : 'perfiles'}</span>
                      </button>
              );
            })}
            {!showClassPicker && filteredProfiles.length === 0 && (
              <div className="empty-state">No hay perfiles que coincidan con esa búsqueda.</div>
            )}
          </div>
        </section>

        <section className="roster-panel catalog-variants" aria-label={`Perfiles de ${selectedUnit?.name || 'la unidad seleccionada'}`}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PERFILES DISPONIBLES</span>
              <div className="variants-title">
                {selectedUnit && !brokenImages.has(unitIconKey(selectedUnit.id, selectedUnit.name, selectedSectorial)) && (
                  <img
                    className="variants-unit-icon"
                    src={`${import.meta.env.BASE_URL}${unitIconPath(
                      selectedUnit.name,
                      selectedUnit.iconPathsBySectorial?.[selectedSectorial] ?? selectedUnit.iconPath,
                    )}`}
                    alt=""
                    aria-hidden="true"
                    onError={() => markImageBroken(unitIconKey(selectedUnit.id, selectedUnit.name, selectedSectorial))}
                  />
                )}
                <h2>{selectedUnit?.name || 'Selecciona una unidad'}</h2>
              </div>
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
          {unitProfiles[0]?.characteristics?.length ? (
            <div className="unit-shared-rules">
              <strong>CARACTERÍSTICAS</strong>
              <span>{unitProfiles[0].characteristics.join(' · ')}</span>
            </div>
          ) : null}
          {selectedUnit && selectedUnit.baseProfileVariants && selectedUnit.baseProfileVariants.length > 1 && (
            <details className="unit-shared-rules base-profile-details">
              <summary>PERFILES BASE DE INFINITY ARMY ({selectedUnit.baseProfileVariants.length})</summary>
              <span className="base-profile-note">
                La fuente no vincula cada estado base con una opción de equipo; se muestran por separado sin inferir asociaciones.
              </span>
              {selectedUnit.baseProfileVariants.map((baseProfile) => (
                <div className="base-profile-row" key={baseProfile.id}>
                  <strong>{baseProfile.name} · {getTroopClassShortLabel(baseProfile.troopClass)}</strong>
                  <span>
                    MOV {baseProfile.stats.movement} · CC {baseProfile.stats.cc} · CD {baseProfile.stats.bs} ·
                    FIS {baseProfile.stats.physical} · VOL {baseProfile.stats.willpower} · BLI {baseProfile.stats.armor} ·
                    PB {baseProfile.stats.bts} · {baseProfile.woundsLabel} {baseProfile.stats.wounds} · S {baseProfile.stats.silhouette}
                  </span>
                  {baseProfile.specialRules.length > 0 && <span>{baseProfile.specialRules.join(' · ')}</span>}
                  {baseProfile.weapons.length > 0 && <span>Armamento: {baseProfile.weapons.join(', ')}</span>}
                </div>
              ))}
            </details>
          )}
          <div className="profile-list variant-list">
            {unitProfiles.map((profile) => {
              const equipmentLabel = [profile.rangedEquipment, profile.meleeEquipment].filter(Boolean).join(' · ');
              const showEquipment = !equipmentLabel
                || equipmentLabel.trim().toLocaleLowerCase() !== profile.variantName.trim().toLocaleLowerCase();
              const isFtoProfile = profile.name.includes(' FTO');
              return (
              <div className={`variant-option${selectedId === profile.id ? ' is-selected' : ''}`} key={profile.id}>
                <button
                  className="variant-option-main"
                  type="button"
                  title="Doble clic para añadir a la lista"
                  onClick={() => setSelectedId(profile.id)}
                  onDoubleClick={() => {
                    setSelectedId(profile.id);
                    addProfilesToCollection([{ profileId: profile.id }]);
                  }}
                >
                  <span className="variant-profile-title">
                    <strong>{profile.variantName}</strong>
                    {isFtoProfile && <span className="variant-origin-badge" title="Perfil de Fireteam Option">FTO</span>}
                  </span>
                  {showEquipment && <span>{equipmentLabel || 'Sin armamento registrado'}</span>}
                  <span className="catalog-troop-class">
                    Clase de tropa: {getTroopClassShortLabel(profile.troopClass)}
                  </span>
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
          <style>{`@page { size: A4 portrait; margin: ${printGrid.marginMm}mm; } :root { --print-cols: ${printGrid.cols}; --print-rows: ${printGrid.rows}; --print-margin: ${printGrid.marginMm}mm; --print-gap: ${printGrid.gapMm}mm; }`}</style>
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
              {printLayout === 'duplex'
                ? `Tarjetas a doble cara: 10 posiciones por hoja A4 vertical (2 × 5, celdas de 99 × 57 mm). Cada hoja genera una página de anversos seguida de su página de reversos; imprímelas a doble cara con volteo por borde ${duplexFlipEdge === 'long' ? 'largo' : 'corto'}. Las tarjetas no se reducen: si un anverso o reverso no cabe, se avisa y la impresión queda bloqueada.`
                : printLayout === 'compact'
                ? 'Formato compacto: la ficha completa reducida en dos columnas por cinco filas, 10 por hoja A4 vertical. Cada grupo empieza en hoja nueva y los grupos de más de 10 se reparten.'
                : 'Formato detallado: 3 fichas por hoja A4 vertical, cada una en un tercio exacto de la página. Si una ficha ocupa menos, el resto del tercio queda vacío dentro de su marco; si ocupa más, se reduce. Cada grupo empieza en hoja nueva.'}
              {' '}El ajuste final puede variar ligeramente según el navegador y la impresora.
            </p>
          )}
          <div className="collection-controls">
            <label className="print-control">
              <span>Formato de impresión</span>
              <select
                value={printLayout}
                onChange={(event) => {
                  const value = event.target.value;
                  setPrintLayout(value === 'compact' || value === 'duplex' ? value : 'detailed');
                }}
              >
                <option value="compact">Compacto · 10 por hoja</option>
                <option value="detailed">Detallado · 3 por hoja</option>
                <option value="duplex">Tarjetas dúplex · 10 por hoja, anverso y reverso</option>
              </select>
            </label>
            {printLayout === 'duplex' && (
              <label className="print-control">
                <span>Borde de volteo</span>
                <select
                  value={duplexFlipEdge}
                  onChange={(event) => setDuplexFlipEdge(event.target.value === 'short' ? 'short' : 'long')}
                >
                  <option value="long">Borde largo</option>
                  <option value="short">Borde corto</option>
                </select>
              </label>
            )}
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
              disabled={!collection.length || (printPreviewOpen && printLayout === 'duplex' && duplexOverflow.length > 0)}
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
          {printPreviewOpen && printLayout === 'duplex' && duplexOverflow.length > 0 && (
            <p className="duplex-warning" role="alert">
              Impresión bloqueada: {duplexOverflow.length} {duplexOverflow.length === 1 ? 'cara no cabe' : 'caras no caben'} sin reducir el texto
              ({duplexOverflow.map((key) => key.replace(/^(\d+)-(front|back)-(\d+)$/, (_m, sheet, face, slot) => `hoja ${sheet} ${face === 'front' ? 'anverso' : 'reverso'} casilla ${slot}`)).join('; ')}).
              Quita armas o divide la unidad y vuelve a comprobar.
            </p>
          )}
          {printPreviewOpen && printLayout === 'duplex' && miniatureError && (
            <p className="duplex-warning" role="alert">{miniatureError}</p>
          )}
          {collection.length && printLayout === 'duplex' && printPreviewOpen ? (
            <ol className="collection-list print-preview-pages duplex-pages" ref={collectionListRef}>
              {duplexSheets.flatMap((sheet) => (['front', 'back'] as const).map((face) => (
                <li className="print-preview-page duplex-page" key={`${sheet.sheet}-${face}`} data-duplex-face={face} data-duplex-sheet={sheet.sheet}>
                  <div className="duplex-page-label">
                    Hoja {sheet.sheet} · {face === 'front' ? 'ANVERSOS' : 'REVERSOS'} (volteo por borde {duplexFlipEdge === 'long' ? 'largo' : 'corto'})
                  </div>
                  <div className="duplex-grid">
                    {sheet[face].map((slot) => renderDuplexCard(slot, face))}
                  </div>
                </li>
              )))}
            </ol>
          ) : collection.length ? (
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
                        {!brokenImages.has(unitIconKey(profile.unitId, profile.unitName, selectedSectorial)) && (
                          <img
                            className="collection-entry-icon"
                            src={`${import.meta.env.BASE_URL}${unitIconPath(
                              profile.unitName,
                              profile.iconPathsBySectorial?.[selectedSectorial] ?? profile.iconPath,
                            )}`}
                            alt=""
                            onError={() => markImageBroken(unitIconKey(profile.unitId, profile.unitName, selectedSectorial))}
                          />
                        )}
                        <strong>{profile.unitName}</strong>
                        <span className="collection-entry-class">{getTroopClassShortLabel(profile.troopClass)}</span>
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
                          aria-label={`Icono de ${profile.unitName} y logotipo de ${catalog.factions.find((faction) => faction.id === profile.factionId)?.name ?? profile.factionId}`}
                        >
                          <span>{profile.unitName.slice(0, 1)}</span>
                          <img
                            className="faction-logo-badge"
                            src={`${import.meta.env.BASE_URL}${sectorialLogoPath(
                              selectedSectorial && profile.sectorialIds.includes(selectedSectorial)
                                ? selectedSectorial
                                : profile.factionId,
                              profile.factionId,
                            )}`}
                            alt=""
                            aria-hidden="true"
                          />
                          {!brokenImages.has(unitIconKey(profile.unitId, profile.unitName, selectedSectorial)) && (
                            <img
                              className="unit-icon"
                              src={`${import.meta.env.BASE_URL}${unitIconPath(
                                profile.unitName,
                                profile.iconPathsBySectorial?.[selectedSectorial] ?? profile.iconPath,
                              )}`}
                              alt=""
                              onError={() => markImageBroken(unitIconKey(profile.unitId, profile.unitName, selectedSectorial))}
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
                              <span className="unit-class">{getTroopClassShortLabel(profile.troopClass)}</span>
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
                        <div className="skills-band-title">{profile.factionId === 'jsa' ? 'HABILIDADES ESP.' : 'HABILIDADES / EQUIPO'}</div>
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
                                {profileWeapons.map(({ name, category, profile: weaponProfile, modifier, equipment }, weaponPosition) => (
                                  <div className="weapon-entry" key={`${name}-${weaponPosition}`}>
                                    {weaponProfile ? (
                                      <div className="weapon-main-row">
                                        <div className="weapon-name-cell">
                                          <div className="weapon-name-line">
                                            <strong className="weapon-name">{name}</strong>
                                            <span className="weapon-category">{category}</span>
                                            {modifier && !name.includes(modifier) && <span className="weapon-modifier">({modifier})</span>}
                                          </div>
                                          {weaponProfile.properties && (
                                            <span className="weapon-properties">{weaponProfile.properties}</span>
                                          )}
                                          {weaponProfile.verificationStatus === 'incomplete' && (
                                            <span className="weapon-properties">
                                              Dato pendiente: {weaponProfile.verificationNote ?? 'información incompleta en Infinity Army.'}
                                            </span>
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
                                    ) : equipment ? (
                                      <div className="weapon-equipment">
                                        <strong>{name}</strong>
                                        <span>Equipo</span>
                                      </div>
                                    ) : (
                                      <div className="weapon-unmatched">
                                        <strong>{name}</strong>
                                        <span>Sin ficha de arma coincidente; no se muestran valores inferidos.</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="empty-weapons">Este perfil no tiene armamento registrado en la fuente consultada.</p>
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
              <>
                <p className="import-unresolved-note">
                  Estas entradas no se añadirán; comprueba los perfiles y añádelos manualmente si corresponde.
                </p>
                <ul className="import-unresolved-list" aria-label="Unidades o perfiles no incluidos">
                  {pendingImport.unresolved.map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.displayName ?? entry.originalName}</span>
                      <small>
                        {[entry.groupName, entry.candidateIds.length > 1 || entry.resolution === 'ambiguous'
                          ? 'perfil ambiguo'
                          : 'sin coincidencia en el catálogo'].filter(Boolean).join(' · ')}
                      </small>
                    </li>
                  ))}
                </ul>
              </>
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
      <footer className="app-footer">Catálogo N5 · sin compañías, Spec-Ops ni Team-Ops · disponibilidad sectorial verificada en Infinity Army</footer>
    </main>
  );
}

export default App;
