import { loadProject } from './project.ts';
import { doctor, inspect } from './media.ts';
const [command, file, ...extra] = process.argv.slice(2);
try {
  if (extra.length) throw new Error('Unexpected arguments');
  if (command === 'doctor' && !file) {
    const results = await doctor();
    console.log(JSON.stringify(results, null, 2));
    if (results.some(t => !t.available)) process.exitCode = 1;
  } else if (command === 'validate' && file) {
    const p = await loadProject(file);
    console.log(`Valid project: ${p.name} (${p.titles.length} titles). Media files have not been checked.`);
  } else if (command === 'inspect' && file) {
    console.log(JSON.stringify(await inspect(file), null, 2));
  } else if (command === 'preflight' && file) {
    const p = await loadProject(file);
    let failed = false;
    for (const title of p.titles) {
      try {
        const media = await inspect(title.source);
        if (!media.streams?.some((s: any) => s.codec_type === 'video')) throw new Error('No video stream');
        const duration = Number(media.format?.duration);
        if (title.chapters.length && (!Number.isFinite(duration) || duration <= 0)) throw new Error('Cannot validate chapters without duration');
        if (title.chapters.some(n => n >= duration)) throw new Error('Chapter exceeds title duration');
        console.log(JSON.stringify({ title: title.id, source: title.source, media }));
      } catch (error: any) {
        failed = true;
        console.error(`${title.id}: ${error.message}`);
      }
    }
    console.log('Preflight checks readability and chapter bounds only; disc conformance is not certified.');
    if (failed) process.exitCode = 1;
  } else if (!command || command === '--help') {
    console.log('Open-Ray\n  doctor\n  validate <project.json>\n  inspect <media-file>\n  preflight <project.json>');
  } else {
    throw new Error('Unknown command or missing argument. Use --help.');
  }
} catch (error: any) {
  console.error(`Open-Ray: ${error.message}`);
  process.exitCode = 1;
}
