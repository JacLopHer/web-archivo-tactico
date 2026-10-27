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

test('importa Infinity Army con etiquetas BBCode e iconos de imagen en los grupos', () => {
  const result = parseListImport([
    '[imglogoarmy=14]https://assets.example/jsa.svg[/imglogoarmy][b]Lista de prueba[/b]',
    '──────────────────────────────────────────────────',
    'GRUPO 1[img]https://assets.example/sep.gif[/img] [img]https://assets.example/regular.png[/img]7 [img]https://assets.example/irregular.png[/img]2',
    '[imglogoarmy=14]https://assets.example/shinobu.svg[/imglogoarmy] [b]SHINOBU[/b] Fusil Combi, Nanopulser, Granadas de Humo / Pistola, Arma CC Monofilo. (0.5 | [b]44[/b])',
    '[imglogoarmy=14]https://assets.example/ryuken.svg[/imglogoarmy] [b]RYŪKEN  (Ataque Sorpresa [-3], Camuflaje [1 Uso])[/b] Lanzacohetes Pesado, Minas Shock / Pistola Pesada, Arma CC. (1.5 | [b]23[/b])',
    '[imglogoarmy=14]https://assets.example/ryuken.svg[/imglogoarmy] [b]RYŪKEN  (Ataque Sorpresa [-3], Camuflaje [1 Uso])[/b] Lanzacohetes Pesado, Minas Shock / Pistola Pesada, Arma CC. (1.5 | [b]23[/b])',
    'GRUPO 2[img]https://assets.example/sep.gif[/img] [img]https://assets.example/regular.png[/img]5 [img]https://assets.example/irregular.png[/img]1 [img]https://assets.example/impetuous.png[/img]2',
    '[imglogoarmy=14]https://assets.example/ninja.svg[/imglogoarmy] [b]NINJA (Hacker, Disp. Hacker Asesino)[/b] Arco Táctico(+1DE), Minas Shock ( ) / Pistola, Arma CC DA(PS=6). (0 | [b]26[/b])',
    '[b] 3.5 CAP | 299 Puntos[/b]',
    '[url=https://infinitytheuniverse.com/army/list/abc]Abrir en Infinity Army[/url]',
  ].join('\n'), realCatalog.profiles);

  assert.equal(result.format, 'infinity-army');
  assert.equal(result.entries.length, 4);
  assert.deepEqual(result.entries.map((entry) => entry.groupName), [
    'Grupo 1',
    'Grupo 1',
    'Grupo 1',
    'Grupo 2',
  ]);
  assert.deepEqual(result.entries.map((entry) => entry.originalName), [
    'SHINOBU',
    'RYŪKEN (Ataque Sorpresa [-3], Camuflaje [1 Uso])',
    'RYŪKEN (Ataque Sorpresa [-3], Camuflaje [1 Uso])',
    'NINJA (Hacker, Disp. Hacker Asesino)',
  ]);
  assert.equal(result.entries[0].lineNumber, 4);
  assert.equal(result.entries[0].points, '44');
  assert.equal(result.entries[1].profileId, result.entries[2].profileId);
  assert.ok(result.entries.every((entry) => entry.profileId), 'every sample unit resolves to a catalog profile');
});

test('importa la lista JSA completa copiada con BBCode e imágenes de Infinity Army', () => {
  const result = parseListImport([
    '[imglogoarmy=14]https://assets.example/jsa.svg[/imglogoarmy][b]Krug Kawaii Samuraii[/b]',
    '──────────────────────────────────────────────────',
    'GRUPO 1[img]https://assets.example/sep.gif[/img] [img]https://assets.example/regular.png[/img]7 [img]https://assets.example/irregular.png[/img]2',
    '[imglogoarmy=14]https://assets.example/shinobu.svg[/imglogoarmy] [b]SHINOBU[/b] Fusil Combi, Nanopulser, Granadas de Humo / Pistola, Arma CC Monofilo. (0.5 | [b]44[/b])',
    '[imglogoarmy=14]https://assets.example/ioann.svg[/imglogoarmy] [b]IOANN BANN[/b] Chain Rifle(+1R), Arco Táctico Viral(+1DE), Granadas(PS=6) / Pistola Pesada AP(+1R), Arma CC AP + T2(PS=4). (0 | [b]30[/b])',
    '[imglogoarmy=14]https://assets.example/ryuken.svg[/imglogoarmy] [b]RYŪKEN  (Ataque Sorpresa [-3], Camuflaje [1 Uso])[/b] Lanzacohetes Pesado, Minas Shock / Pistola Pesada, Arma CC. (1.5 | [b]23[/b])',
    '[imglogoarmy=14]https://assets.example/ryuken.svg[/imglogoarmy] [b]RYŪKEN  (Ataque Sorpresa [-3], Camuflaje [1 Uso])[/b] Lanzacohetes Pesado, Minas Shock / Pistola Pesada, Arma CC. (1.5 | [b]23[/b])',
    '[imglogoarmy=14]https://assets.example/kempei.svg[/imglogoarmy] [b]KEMPEI (Cadena de Mando)[/b] Escopeta de Abordaje / Pistola, Arma CC, Arma CC PARA(-3). (0 | [b]17[/b])',
    '[imglogoarmy=14]https://assets.example/pilot.svg[/imglogoarmy] [b]PILOTO O-YOROI (Observador de Artillería)[/b] Escopeta Ligera, Pulso Flash, Cargas-D / Pistola, Arma CC Shock(PS=7). (0 | [b]11[/b])',
    '[imglogoarmy=14]https://assets.example/robio.svg[/imglogoarmy] [b]ROBIO AIBŌT[/b] Pulso Flash / Arma CC PARA(-3). (0 | [b]7[/b])',
    '[imglogoarmy=14]https://assets.example/pangguling.svg[/imglogoarmy] [b]PANGGULING (Desactivador, Repetidor)[/b]  ( ) / Arma CC PARA(-3). (0 | [b]8[/b])',
    '[imglogoarmy=14]https://assets.example/warcor.svg[/imglogoarmy] [b]WARCOR (Visor 360º)[/b] Pulso Flash ( ) / Pistola Aturdidora, Arma CC PARA(-3). (0 | [b]3[/b])',
    'GRUPO 2[img]https://assets.example/sep.gif[/img] [img]https://assets.example/regular.png[/img]5 [img]https://assets.example/irregular.png[/img]1 [img]https://assets.example/impetuous.png[/img]2',
    '[imglogoarmy=14]https://assets.example/ninja.svg[/imglogoarmy] [b]NINJA (Hacker, Disp. Hacker Asesino)[/b] Arco Táctico(+1DE), Minas Shock ( ) / Pistola, Arma CC DA(PS=6). (0 | [b]26[/b])',
    '[imglogoarmy=14]https://assets.example/kyojin.svg[/imglogoarmy] [b]KYOJIN KILLER[/b] Lanzallamas Pesado, Flammenspeer / Pistola, Arma CC DA(PS=6). (0 | [b]15[/b])',
    '[imglogoarmy=14]https://assets.example/hatamoto.svg[/imglogoarmy] [b]HATAMOTO (Teniente [+1 Orden])[/b] Spitfire / Pistola Pesada, Arma CC Monofilo, Arma CC E/M(PS=4). (+1 | [b]39[/b])',
    '[imglogoarmy=14]https://assets.example/tanko.svg[/imglogoarmy] [b]TANKŌ (Desactivador)[/b] Blitzen, Escopeta Ligera, Disco Baller ( ) / Pistola, Arma CC Monofilo, Arma CC Shock(PS=6). (0 | [b]19[/b])',
    '[imglogoarmy=14]https://assets.example/tanko.svg[/imglogoarmy] [b]TANKŌ (Desactivador)[/b] Blitzen, Escopeta Ligera, Disco Baller ( ) / Pistola, Arma CC Monofilo, Arma CC Shock(PS=6). (0 | [b]19[/b])',
    '[imglogoarmy=14]https://assets.example/atom.svg[/imglogoarmy] [b]ATOM AIBŌT (Sensor)[/b] Fusil Combi, Pulso Flash / Arma CC PARA(-3). (0 | [b]15[/b])',
    '[b] 3.5 CAP | 299 Puntos[/b]',
    '[url=https://infinitytheuniverse.com/army/list/abc]Abrir en Infinity Army[/url]',
  ].join('\n'), realCatalog.profiles);

  assert.equal(result.format, 'infinity-army');
  assert.equal(result.entries.length, 15);
  assert.ok(result.entries.every((entry) => entry.profileId), 'all units resolve to profiles in the catalog');
  assert.equal(result.entries.filter((entry) => entry.groupName === 'Grupo 1').length, 9);
  assert.equal(result.entries.filter((entry) => entry.groupName === 'Grupo 2').length, 6);
  assert.equal(result.entries[0].originalName, 'SHINOBU');
  assert.equal(result.entries[2].profileId, result.entries[3].profileId, 'duplicate Ryuken units are preserved');
  assert.equal(result.entries[12].profileId, result.entries[13].profileId, 'duplicate Tanko units are preserved');
  assert.equal(result.entries[9].originalName, 'NINJA (Hacker, Disp. Hacker Asesino)');
});
