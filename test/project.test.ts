import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, loadProject } from '../src/project.ts';
import { isAbsolute } from 'node:path';
const sample = () => ({ version: 1, name: 'Test', profile: 'uhd-experimental', titles: [{ id: 'a', name: 'A', source: 'clip.mov', chapters: [0, 10] }] });
test('accepts supported project', () => assert.equal(validate(sample()).name, 'Test'));
test('rejects unsupported versions and profiles', () => {
  assert.throws(() => validate({ ...sample(), version: 2 }));
  assert.throws(() => validate({ ...sample(), profile: 'unknown' }));
});
test('rejects duplicate title IDs', () => {
  const p = sample(); p.titles.push(p.titles[0]); assert.throws(() => validate(p), /Duplicate/);
});
test('rejects invalid chapter ordering and values', () => {
  for (const chapters of [[10, 0], [0, 0], [-1], [NaN], [Infinity]]) {
    const p = sample(); p.titles[0].chapters = chapters; assert.throws(() => validate(p), /Chapters/);
  }
});
test('rejects missing fields and empty titles', () => {
  assert.throws(() => validate({ ...sample(), titles: [] }));
  const p = sample(); p.titles[0].source = ''; assert.throws(() => validate(p));
});
test('example resolves sources relative to the project file', async () => {
  const p = await loadProject('examples/lion-of-god.openray.json');
  assert.ok(isAbsolute(p.titles[0].source));
  assert.ok(p.titles[0].source.endsWith('/media/playback-test.mov'));
});
