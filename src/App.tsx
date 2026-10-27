import { useEffect, useMemo, useRef, useState } from 'react';
import catalogData from './data/legacyJsaCatalog.json';
import weaponProfilesData from './data/weaponProfiles.json';
import { createWeaponIndex, getProfileWeapons, getRangeModifierLabel, getRangeModifiers } from './domain/weaponProfiles.mjs';
import { parseProfileList } from './domain/listImport.mjs';
import type { JsaCatalog, TroopProfile, WeaponProfilesCatalog } from './types/catalog';
import type { ImportedProfileLine } from './domain/listImport.mjs';

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
  const [collection, setCollection] = useState<Array<{ id: number; profileId: string }>>([]);
  const [collectionAnnouncement, setCollectionAnnouncement] = useState('');
  const nextCollectionId = useRef(0);
  const selectedProfile = catalog.profiles.find((profile) => profile.id === selectedId);
  const profileWeapons = selectedProfile ? getProfileWeapons(selectedProfile, weaponIndex) : [];
  const resolvedImportCount = importedEntries.filter((entry) => entry.profileId).length;

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
    setImportedEntries(
      parseProfileList(listText, catalog.profiles).map((entry) => ({
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

  const addProfilesToCollection = (profileIds: string[]) => {
    setCollection((items) => [
      ...items,
      ...profileIds.map((profileId) => ({ id: nextCollectionId.current++, profileId })),
    ]);
    const addedNames = profileIds
      .map((profileId) => catalog.profiles.find((profile) => profile.id === profileId)?.name)
      .filter((name): name is string => Boolean(name));
    setCollectionAnnouncement(
      addedNames.length === 1
        ? `${addedNames[0]} añadida a la colección.`
        : `${addedNames.length} perfiles añadidos a la colección.`,
    );
  };

  const addResolvedImports = () => {
    const resolved = importedEntries.filter((entry) => entry.profileId);
    addProfilesToCollection(resolved.map((entry) => entry.profileId));
    setImportedEntries((entries) => entries.filter((entry) => !entry.profileId));
  };

  const moveCollectionItem = (index: number, direction: -1 | 1) => {
    setCollection((items) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return items;
      const reordered = [...items];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered;
    });
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Infinity Datacards, inicio">
          <span className="brand-mark">∞</span>
          <span>
            <strong>INFINITY</strong>
            <small>DATACARDS</small>
          </span>
        </a>
        <span className="edition-tag">N5 · PILOTO JSA</span>
      </header>

      <section className="intro">
        <div className="eyebrow">ARCHIVO TÁCTICO · FASE 01</div>
        <h1>Tu fuerza, <span>ficha a ficha.</span></h1>
        <p>Consulta los perfiles de JSA y prepara el terreno para tus próximas listas.</p>
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
            <h2 id="import-title">Pega los perfiles, uno por línea</h2>
          </div>
          <span className="result-count">{importedEntries.length}</span>
        </div>
        <div className="import-input-area">
          <label htmlFor="profile-list-input">Lista de perfiles JSA</label>
          <textarea
            id="profile-list-input"
            value={listText}
            onChange={(event) => setListText(event.target.value)}
            placeholder={'SHINOBU (Teniente)\nDOMARU (AP HMG)\nNINJA'}
            rows={5}
          />
          <div className="import-input-footer">
            <p>Se comparan nombres completos del catálogo. No se interpreta automáticamente ningún formato externo.</p>
            <button className="action-button" type="button" onClick={analyzeList} disabled={!listText.trim()}>
              Analizar lista
            </button>
          </div>
        </div>
        {importedEntries.length > 0 && (
          <div className="import-review">
            <div className="import-review-heading">
              <strong>Revisión de coincidencias</strong>
              <button
                className="action-button primary"
                type="button"
                onClick={addResolvedImports}
                disabled={!resolvedImportCount}
              >
                Añadir resueltas ({resolvedImportCount})
              </button>
            </div>
            <ul className="import-entry-list">
              {importedEntries.map((entry) => {
                const profile = catalog.profiles.find((item) => item.id === entry.profileId);
                const status = profile
                  ? entry.candidateIds.length > 1 ? 'Coincidencia elegida manualmente' : 'Coincidencia exacta'
                  : entry.candidateIds.length > 1 ? 'Nombre ambiguo' : 'Sin coincidencia';
                return (
                  <li className="import-entry" key={entry.id}>
                    <div className="import-original">
                      <strong>{entry.originalName}</strong>
                      <span>Línea {entry.lineNumber} · {status}</span>
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
                onDoubleClick={() => addProfilesToCollection([profile.id])}
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
              <button className="action-button primary" type="button" onClick={() => addProfilesToCollection([selectedProfile.id])}>
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
          <span className="result-count">{collection.length}</span>
        </div>
        {collection.length ? (
          <div className="collection-grid">
            {collection.map((item, index) => {
              const profile = catalog.profiles.find((candidate) => candidate.id === item.profileId);
              if (!profile) return null;
              return (
                <article className="collection-card" key={item.id}>
                  <div className="collection-card-toolbar">
                    <span>FICHA {index + 1}</span>
                    <div>
                      <button type="button" aria-label={`Mover ${profile.name} arriba`} onClick={() => moveCollectionItem(index, -1)} disabled={index === 0}>↑</button>
                      <button type="button" aria-label={`Mover ${profile.name} abajo`} onClick={() => moveCollectionItem(index, 1)} disabled={index === collection.length - 1}>↓</button>
                      <button type="button" aria-label={`Eliminar ${profile.name}`} onClick={() => setCollection((items) => items.filter((candidate) => candidate.id !== item.id))}>×</button>
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
      <footer className="app-footer">Catálogo piloto · JSA únicamente · preparado para ampliar con fuentes verificadas</footer>
    </main>
  );
}

export default App;
