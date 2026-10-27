import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseListImport, parseProfileList } from '../src/domain/listImport.mjs';

const realCatalog = JSON.parse(
  await readFile(new URL('../src/data/legacyJsaCatalog.json', import.meta.url), 'utf8'),
);

const profiles = [
  { id: 'shinobu', name: 'SHINOBU' },
  { id: 'ninja-combi', name: 'NINJA' },
  { id: 'ninja-sniper', name: 'NINJA' },
  { id: 'domaru', name: 'DOMARU (AP HMG)' },
];

test('ignora líneas vacías y conserva nombres y números de línea', () => {
  assert.deepEqual(parseProfileList('\n  SHINOBU  \n\n DOMARU (AP HMG) ', profiles), [
    { originalName: 'SHINOBU', lineNumber: 2, candidateIds: ['shinobu'], profileId: 'shinobu' },
    { originalName: 'DOMARU (AP HMG)', lineNumber: 4, candidateIds: ['domaru'], profileId: 'domaru' },
  ]);
});

test('resuelve coincidencias exactas normalizadas sin distinguir acentos ni puntuación', () => {
  const [entry] = parseProfileList('domaru ap hmg', profiles);
  assert.equal(entry.profileId, 'domaru');
  assert.deepEqual(entry.candidateIds, ['domaru']);
});

test('deja coincidencias duplicadas para resolución manual', () => {
  const [entry] = parseProfileList('Ninja', profiles);
  assert.equal(entry.profileId, '');
  assert.deepEqual(entry.candidateIds, ['ninja-combi', 'ninja-sniper']);
});

test('no asigna automáticamente nombres sin coincidencia exacta', () => {
  const [entry] = parseProfileList('NINJA (HACKER)', profiles);
  assert.equal(entry.profileId, '');
  assert.deepEqual(entry.candidateIds, []);
});

const armyProfiles = [
  { id: 'miyamoto', name: 'MIYAMOTO MUSHASHI', points: '21', cap: '0', rangedEquipment: 'Chain Rifle, Arco Táctico, Pulso Flash', meleeEquipment: 'Pistola, Arma CC EXP(PS=4)' },
  { id: 'karakuri-mk12', name: 'KARAKURI', points: '38', cap: '0', rangedEquipment: 'Mk12, Chain Rifle, Panzerfaust, Pulso Flash', meleeEquipment: 'Pistola, Arma CC' },
  { id: 'karakuri-emitter', name: 'KARAKURI', points: '31', cap: '0', rangedEquipment: 'E/Mitter, Chain Rifle, Panzerfaust, Pulso Flash', meleeEquipment: 'Pistola, Arma CC' },
  { id: 'karakuri-shotgun', name: 'KARAKURI', points: '31', cap: '0', rangedEquipment: 'Escopeta Pesada, Chain Rifle, Panzerfaust, Pulso Flash', meleeEquipment: 'Pistola, Arma CC' },
  { id: 'warcor', name: 'WARCOR (Visor 360º)', points: '3', cap: '0', rangedEquipment: 'Pulso Flash', meleeEquipment: 'Pistola Aturdidora, Arma CC PARA(-3)' },
];

test('reconoce el formato de Infinity Army y separa grupo, coste y armamento', () => {
  const result = parseListImport([
    'Krug Akial Shinobu <3',
    '──────────────────────────────────────────────────',
    '',
    'GRUPO 1  6  / 3',
    ' MIYAMOTO MUSHASHI Chain Rifle, Arco Táctico, Pulso Flash / Pistola, Arma CC EXP(PS=4). (0 | 21)',
    ' KARAKURI Mk12, Chain Rifle, Panzerfaust, Pulso Flash / Pistola, Arma CC. (0 | 38)',
    ' WARCOR (Visor 360º) Pulso Flash ( ) / Pistola Aturdidora, Arma CC PARA(-3). (0 | 3)',
    ' 3 CAP | 300 Puntos',
    '[url=https://infinitytheuniverse.com/army/list/abc]Abrir en Infinity Army',
  ].join('\n'), armyProfiles);

  assert.equal(result.format, 'infinity-army');
  assert.equal(result.entries.length, 3);
  assert.deepEqual(result.entries[0], {
    originalName: 'MIYAMOTO MUSHASHI',
    lineNumber: 5,
    groupName: 'Grupo 1',
    sourceLine: 'MIYAMOTO MUSHASHI Chain Rifle, Arco Táctico, Pulso Flash / Pistola, Arma CC EXP(PS=4). (0 | 21)',
    rangedEquipment: 'Chain Rifle, Arco Táctico, Pulso Flash',
    meleeEquipment: 'Pistola, Arma CC EXP(PS=4).',
    cap: '0',
    points: '21',
    candidateIds: ['miyamoto'],
    profileId: 'miyamoto',
    resolution: 'exact',
  });
  assert.equal(result.entries[1].profileId, 'karakuri-mk12');
  assert.equal(result.entries[2].profileId, 'warcor');
});

test('conserva duplicados en grupos y solicita perfil cuando no se reconoce el nombre', () => {
  const result = parseListImport([
    'GRUPO 1  6 / 3',
    ' KARAKURI Mk12, Chain Rifle, Panzerfaust, Pulso Flash / Pistola, Arma CC. (0 | 38)',
    'GRUPO 25 / 2',
    ' KARAKURI E/Mitter, Chain Rifle, Panzerfaust, Pulso Flash / Pistola, Arma CC. (0 | 31)',
    ' RYŪKEN Lanzacohetes Pesado / Pistola Pesada. (1.5 | 23)',
    ' RYŪKEN Lanzacohetes Pesado / Pistola Pesada. (1.5 | 23)',
  ].join('\n'), armyProfiles);

  assert.equal(result.entries.length, 4);
  assert.deepEqual(result.entries.map((entry) => entry.groupName), [
    'Grupo 1',
    'Grupo 2',
    'Grupo 2',
    'Grupo 2',
  ]);
  assert.deepEqual(result.entries.slice(2).map((entry) => entry.originalName), [
    'RYŪKEN Lanzacohetes Pesado',
    'RYŪKEN Lanzacohetes Pesado',
  ]);
  assert.ok(result.entries.slice(2).every((entry) => entry.profileId === '' && entry.candidateIds.length === 0));
});

test('mantiene ambigua una variante de armamento cuando los datos no la distinguen', () => {
  const [entry] = parseListImport(
    'KARAKURI OtraArma / Pistola, Arma CC. (0 | 32)',
    armyProfiles,
  ).entries;
  assert.equal(entry.profileId, '');
  assert.deepEqual(entry.candidateIds, ['karakuri-mk12', 'karakuri-emitter', 'karakuri-shotgun']);
});

test('importa la lista del ejemplo compartido de Infinity Army', () => {
  const result = parseListImport([
    'Krug Akial Shinobu <3',
    'GRUPO 1  6  / 3',
    ' MIYAMOTO MUSHASHI Chain Rifle, Arco Táctico, Pulso Flash / Pistola, Arma CC EXP(PS=4). (0 | 21)',
    ' IOANN BANN Chain Rifle(+1R), Arco Táctico Viral(+1DE), Granadas(PS=6) / Pistola Pesada AP(+1R), Arma CC AP + T2(PS=4). (0 | 30)',
    ' KARAKURI Mk12, Chain Rifle, Panzerfaust, Pulso Flash / Pistola, Arma CC. (0 | 38)',
    ' KARAKURI E/Mitter, Chain Rifle, Panzerfaust, Pulso Flash / Pistola, Arma CC. (0 | 31)',
    ' YURIKO ODA FTO Fusil Combi, Panzerfaust, Cargas-D, Minas Shock / Pistola, Arma CC. (0 | 23)',
    ' KEMPEI (Cadena de Mando) Escopeta de Abordaje / Pistola, Arma CC, Arma CC PARA(-3). (0 | 17)',
    ' PANGGULING (Desactivador, Repetidor) ( ) / Arma CC PARA(-3). (0 | 8)',
    ' ROBIO AIBŌT Pulso Flash / Arma CC PARA(-3). (0 | 7)',
    ' WARCOR (Visor 360º) Pulso Flash ( ) / Pistola Aturdidora, Arma CC PARA(-3). (0 | 3)',
    'GRUPO 25 / 2',
    ' TANKŌ (Desactivador) Blitzen, Escopeta Ligera, Disco Baller ( ) / Pistola, Arma CC Monofilo, Arma CC Shock(PS=6). (0 | 19)',
    ' RYŪKEN (Ataque Sorpresa [-3], Camuflaje [1 Uso]) Lanzacohetes Pesado, Minas Shock / Pistola Pesada, Arma CC. (1.5 | 23)',
    ' RYŪKEN (Ataque Sorpresa [-3], Camuflaje [1 Uso]) Lanzacohetes Pesado, Minas Shock / Pistola Pesada, Arma CC. (1.5 | 23)',
    ' ARAGOTO (Hacker, Disp. Hacker Asesino) Fusil Combi, Escopeta Ligera ( ) / Pistola de Abordaje, Arma CC. (0 | 19)',
    ' HATAMOTO (Teniente [+1 Orden]) Red Fury / Pistola Pesada, Arma CC Monofilo, Arma CC E/M(PS=4). (+1 | 38)',
    '3 CAP | 300 Puntos',
    '[url=https://infinitytheuniverse.com/army/list/abc]Abrir en Infinity Army',
  ].join('\n'), realCatalog.profiles);

  assert.equal(result.format, 'infinity-army');
  assert.equal(result.entries.length, 14);
  assert.ok(result.entries.every((entry) => entry.profileId), 'all sample profiles are matched');
  assert.equal(result.entries[2].originalName, 'KARAKURI');
  assert.equal(result.entries[2].profileId, 'legacy-profile-96caf4e41df6');
  assert.equal(result.entries[3].rangedEquipment, 'E/Mitter, Chain Rifle, Panzerfaust, Pulso Flash');
  assert.equal(result.entries[3].profileId, 'legacy-profile-7bb9a7b213d5');
  assert.equal(result.entries[8].originalName, 'WARCOR (Visor 360º)');
  assert.deepEqual(result.entries.slice(10, 12).map((entry) => entry.profileId), [
    result.entries[10].profileId,
    result.entries[10].profileId,
  ]);
  assert.equal(result.entries[0].groupName, 'Grupo 1');
  assert.equal(result.entries.at(-1).groupName, 'Grupo 2');
});
