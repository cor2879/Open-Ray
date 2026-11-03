import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapterTime, muxMeta, checkMedia } from '../src/build.ts';
const fixture = () => ({ format: { duration: '10' }, streams: [
  { index: 0, codec_type: 'video', codec_name: 'hevc', width: 3840, height: 2160, pix_fmt: 'yuv420p10le', avg_frame_rate: '24000/1001', r_frame_rate: '24000/1001' },
  { index: 1, codec_type: 'audio', codec_name: 'ac3', sample_rate: '48000', channels: 2 },
] });
test('chapter timestamps round through minute/hour boundaries', () => {
  assert.equal(chapterTime(59.9999), '00:01:00.000');
  assert.equal(chapterTime(3600.123), '01:00:00.123');
});
test('UHD metadata uses elementary streams and custom chapters', () => {
  const meta = muxMeta([0, 2.5], '24000/1001');
  assert.match(meta, /--blu-ray-v3/); assert.match(meta, /00:00:00.000;00:00:02.500/);
  assert.match(meta, /V_MPEGH\/ISO\/HEVC/);
  assert.throws(() => muxMeta([0, 0.0001], '24/1'), /collide/);
  assert.throws(() => muxMeta([], '24\nMUXOPT'), /frame rate/);
});
test('accepts narrow UHD test input', () => assert.equal(checkMedia(fixture(), [0, 5]).duration, 10));
test('rejects incompatible video, audio, extra streams and chapter bounds', () => {
  let m = fixture(); m.streams[0].width = 1920; assert.throws(() => checkMedia(m, []), /3840/);
  m = fixture(); m.streams[1].codec_name = 'aac'; assert.throws(() => checkMedia(m, []), /AC-3/);
  m = fixture(); m.streams.push(m.streams[1]); assert.throws(() => checkMedia(m, []), /exactly/);
  assert.throws(() => checkMedia(fixture(), [10]), /Chapter/);
  m = fixture(); m.streams[0].r_frame_rate = '30/1'; assert.throws(() => checkMedia(m, []), /matching/);
});
