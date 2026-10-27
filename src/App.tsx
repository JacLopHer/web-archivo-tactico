import { useEffect, useMemo, useState } from 'react';
import catalogData from './data/legacyJsaCatalog.json';
import { createWeaponIndex, getProfileWeapons, getRangeModifiers } from './domain/weaponProfiles.mjs';
import type { JsaCatalog, TroopProfile } from './types/catalog';

const catalog = catalogData as JsaCatalog;
const weaponIndex = createWeaponIndex(catalog.weapons);
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

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function App() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(catalog.profiles[0]?.id ?? '');
  const [selectedSectorial, setSelectedSectorial] = useState('');
  const selectedProfile = catalog.profiles.find((profile) => profile.id === selectedId);
  const profileWeapons = selectedProfile ? getProfileWeapons(selectedProfile, weaponIndex) : [];

  const filteredProfiles = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    const sectorial = catalog.sectorials.find((item) => item.id === selectedSectorial);

    return catalog.profiles.filter((profile) => {
      const matchesQuery =
        !normalizedQuery ||
        normalize(`${profile.name} ${profile.troopType} ${profile.rangedEquipment} ${profile.meleeEquipment}`)
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
          <strong>Datos heredados pendientes de verificar.</strong> Los perfiles proceden de la herramienta JSA anterior.
          Las opciones sectoriales están desactivadas hasta validar la disponibilidad unidad por unidad.
        </p>
        <span className="profile-count">{filteredProfiles.length} perfiles</span>
      </div>

      <div className="workspace">
        <section className="roster-panel" aria-label="Perfiles disponibles">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">JAPANESE SECESSIONIST ARMY</span>
              <h2>Perfiles</h2>
            </div>
            <span className="result-count">{filteredProfiles.length}</span>
          </div>
          <div className="profile-list">
            {filteredProfiles.map((profile) => (
              <button
                className={`profile-option ${selectedId === profile.id ? 'is-selected' : ''}`}
                key={profile.id}
                onClick={() => setSelectedId(profile.id)}
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
                                  {getRangeModifiers(profile).length ? (
                                    <div className="range-track" aria-label={`Modificadores de alcance: ${profile.rangeModifiers}`}>
                                      {getRangeModifiers(profile).map((value, bandIndex) => {
                                        const tone = value === '0' ? 'neutral' : value.startsWith('+') ? 'positive' : value === '-3' ? 'short' : value === '-6' ? 'long' : 'unavailable';
                                        return <span className={`range-band ${tone}`} key={`${bandIndex}-${value}`}>{value === '--' ? 'X' : value}</span>;
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
          ) : (
            <div className="empty-detail">Selecciona un perfil para consultar su ficha.</div>
          )}
        </section>
      </div>
      <footer className="app-footer">Catálogo piloto · JSA únicamente · preparado para ampliar con fuentes verificadas</footer>
    </main>
  );
}

export default App;
