import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, stat } from 'node:fs/promises';
const exec = promisify(execFile);

export async function doctor() {
  return Promise.all([
    ['ffprobe', ['-version']], ['ffmpeg', ['-version']], ['tsMuxeR', []],
  ].map(async ([name, args]) => {
    try {
      const { stdout, stderr } = await exec(name as string, args as string[], { timeout: 10000 });
      return { tool: name, available: true, version: (stdout || stderr).split('\n')[0] };
    } catch (error: any) {
      return { tool: name, available: false, detail: error.code === 'ENOENT' ? 'Not found on PATH' : String(error.message) };
    }
  }));
}

export async function inspect(source: string) {
  await access(source);
  if (!(await stat(source)).isFile()) throw new Error(`Not a file: ${source}`);
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', source], {
    timeout: 30000, maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}
