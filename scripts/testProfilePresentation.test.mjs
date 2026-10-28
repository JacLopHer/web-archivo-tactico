import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('las fichas de impresión presentan los diez atributos en el orden de Infinity', () => {
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
  assert.match(app, /className="stat-grid"/);
  assert.match(app, /className="skills-band"/);
});

test('la lista activa presenta unidad, equipo, puntos y CAP en una fila compacta', () => {
  const summaryStart = app.indexOf('className="collection-entry-summary"');
  const summaryEnd = app.indexOf('className="collection-print-card datacard"', summaryStart);
  const summary = app.slice(summaryStart, summaryEnd);

  assert.match(app, /<h2 id="collection-title">Lista activa<\/h2>/);
  assert.match(summary, /className="collection-entry-name"/);
  assert.match(summary, /profile\.rangedEquipment, profile\.meleeEquipment/);
  assert.match(summary, /profile\.points\} PTS · CAP \{profile\.cap/);
  assert.match(summary, /className="collection-entry-actions"/);
  assert.doesNotMatch(summary, /groupName|FICHA/);
  assert.doesNotMatch(summary, /<span>\{profile\.variantName\}<\/span>/);
  assert.match(styles, /\.collection-entry-summary\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto\s*auto/);
  assert.match(styles, /\.collection-entry-name\s*\{[^}]*display:\s*flex/);
  assert.doesNotMatch(app, /className="detail-panel"/);
});

test('los grupos siguen en el modelo y en impresión sin ocupar la lista activa', () => {
  assert.match(app, /startsGroup: Boolean\(index > 0 && item\.groupName/);
  assert.match(app, /className=\{`collection-entry\$\{startsGroup/);
  assert.match(app, /className="collection-print-meta">\s*\{item\.groupName \? `\$\{item\.groupName\} · ` : ''\}FICHA \{index \+ 1\}/);
});

test('el espacio de trabajo separa unidades, perfiles y añadidos en tres columnas', () => {
  assert.match(styles, /\.workspace\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*minmax\(210px,\s*\.7fr\)\s*minmax\(250px,\s*\.85fr\)\s*minmax\(320px,\s*1\.1fr\)/);
  assert.ok(styles.indexOf('@media (max-width: 1020px)') < styles.indexOf('.workspace { grid-template-columns: 1fr; }'));
  const mobileStyles = styles.slice(styles.indexOf('@media (max-width: 520px)'));
  assert.match(mobileStyles, /\.stat-grid \{ margin-left: 0; \}/);
  assert.doesNotMatch(styles, /@media[^}]*\.stat-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5/);
  assert.match(app, /catalog\.units\.filter\(\(unit\)/);
  assert.match(app, /className="roster-panel catalog-families"/);
  assert.match(app, /className="roster-panel catalog-variants"/);
  assert.match(app, /className=\{`collection-list\$\{printPreviewOpen/);
  assert.match(app, /previewPages : \[collectionEntries\]/);
  assert.match(app, /data-preview-page=\{pageIndex \+ 1\}/);
  assert.match(app, /collection\.map\(\(item, index\)/);
  assert.match(app, /className="collection-section"\s+aria-labelledby="collection-title"/);
});

test('las variantes se añaden individualmente y la colección lista conserva el orden y grupos', () => {
  assert.match(app, /addProfilesToCollection\(\[\{ profileId: profile\.id \}\]\)/);
  assert.match(app, /onDoubleClick=\{\(\) => \{\s*setSelectedId\(profile\.id\);\s*addProfilesToCollection/);
  assert.match(app, /key=\{item\.id\}/);
  assert.match(app, /item\.groupName.*FICHA \{index \+ 1\}/);
  assert.match(app, /moveCollectionItem\(index, -1\)/);
  assert.match(app, /moveCollectionItem\(index, 1\)/);
  assert.match(app, /collection\.filter\(\(candidate\) => candidate\.id !== item\.id\)/);
});

test('no repite el equipo en la lista de variantes cuando coincide con su nombre', () => {
  assert.match(app, /const equipmentLabel = \[profile\.rangedEquipment, profile\.meleeEquipment\]\.filter\(Boolean\)\.join\(' · '\)/);
  assert.match(app, /equipmentLabel\.trim\(\)\.toLocaleLowerCase\(\) !== profile\.variantName\.trim\(\)\.toLocaleLowerCase\(\)/);
  assert.match(app, /\{showEquipment && <span>\{equipmentLabel \|\| 'Sin armamento registrado'\}<\/span>\}/);
});

test('las fichas imprimibles incluyen perfiles detallados de armas', () => {
  assert.match(app, /className="collection-print-card datacard"/);
  assert.match(app, /className="unit-header"/);
  assert.match(app, /className="unit-portrait"/);
  assert.match(app, /className="unit-type-row"/);
  assert.doesNotMatch(app, /className="selected-variant-name"/);
  assert.match(app, /className="card-lower"/);
  assert.match(app, /className="weapon-section"/);
  assert.match(app, /const profileWeapons = getProfileWeapons\(profile, weaponIndex\)/);
  assert.match(app, /className="weapon-table"/);
  assert.match(app, /weaponProfile\.rangeModifiers/);
  assert.match(app, /weaponProfile\.damage/);
  assert.match(app, /weaponProfile\.burst/);
  assert.match(app, /weaponProfile\.ammunition/);
  assert.match(app, /weaponProfile\.saveAttribute/);
  assert.match(app, /weaponProfile\.saves/);
  assert.match(styles, /\.collection-print-card \.weapon-main-row\s*\{[^}]*grid-template-columns/);
  assert.match(styles, /\.collection-print-card \.weapon-entry,\s*\.collection-print-card \.weapon-main-row\s*\{[^}]*break-inside:\s*avoid/);
  assert.doesNotMatch(app, /className="detail-panel"/);
});

test('las unidades JSA muestran insignias SVG oficiales donde hay un recurso disponible', () => {
  assert.match(app, /'KEISOTSU': 'keisotsu'/);
  assert.match(app, /'SENKU': 'senku-troops'/);
  assert.match(app, /'SHINOBU': 'oniwaban-shinobu-kitsune'/);
  assert.match(app, /'YOJIMBO': 'yojimbo-sword-for-hire'/);
  assert.match(app, /'TANUKI': 's-t-r-s-tanuki-team'/);
  assert.equal((app.match(/unitIconPath\(profile\.unitName\)/g) ?? []).length, 2);
  assert.match(app, /`units\/icons\/\$\{iconSlug\}\.svg`/);
});

test('la lista de unidades presenta su insignia a la izquierda del nombre', () => {
  const rosterStart = app.indexOf('className="roster-panel catalog-families"');
  const rosterEnd = app.indexOf('className="roster-panel catalog-variants"', rosterStart);
  const roster = app.slice(rosterStart, rosterEnd);
  assert.match(roster, /className="family-option-icon"/);
  assert.match(roster, /className="profile-summary"><strong>\{unit\.name\}<\/strong>/);
  assert.match(styles, /\.family-option-icon\s*\{[^}]*width:\s*28px[^}]*height:\s*28px/);
});

test('la clase de tropa se presenta en catálogo, colección y ficha sin sustituir troopType', () => {
  assert.match(app, /Clase de tropa: \{getTroopClassShortLabel\(profile\.troopClass\)\}/);
  assert.match(app, /className="collection-entry-class">\{getTroopClassShortLabel\(profile\.troopClass\)\}/);
  assert.match(app, /className="unit-class">\{getTroopClassShortLabel\(profile\.troopClass\)\}/);
  assert.match(app, /<span>\{profile\.troopType\}<\/span>/);
  assert.match(app, /showClassPicker/);
  assert.match(app, /catalog\.troopClassGroups/);
  assert.match(app, /profile\.troopClass === selectedTroopClass/);
  assert.match(styles, /\.unit-type-row \.unit-class/);
});

test('marca los perfiles FTO dentro de las variantes de su unidad base', () => {
  const variantsStart = app.indexOf('className="roster-panel catalog-variants"');
  const variantsEnd = app.indexOf('className="collection-section"', variantsStart);
  const variants = app.slice(variantsStart, variantsEnd);
  assert.match(variants, /const isFtoProfile = profile\.name\.includes\(' FTO'\)/);
  assert.match(variants, /isFtoProfile && <span className="variant-origin-badge"[^>]*>FTO<\/span>/);
  assert.match(styles, /\.variant-option-main \.variant-origin-badge\s*\{[^}]*font-size:\s*8px/);
});

test('la vista previa muestra las fichas compactas con las opciones elegidas antes de imprimir', () => {
  assert.match(app, /printPreviewOpen \? 'dialog' : undefined/);
  assert.match(app, /aria-modal=\{printPreviewOpen \|\| undefined\}/);
  assert.match(app, /Vista detallada según los saltos seleccionados/);
  assert.match(app, /printPreviewOpen \? window\.print\(\) : setPrintPreviewOpen\(true\)/);
  assert.match(app, /printPreviewOpen \? 'Imprimir \/ Guardar PDF' : 'Vista previa'/);
  assert.match(app, /onClick=\{\(\) => setPrintPreviewOpen\(false\)\}/);
  assert.match(styles, /\.app-shell\.print-preview-open \.collection-print-card\s*\{[^}]*width:\s*150mm/);
  assert.doesNotMatch(app, /Tamaño de papel|paperSize|Letter/);
  assert.match(styles, /\.app-shell\.print-preview-open \.collection-print-card\s*\{[^}]*display:\s*block/);
  assert.match(styles, /\.app-shell\.print-preview-open \.collection-print-card \{ box-shadow: none; \}/);
});

test('permite imprimir la misma datacard completa en dos columnas por cinco filas', () => {
  assert.match(app, /Formato de impresión/);
  assert.ok(app.indexOf('Formato de impresión') < app.indexOf('Saltos de página'));
  assert.match(app, /value="detailed">Detallado</);
  assert.match(app, /value="compact">Compacto · 10 por hoja/);
  assert.match(app, /size: A4 portrait; margin: \$\{printLayout === 'compact' \? '6mm' : '10mm'\}/);
  assert.match(app, /className=\{`app-shell print-layout-\$\{printLayout\}/);
  assert.match(app, /la misma ficha completa con atributos, reglas y tablas de armas, reducida en dos columnas por cinco filas para hasta 10 por hoja/);
  assert.equal((app.match(/<article className="collection-print-card datacard">/g) ?? []).length, 1);
  assert.doesNotMatch(app, /compact-print-card/);
  assert.match(app, /const tallest = Math\.max\(\.\.\.cards\.map\(\(card\) => card\.offsetHeight\)\) \* mmPerPixel/);
  assert.match(app, /const scale = Math\.min\(1, cellHeight \/ tallest\)/);
  assert.match(app, /card\.style\.setProperty\('--compact-card-scale', String\(scale\)\)/);
  assert.match(app, /card\.style\.minHeight = `\$\{cellHeight \/ scale \/ mmPerPixel\}px`/);
  assert.match(styles, /transform:\s*translate\(-50%,\s*-50%\)\s*scale\(var\(--compact-card-scale,\s*\.48\)\)/);
  assert.match(styles, /\.app-shell\.print-layout-compact\.print-preview-open \.collection-print-card/);
  assert.match(styles, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);\s*grid-template-rows:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styles, /\.app-shell\.print-layout-compact\.print-preview-open \.print-preview-page\s*\{[^}]*width:\s*210mm;\s*height:\s*297mm/s);
  assert.match(styles, /\.app-shell\.print-layout-compact\.print-preview-open \.print-preview-page\s*\{[^}]*height:\s*calc\(297mm - 12mm\)/);
  assert.match(styles, /\.app-shell\.print-layout-compact\.print-preview-open \.print-preview-page-entries/);
  assert.match(styles, /\.app-shell\.print-layout-compact\.print-preview-open \.print-preview-page\s*\{[^}]*break-after:\s*page/);
});
