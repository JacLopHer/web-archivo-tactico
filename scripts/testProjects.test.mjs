import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInitialProjectStore,
  createProject,
  deleteProject,
  loadProjectStore,
  PROJECT_STORAGE_KEY,
  renameProject,
  saveProjectStore,
  setActiveProject,
  shouldAutosaveProjects,
  updateProjectCards,
} from '../src/domain/projects.mjs';

function createStorage(initialValue = null) {
  const values = new Map(initialValue === null ? [] : [[PROJECT_STORAGE_KEY, initialValue]]);
  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test('crea y recupera proyectos conservando identidad, orden, duplicados y grupos', () => {
  const storage = createStorage();
  let store = createInitialProjectStore('alpha');
  store = updateProjectCards(store, 'alpha', [
    { id: 8, profileId: 'ninja', groupName: 'Grupo 1' },
    { id: 9, profileId: 'domaru' },
    { id: 10, profileId: 'ninja', groupName: 'Grupo 2' },
  ]);
  saveProjectStore(storage, store);

  const loaded = loadProjectStore(storage, () => createInitialProjectStore('new'));
  assert.equal(loaded.loaded, true);
  assert.deepEqual(loaded.store, store);
});

test('un proyecto vacío inicial no se guarda por sí mismo', () => {
  const storage = createStorage();
  const loaded = loadProjectStore(storage, () => createInitialProjectStore('initial'));
  assert.equal(loaded.loaded, false);
  assert.equal(storage.values.has(PROJECT_STORAGE_KEY), false);
});

test('renombrar y eliminar un proyecto no modifica los otros', () => {
  let store = createInitialProjectStore('alpha');
  store = updateProjectCards(store, 'alpha', [{ id: 0, profileId: 'ninja' }]);
  store = createProject(store, { id: 'beta', name: 'Segunda lista' });
  store = updateProjectCards(store, 'beta', [{ id: 1, profileId: 'domaru', groupName: 'Grupo 1' }]);
  store = renameProject(store, 'beta', 'Lista de torneo');

  const result = deleteProject(store, 'alpha', 'replacement');
  assert.equal(result.activeProjectId, 'beta');
  assert.deepEqual(result.projects, [{
    id: 'beta',
    name: 'Lista de torneo',
    cards: [{ id: 1, profileId: 'domaru', groupName: 'Grupo 1' }],
  }]);
});

test('eliminar el último proyecto crea una lista vacía utilizable', () => {
  const result = deleteProject(createInitialProjectStore('alpha'), 'alpha', 'replacement');
  assert.deepEqual(result, createInitialProjectStore('replacement'));
});

test('cambiar de proyecto carga sus fichas y persiste el nuevo proyecto activo', () => {
  let store = createInitialProjectStore('alpha');
  store = updateProjectCards(store, 'alpha', [{ id: 0, profileId: 'ninja' }]);
  store = createProject(store, { id: 'beta', name: 'Segunda lista' });
  store = updateProjectCards(store, 'beta', [{ id: 1, profileId: 'domaru' }]);
  store = setActiveProject(store, 'alpha');
  const storage = createStorage();
  saveProjectStore(storage, store);

  const restored = loadProjectStore(storage, () => createInitialProjectStore('new')).store;
  assert.deepEqual(restored.projects.find(({ id }) => id === 'alpha').cards, [
    { id: 0, profileId: 'ninja' },
  ]);
  assert.deepEqual(restored.projects.find(({ id }) => id === 'beta').cards, [
    { id: 1, profileId: 'domaru' },
  ]);
  assert.equal(restored.activeProjectId, 'alpha');
});

test('rechaza JSON inválido y versiones incompatibles sin cambiar el valor existente', () => {
  const invalidStorage = createStorage('{');
  assert.throws(
    () => loadProjectStore(invalidStorage, () => createInitialProjectStore('new')),
    /JSON inválido/,
  );
  assert.equal(invalidStorage.getItem(PROJECT_STORAGE_KEY), '{');

  const incompatibleStorage = createStorage(JSON.stringify({ schemaVersion: 99 }));
  assert.throws(
    () => loadProjectStore(incompatibleStorage, () => createInitialProjectStore('new')),
    /no es compatible/,
  );
});

test('expone errores de lectura y escritura del almacenamiento', () => {
  const readFailure = { getItem() { throw new Error('denied'); } };
  assert.throws(
    () => loadProjectStore(readFailure, () => createInitialProjectStore('new')),
    /No se pudo leer/,
  );

  const writeFailure = { setItem() { throw new Error('quota'); } };
  assert.throws(
    () => saveProjectStore(writeFailure, createInitialProjectStore('new')),
    /No se pudo guardar/,
  );
});

test('el autosave espera a hidratar y bloquea escrituras hasta autorizar recuperación', () => {
  assert.equal(shouldAutosaveProjects({ hydrated: false, dirty: true, persistenceBlocked: false }), false);
  assert.equal(shouldAutosaveProjects({ hydrated: true, dirty: false, persistenceBlocked: false }), false);
  assert.equal(shouldAutosaveProjects({ hydrated: true, dirty: true, persistenceBlocked: true }), false);
  assert.equal(shouldAutosaveProjects({ hydrated: true, dirty: true, persistenceBlocked: false }), true);
});
