import { useEffect, useMemo, useState } from 'react';
import catalogData from './data/legacyJsaCatalog.json';
import type { JsaCatalog, TroopProfile } from './types/catalog';

const catalog = catalogData as JsaCatalog;

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
                <span className="profile-avatar">{profile.name.slice(0, 1)}</span>
                <span className="profile-summary">
                  <strong>{profile.name}</strong>
                  <small>{profile.troopType} · {profile.rangedEquipment || profile.meleeEquipment || 'Sin armamento registrado'}</small>
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
              <div className="card-topline">
                <span>JSA <i>/</i> {selectedProfile.troopType}</span>
                <span className="unverified-badge">SIN VERIFICAR</span>
              </div>
              <div className="card-title-row">
                <div>
                  <div className="card-kicker">PERFIL DE UNIDAD</div>
                  <h2>{selectedProfile.name}</h2>
                </div>
                <div className="cost-block">
                  <strong>{selectedProfile.points}</strong>
                  <span>PUNTOS</span>
                </div>
              </div>
              <div className="stat-grid">
                {statLabels.map(([key, label]) => (
                  <div className="stat" key={key}>
                    <span>{key === 'wounds' ? selectedProfile.woundsLabel : label}</span>
                    <strong>{selectedProfile.stats[key]}</strong>
                  </div>
                ))}
              </div>
              <div className="card-section">
                <div className="section-title">HABILIDADES Y EQUIPO</div>
                <p>{selectedProfile.skillsAndEquipment || 'No registrado en la fuente heredada.'}</p>
              </div>
              <div className="equipment-grid">
                <div className="card-section">
                  <div className="section-title">ARMAMENTO CD / EQUIPO</div>
                  <p>{selectedProfile.rangedEquipment || 'No registrado.'}</p>
                </div>
                <div className="card-section">
                  <div className="section-title">ARMAMENTO CC</div>
                  <p>{selectedProfile.meleeEquipment || 'No registrado.'}</p>
                </div>
              </div>
              <footer className="card-footer">
                <span>CAP <strong>{selectedProfile.cap}</strong></span>
                <span>{selectedProfile.edition}</span>
                <span>Fuente: {selectedProfile.source}</span>
              </footer>
              <p className="verification-note">
                Esta ficha reproduce datos heredados para revisión. No debe usarse como referencia oficial de reglas hasta su verificación.
              </p>
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
