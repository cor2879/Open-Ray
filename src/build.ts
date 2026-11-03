import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { loadProject } from './project.ts';
import { inspect } from './media.ts';

export function chapterTime(seconds: number) {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

export function muxMeta(chapters: number[], fps: string) {
  if (!/^\d+(\/\d+)?$/.test(fps)) throw new Error('Invalid frame rate');
  const times = chapters.map(chapterTime);
  if (new Set(times).size !== times.length) throw new Error('Chapters collide at millisecond precision');
  return [
    `MUXOPT --blu-ray-v3 --vbr${times.length ? ` --custom-chapters=${times.join(';')}` : ''}`,
    `V_MPEGH/ISO/HEVC, "video.hevc", fps=${fps.includes('/') ? Number(fps.split('/')[0]) / Number(fps.split('/')[1]) : fps}`,
    'A_AC3, "audio.ac3", lang=eng', '',
  ].join('\n');
}

export function checkMedia(media: any, chapters: number[]) {
  const videos = media.streams?.filter((s: any) => s.codec_type === 'video' && !s.disposition?.attached_pic) ?? [];
  const audios = media.streams?.filter((s: any) => s.codec_type === 'audio') ?? [];
  if (videos.length !== 1 || audios.length !== 1) throw new Error('Prototype requires exactly one video and one audio stream');
  const v = videos[0], a = audios[0];
  if (v.codec_name !== 'hevc' || v.width !== 3840 || v.height !== 2160 || v.pix_fmt !== 'yuv420p10le') {
    throw new Error('Prototype requires 3840x2160 HEVC 10-bit 4:2:0 video; encode separately first');
  }
  const fps = v.avg_frame_rate;
  if (!['24000/1001', '24/1', '25/1', '30000/1001', '30/1'].includes(fps)) throw new Error('Frame rate not supported by this prototype');
  if (v.r_frame_rate !== fps) throw new Error('Prototype requires matching nominal and average frame rates');
  if (a.codec_name !== 'ac3' || Number(a.sample_rate) !== 48000 || ![2, 6].includes(a.channels)) {
    throw new Error('Prototype requires 48kHz AC-3 stereo or 5.1 audio');
  }
  const duration = Number(media.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Source duration is unavailable');
  if (chapters.some(t => t >= duration)) throw new Error('Chapter exceeds title duration');
  return { fps, duration, videoIndex: v.index, audioIndex: a.index };
}

export async function runTool(executable: string, args: string[], cwd: string) {
  await new Promise<void>((accept, reject) => {
    const child = spawn(executable, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'], shell: false });
    child.once('error', reject);
    child.once('close', (code, signal) => code === 0 ? accept() : reject(new Error(`${executable} failed (${signal ?? code})`)));
  });
}

async function checksum(file: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function build(projectFile: string, output: string, kind: string, backend = process.env.OPEN_RAY_TSMUXER || 'tsMuxeR') {
  if (!['iso', 'folder'].includes(kind)) throw new Error('Output kind must be iso or folder');
  const project = await loadProject(projectFile);
  if (project.profile !== 'uhd-experimental' || project.titles.length !== 1) throw new Error('Build currently supports one uhd-experimental title only');
  const title = project.titles[0];
  const media = await inspect(title.source);
  const checked = checkMedia(media, title.chapters);
  const meta = muxMeta(title.chapters, checked.fps);
  const dir = resolve(output);
  // Exclusive creation refuses existing output directories, including partial builds.
  await mkdir(dir);
  const started = new Date().toISOString();
  try {
    await writeFile(join(dir, 'disc.meta'), meta, { flag: 'wx' });
    await runTool('ffmpeg', ['-nostdin', '-v', 'error', '-n', '-i', title.source, '-map', `0:${checked.videoIndex}`, '-c:v', 'copy', '-bsf:v', 'hevc_mp4toannexb', '-f', 'hevc', 'video.hevc'], dir);
    await runTool('ffmpeg', ['-nostdin', '-v', 'error', '-n', '-i', title.source, '-map', `0:${checked.audioIndex}`, '-c:a', 'copy', '-f', 'ac3', 'audio.ac3'], dir);
    const artifact = kind === 'iso' ? 'disc.iso' : 'disc';
    await runTool(backend, ['disc.meta', artifact], dir);
    if (kind === 'iso') {
      if (!(await stat(join(dir, artifact))).isFile() || (await stat(join(dir, artifact))).size === 0) throw new Error('Backend did not produce a nonempty ISO');
    } else {
      for (const file of ['BDMV/index.bdmv', 'BDMV/MovieObject.bdmv', 'BDMV/PLAYLIST/00000.mpls', 'BDMV/STREAM/00000.m2ts']) {
        if (!(await stat(join(dir, artifact, file))).isFile()) throw new Error(`Missing authored file: ${file}`);
      }
    }
    const report = {
      status: 'built-unverified', project: project.name, started, completed: new Date().toISOString(),
      backend, source: title.source, sourceSha256: await checksum(title.source), media,
      chapters: title.chapters, artifact, isoSha256: kind === 'iso' ? await checksum(join(dir, artifact)) : undefined,
      limitations: ['No menus', 'Single title', 'Disc conformance and hardware playback unverified', 'No encoding or color conversion performed'],
    };
    await writeFile(join(dir, 'build-report.json'), JSON.stringify(report, null, 2));
    await rm(join(dir, 'video.hevc')); await rm(join(dir, 'audio.ac3'));
    return dir;
  } catch (error: any) {
    // Retain diagnostic files and partial outputs; never advertise them as successful.
    await writeFile(join(dir, 'build-failure.json'), JSON.stringify({ status: 'failed', error: error.message, started }, null, 2));
    throw error;
  }
}
