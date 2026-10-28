import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  assertValidTroopClass,
  buildTroopClassAssignments,
  getTroopClassLabel,
  troopClasses,
  troopClassSource,
} from '../src/domain/troopClasses.mjs';

const catalog = JSON.parse(
  await readFile(new URL('../src/data/legacyJsaCatalog.json', import.meta.url), 'utf8'),
);
const unitNames = catalog.units.map((unit) => unit.name);
const mapping = buildTroopClassAssignments(unitNames);

test('el vocabulario cerrado contiene las categorías de la tabla y su etiqueta española', () => {
  assert.deepEqual(troopClasses, [
    'Light Infantry',
    'Medium Infantry',
    'Heavy Infantry',
    'Skirmishers',
    'Warbands',
    'Remotes',
    'TAGs',
    'Discontinued',
    'No Profile',
    'unclassified',
  ]);
  assert.equal(getTroopClassLabel('Light Infantry'), 'IL — Infantería Ligera');
  assert.equal(getTroopClassLabel('Medium Infantry'), 'IM — Infantería Media');
  assert.equal(getTroopClassLabel('Heavy Infantry'), 'IP — Infantería Pesada');
  assert.equal(getTroopClassLabel('Skirmishers'), 'BAT — Batidor');
  assert.equal(getTroopClassLabel('Warbands'), 'WB — Warband');
  assert.equal(getTroopClassLabel('Remotes'), 'REM — Remoto');
  assert.equal(getTroopClassLabel('TAGs'), 'TAG — Tactical Armored Gear');
  assert.equal(getTroopClassLabel('No Profile'), 'Sin perfil');
  assert.equal(getTroopClassLabel('unclassified'), 'Sin clasificar');
  assert.equal(troopClassSource, catalog.units[0].troopClassSource);
});

test('asigna un resultado explícito o sin clasificar a cada unidad del catálogo', () => {
  assert.equal(mapping.assignments.size, catalog.units.length);
  for (const unit of catalog.units) {
    const assignment = mapping.assignments.get(unit.name);
    assert.ok(assignment, `Falta una asignación explícita para ${unit.name}`);
    assertValidTroopClass(unit.name, assignment.troopClass);
  }

  assert.equal(mapping.assignments.get('ARAGOTO').troopClass, 'Light Infantry');
  assert.equal(mapping.assignments.get('SHIZOKU FTO').troopClass, 'Heavy Infantry');
  assert.equal(mapping.assignments.get('ATOM AIBŌT').troopClass, 'Remotes');
  assert.equal(mapping.assignments.get('YOJIMBO MOTORIZADO').troopClass, 'Warbands');
  assert.equal(mapping.assignments.get('IOANN BANN').troopClass, 'Warbands');
  assert.equal(
    mapping.assignments.get('IOANN BANN').source,
    'Confirmación expresa del propietario, 2026-10-28',
  );
  assert.equal(mapping.assignments.get('IOANN BANN').verificationStatus, 'verified');
  assert.equal(mapping.assignments.get('PILOTO O-YOROI').troopClass, 'Light Infantry');
  assert.equal(mapping.assignments.get('MECHAZOID').troopClass, 'TAGs');
});

test('Raiden se resuelve como Infantería Media (perfil N5) sin ambigüedad', () => {
  assert.equal(mapping.assignments.get('RAIDEN').troopClass, 'Medium Infantry');
  assert.deepEqual(mapping.ambiguousUnits, []);
  assert.equal(mapping.assignments.get('RAIDEN').verificationStatus, 'verified');
});

test('aplica las clases de las páginas individuales de Human Sphere', () => {
  const expected = {
    WARCOR: 'Light Infantry',
    MONSTRUCKER: 'Light Infantry',
    'AÏDA SWANSON': 'Light Infantry',
    SĀCHĀ: 'Light Infantry',
    'YUAN YUAN': 'Warbands',
    SAMSA: 'Medium Infantry',
    TRIPHAMMER: 'TAGs',
    TURTLEMEK: 'Remotes',
  };
  for (const [unit, troopClass] of Object.entries(expected)) {
    assert.equal(mapping.assignments.get(unit).troopClass, troopClass, unit);
    assert.match(mapping.assignments.get(unit).source, /human-sphere\.com\//);
  }
});

test('Ruby Monday (IP) y Kobaruto (REM) se clasifican por confirmación del propietario', () => {
  for (const [unit, troopClass] of [['RUBY MONDAY', 'Heavy Infantry'], ['KOBARUTO', 'Remotes']]) {
    const assignment = mapping.assignments.get(unit);
    assert.equal(assignment.troopClass, troopClass, unit);
    assert.equal(assignment.source, 'Confirmación expresa del propietario, 2026-10-28');
    assert.equal(assignment.verificationStatus, 'verified');
  }
});

test('informa unidades fuera de la tabla y entradas sin unidad correspondiente', () => {
  assert.deepEqual(mapping.unclassifiedUnits, []);
  assert.deepEqual(mapping.unmatchedTableEntries, [
    'Taguraida',
    'Yáokòng (Wèibīng y Hùsòng)',
    'Asuka Kisaragi',
    'Haramaki',
    'Raiden',
    'Kuge Delegate',
  ]);
});

test('rechaza clases inválidas con un mensaje que identifica la unidad y valores válidos', () => {
  assert.throws(
    () => assertValidTroopClass('NINJA', 'Heavy'),
    /La unidad "NINJA" tiene una clase de tropa inválida.*Light Infantry.*unclassified/,
  );
});
