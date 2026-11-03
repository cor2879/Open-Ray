import { test } from 'node:test';
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { build, runTool } from '../src/build.ts';

test('real FFmpeg + tsMuxer UHD ISO smoke test', { skip: !process.env.OPEN_RAY_INTEGRATION, timeout: 180000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-ray-'));
  try {
    await runTool('ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=3840x2160:r=24:d=1', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1', '-map', '0:v', '-map', '1:a', '-c:v', 'libx265', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p10le', '-x265-params', 'pools=2:frame-threads=1:log-level=error', '-c:a', 'ac3', '-ac', '2', '-b:a', '192k', '-shortest', 'clip.mkv'], dir);
    const project = join(dir, 'project.json');
    await writeFile(project, JSON.stringify({ version: 1, name: 'Synthetic UHD test', profile: 'uhd-experimental', titles: [{ id: 'test', name: 'Test', source: 'clip.mkv', chapters: [0, 0.5] }] }));
    const output = join(dir, 'output');
    await build(project, output, 'iso');
    assert.ok((await stat(join(output, 'disc.iso'))).size > 32768);
    const report = JSON.parse(await readFile(join(output, 'build-report.json'), 'utf8'));
    assert.match(report.isoSha256, /^[a-f0-9]{64}$/);
    await assert.rejects(build(project, output, 'iso'), /EEXIST/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
