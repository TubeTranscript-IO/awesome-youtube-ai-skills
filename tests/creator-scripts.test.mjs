// Creator skill scripts: chapters check, edit list and retention analysis, run as child processes like an agent would.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const CHAPTERS = join(root, 'skills/youtube-chapters/scripts/check-chapters.mjs');
const EDITS = join(root, 'skills/youtube-edit-list/scripts/edit-list.mjs');
const RETENTION = join(root, 'skills/youtube-retention-analyzer/scripts/retention.mjs');

const dir = () => realpathSync(mkdtempSync(join(tmpdir(), 'tt-creator-')));
function run(script, args, cwd) {
  return new Promise(done => execFile(process.execPath, [script, ...args], { cwd, env: { PATH: process.env.PATH } },
    (error, stdout) => done({ code: error ? error.code : 0, json: JSON.parse(stdout.trim().split('\n').pop()) })));
}
const write = (cwd, name, text) => { writeFileSync(join(cwd, name), text); return join(cwd, name); };

test('chapters: a valid list passes, with the length taken from the transcript', async () => {
  const cwd = dir();
  const list = write(cwd, 'c.txt', '0:00 Intro\n0:47 Why cache\n1:58 Cache-Control\n4:26 How ETags work\n');
  const md = write(cwd, 't.md', '# T\n\n[00:00] hi\n[04:26] etags\n[08:46] thanks\n');
  const { code, json } = await run(CHAPTERS, [list, '--transcript', md], cwd);
  assert.equal(code, 0); assert.equal(json.ok, true); assert.equal(json.chapters.length, 4); assert.equal(json.duration_seconds, 531);
  assert.deepEqual(json.errors, []);
});

test('chapters: every YouTube rule is reported', async () => {
  const cwd = dir();
  const list = write(cwd, 'c.txt', '0:05 Intro\n0:10 Too short\n0:09 Backwards\n');
  const { code, json } = await run(CHAPTERS, [list, '--duration', '600'], cwd);
  assert.equal(code, 1);
  const all = json.errors.join(' | ');
  assert.match(all, /must start at 0:00/); assert.match(all, /lasts 5 s/); assert.match(all, /0:09 does not come after 0:10/);
  const two = await run(CHAPTERS, [write(cwd, 'd.txt', '00:00 - Start\n(1:00) End\n'), '--duration', '20'], cwd);
  assert.match(two.json.errors.join(' | '), /at least 3 chapters/); assert.match(two.json.errors.join(' | '), /past the end/);
});

test('chapters: without a length the last chapter is not checked, with a warning', async () => {
  const cwd = dir();
  const { code, json } = await run(CHAPTERS, [write(cwd, 'c.txt', '0:00 A\n1:00 B\n1:01:00 C\n')], cwd);
  assert.equal(code, 0); assert.match(json.warnings[0], /length unknown/); assert.equal(json.chapters[2].seconds, 3660);
});

const transcriptJson = {
  video_id: 'x', chunks: [
    { start: 0, duration: 3, text: 'so um today we look at caching' },
    { start: 6.5, duration: 3, text: 'the first thing you need is' },
    { start: 9.5, duration: 2, text: 'the first thing you need is a header' },
    { start: 11.5, duration: 4, text: 'ờ cái này rất quan trọng' },
  ],
};

test('edit list: silences from an ffmpeg log, fillers and retakes from the transcript, with frame timecodes', async () => {
  const cwd = dir();
  const log = write(cwd, 'silence.log', '[silencedetect @ 0x1] silence_start: 3.2\n[silencedetect @ 0x1] silence_end: 6.4 | silence_duration: 3.2\n[silencedetect @ 0x1] silence_start: 15.6\n[silencedetect @ 0x1] silence_end: 16.1 | silence_duration: 0.5\n');
  const tx = write(cwd, 'v.en.json', JSON.stringify(transcriptJson));
  const { code, json } = await run(EDITS, ['--silence-log', log, '--transcript', tx, '--fps', '25', '--name', 'v'], cwd);
  assert.equal(code, 0); assert.equal(json.silence_source, 'media');
  assert.deepEqual(json.cuts, { silence: 2, filler: 2, retake: 1 });
  const rows = readFileSync(json.path, 'utf8').trim().split('\n');
  assert.equal(rows[0], 'start_tc,end_tc,start_s,end_s,duration_s,type,confidence,note');
  const silence = rows.find(r => r.includes(',silence,'));
  assert.ok(silence.startsWith('00:00:03:09,00:00:06:06,3.35,6.25,2.90,silence,high'), silence);
  assert.ok(rows.some(r => r.includes(',retake,review,') && r.includes('cut: the first thing you need is |')));
  assert.ok(rows.some(r => r.includes('""um""')) && rows.some(r => r.includes('""ờ""')));
});

test('edit list: without media, caption gaps stand in for silences at low confidence', async () => {
  const cwd = dir();
  const tx = write(cwd, 'v.en.json', JSON.stringify(transcriptJson));
  const { code, json } = await run(EDITS, ['--transcript', tx], cwd);
  assert.equal(code, 0); assert.equal(json.silence_source, 'transcript'); assert.equal(json.cuts.silence, 1);
  assert.match(readFileSync(json.path, 'utf8'), /,silence,low,gap between captions/);
});

test('edit list: a missing media file or a .md transcript is a clear usage error', async () => {
  const cwd = dir();
  const md = await run(EDITS, ['--transcript', write(cwd, 'v.en.md', '# x')], cwd);
  assert.equal(md.code, 1); assert.match(md.json.message, /needs the \.json file/);
  const none = await run(EDITS, [], cwd);
  assert.equal(none.code, 1); assert.equal(none.json.code, 'USAGE');
});

const retentionCsv = rows => 'Video position (%),Absolute audience retention (%)\n' + rows.map(([p, r]) => `${p},${r}`).join('\n') + '\n';

test('retention: finds the steepest dip and spike after the intro and attaches the transcript lines', async () => {
  const cwd = dir();
  // 200 s video, one point per 2 %: smooth decline with a sharp dip at 40 % (80 s) and a rewatch spike at 70 % (140 s).
  const points = [];
  let r = 100;
  for (let p = 0; p <= 100; p += 2) {
    if (p > 0) r -= p <= 14 ? 6 : 0.4;
    if (p === 40) r -= 9;
    if (p === 70) r += 6;
    points.push([p, r.toFixed(1)]);
  }
  const csv = write(cwd, 'r.csv', retentionCsv(points));
  const tx = write(cwd, 't.md', '# T\n\n[00:00] Hi\n[01:05] Before we start, a quick story about my week\n[01:20] anyway the history of this\n[02:18] here is the exact command\n[03:15] bye\n');
  const { code, json } = await run(RETENTION, [csv, '--transcript', tx, '--duration', '200'], cwd);
  assert.equal(code, 0); assert.equal(json.position_scale, 'percent');
  assert.equal(json.dips[0].time, '01:16'); assert.equal(json.dips[0].change, -9.4);
  assert.ok(json.dips[0].said.some(l => l.includes('Before we start')));
  assert.equal(json.spikes[0].time, '02:16'); assert.ok(json.spikes[0].said.some(l => l.includes('exact command')));
  assert.ok(json.intro.lost_in_first_30s > 25);
});

test('retention: relative positions without a length, or unknown columns, are explained', async () => {
  const cwd = dir();
  const csv = write(cwd, 'r.csv', retentionCsv([[0, 100], [0.25, 80], [0.5, 70], [0.75, 60], [1, 50]]));
  const noLength = await run(RETENTION, [csv], cwd);
  assert.equal(noLength.code, 1); assert.equal(noLength.json.code, 'DURATION_NEEDED');
  const odd = write(cwd, 'o.csv', 'a,b\n1,2\n2,3\n3,4\n4,5\n5,6\n');
  const cols = await run(RETENTION, [odd, '--duration', '60'], cwd);
  assert.equal(cols.json.code, 'COLUMNS_NOT_FOUND'); assert.match(cols.json.message, /--position-column/);
  const named = await run(RETENTION, [odd, '--duration', '60', '--position-column', 'a', '--retention-column', 'b'], cwd);
  assert.equal(named.code, 0); assert.equal(named.json.position_scale, 'seconds');
});

test('chapters: a dense list for the video length gets a merge warning but still passes', async () => {
  const cwd = dir();
  const list = write(cwd, 'c.txt', ['0:00 A', '0:30 B', '1:00 C', '1:30 D', '2:00 E', '2:30 F'].join('\n'));
  const { code, json } = await run(CHAPTERS, [list, '--duration', '200'], cwd);
  assert.equal(code, 0); assert.match(json.warnings.join(' '), /6 chapters for a 3-minute video/);
});
