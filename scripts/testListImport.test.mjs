import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProfileList } from '../src/domain/listImport.mjs';

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
