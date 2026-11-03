import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

export type Project = {
  version: 1;
  name: string;
  profile: 'uhd-experimental' | 'bluray-hd';
  titles: { id: string; name: string; source: string; chapters: number[] }[];
};

export function validate(value: unknown): Project {
  if (!value || typeof value !== 'object') throw new Error('Project must be an object');
  const p = value as Project;
  if (p.version !== 1) throw new Error('Unsupported project version; expected 1');
  if (typeof p.name !== 'string' || !p.name.trim()) throw new Error('Project name is required');
  if (!['uhd-experimental', 'bluray-hd'].includes(p.profile)) throw new Error('Unknown disc profile');
  if (!Array.isArray(p.titles) || !p.titles.length) throw new Error('At least one title is required');
  const ids = new Set<string>();
  for (const t of p.titles) {
    if (!t || typeof t !== 'object') throw new Error('Each title must be an object');
    for (const key of ['id', 'name', 'source'] as const) {
      if (typeof t[key] !== 'string' || !t[key].trim()) throw new Error(`Title ${key} is required`);
    }
    if (ids.has(t.id)) throw new Error(`Duplicate title id: ${t.id}`);
    ids.add(t.id);
    if (!Array.isArray(t.chapters) || t.chapters.some((n, i) =>
      typeof n !== 'number' || !Number.isFinite(n) || n < 0 || (i > 0 && n <= t.chapters[i - 1]))) {
      throw new Error(`Chapters for ${t.id} must be increasing, finite seconds >= 0`);
    }
  }
  return p;
}

export async function loadProject(file: string) {
  const project = validate(JSON.parse(await readFile(file, 'utf8')));
  return { ...project, titles: project.titles.map(t => ({ ...t, source: resolve(dirname(file), t.source) })) };
}
