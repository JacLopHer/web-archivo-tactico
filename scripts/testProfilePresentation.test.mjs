import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('la ficha presenta los diez atributos en el orden de Infinity y una sola cuadrícula', () => {
  const expectedOrder = [
    'movement',
    'cc',
    'bs',
    'physical',
    'willpower',
    'armor',
    'bts',
    'wounds',
    'silhouette',
    'availability',
  ];
  let previousIndex = -1;

  for (const key of expectedOrder) {
    const index = app.indexOf(`['${key}',`);
    assert.ok(index > previousIndex, `El atributo ${key} debe respetar el orden de Infinity.`);
    previousIndex = index;
  }

  assert.match(styles, /\.stat-grid\s*\{[^}]*grid-template-columns:\s*repeat\(10,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(app, /className="skills-band"/);
  assert.match(app, /className="unit-portrait"/);
});

test('tipo, edición, puntos y CAP comparten la línea del nombre en escritorio', () => {
  const nameRowStart = app.indexOf('className="unit-name-row"');
  const nameRowEnd = app.indexOf('</div>', app.indexOf('className="unit-type-row"', nameRowStart));
  const nameRow = app.slice(nameRowStart, nameRowEnd);

  assert.ok(nameRow.includes('<h2>{selectedProfile.name}</h2>'));
  assert.ok(nameRow.includes('className="unit-type-row"'));
  assert.match(styles, /\.unit-name-row\s*\{[^}]*align-items:\s*center;[^}]*justify-content:\s*space-between/s);
  assert.match(styles, /\.unit-type-row\s*\{[^}]*font-size:\s*10px/s);
  assert.match(styles, /\.unit-header\s*\{[^}]*min-height:\s*80px/s);
});

test('tipo, edición, puntos y CAP usan una tipografía homogénea', () => {
  assert.match(styles, /\.unit-type-row\s*\{[^}]*font-size:\s*10px/);
  assert.match(styles, /\.unit-edition\s*\{[^}]*color:\s*#[0-9a-f]{6};\s*\}/i);
  assert.match(styles, /\.unit-cost\s*\{[^}]*margin-left:\s*auto;\s*\}/);
  assert.match(styles, /\.unit-cost strong\s*\{[^}]*font-size:\s*inherit/);
  assert.match(styles, /\.unit-cap\s*\{[^}]*color:\s*#[0-9a-f]{6};\s*\}/i);
  assert.match(styles, /\.unit-cap strong\s*\{[^}]*font-size:\s*inherit/);
  assert.doesNotMatch(styles, /\.unit-type-row\s*\{[^}]*font-size:\s*8px/);
  assert.doesNotMatch(styles, /\.unit-cap\s*\{[^}]*font-size:/);
});

test('las reglas responsive no fuerzan una segunda fila en escritorio', () => {
  assert.match(styles, /\.workspace\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*minmax\(340px,\s*\.78fr\)\s*minmax\(0,\s*1\.6fr\)/);
  assert.ok(styles.indexOf('@media (max-width: 1020px)') < styles.indexOf('.workspace { grid-template-columns: 1fr; }'));
  assert.ok(styles.indexOf('@media (max-width: 520px)') < styles.indexOf('.stat-grid { margin-left: 0; }'));
  assert.doesNotMatch(styles, /@media[^}]*\.stat-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5/);
});

test('la tabla de armamento expone alcances y valores de perfil separados', () => {
  for (const column of ['ARMA', 'PS', 'R', 'MUN', 'TS', 'Nº']) {
    assert.ok(app.includes(`<span>${column}</span>`), `Falta la columna ${column}.`);
  }
  assert.match(app, /rangeBands\.map\(\(range, index\)/);
  assert.match(app, /getRangeModifierLabel\(value\)/);
  assert.match(app, /profile\.rangeNote/);
  assert.doesNotMatch(app, /value === '--' \? 'X'/);
  assert.match(app, /className="weapon-name-line"/);
  assert.match(app, /className="weapon-properties"/);
  assert.match(app, /className="weapon-category"/);
  assert.doesNotMatch(app, /<strong>PROP:<\/strong>/);
  assert.match(app, /Sin perfil coincidente en el catálogo heredado/);
  assert.match(app, /className="range-blank"/);
  assert.doesNotMatch(app, /Array\(7\)\.fill\('--'\)/);
  assert.doesNotMatch(app, /Alcances, PS, R, munición, atributo y número de tiradas/);
  assert.doesNotMatch(app, /Origen: \{selectedProfile\.source\}/);
  assert.doesNotMatch(app, /Datos heredados pendientes de revisión\. Esta ficha/);
  assert.doesNotMatch(app, /· SIN VERIFICAR/);
});
