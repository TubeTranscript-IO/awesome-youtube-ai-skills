#!/usr/bin/env node
// Builds a cut list (CSV with timecodes) for a rough edit: silences, filler words and retakes. Zero dependencies;
// uses ffmpeg (if installed) to find silences in a media file exactly.
// Usage: node edit-list.mjs [--media FILE | --silence-log FILE] [--transcript FILE.json] [--min-silence 0.8]
//          [--noise -35] [--pad 0.15] [--fps 30] [--fillers "um,uh"] [--out DIR] [--name BASE]
// Prints ONE JSON line. Exit 0 ok, 1 usage or input error, 3 ffmpeg missing.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.1.0';
// Hesitation sounds only. Words like "like" or "so" are too often real words to cut automatically.
const DEFAULT_FILLERS = ['um', 'umm', 'uh', 'uhh', 'uhm', 'erm', 'er', 'ah', 'hmm', 'mm', 'ờ', 'ừ', 'ừm', 'ừa', 'ơ', 'à', 'ầy', 'ehm', 'äh', 'ähm', 'euh', 'eh'];

class Stop extends Error { constructor(exit, code, message) { super(message); this.exit = exit; this.code = code; } }

/** silence_start / silence_end pairs from ffmpeg silencedetect output. */
export function parseSilenceLog(log) {
  const out = [];
  let start = null;
  for (const line of log.split(/\r?\n/)) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (s) start = Math.max(0, Number(s[1]));
    if (e && start !== null) { out.push({ start, end: Number(e[1]) }); start = null; }
  }
  return out;
}

function detectSilences(media, noise, minSilence) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', media, '-af', `silencedetect=noise=${noise}dB:d=${minSilence}`, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error?.code === 'ENOENT') throw new Stop(3, 'FFMPEG_MISSING', 'ffmpeg is not installed. Install it (macOS: brew install ffmpeg, Ubuntu: sudo apt install ffmpeg, Windows: winget install ffmpeg) or run without --media to use transcript gaps only.');
  if (result.status !== 0) throw new Stop(1, 'FFMPEG_FAILED', `ffmpeg could not read the file: ${(result.stderr || '').trim().split('\n').at(-1)}`);
  return parseSilenceLog(result.stderr);
}

/** Gaps between caption segments: a rough stand-in for silences when no media file is available. */
export function transcriptGaps(chunks, minSilence) {
  const out = [];
  for (let i = 0; i < chunks.length - 1; i++) {
    const end = Number(chunks[i].start) + Number(chunks[i].duration || 0);
    const next = Number(chunks[i + 1].start);
    if (next - end >= minSilence) out.push({ start: end, end: next });
  }
  return out;
}

const words = text => String(text).toLowerCase().normalize('NFC').match(/[\p{L}\p{N}']+/gu) ?? [];

/** Filler words inside caption segments; the time is estimated from the word's position in its segment. */
export function findFillers(chunks, fillers) {
  const set = new Set(fillers.map(f => f.toLowerCase().normalize('NFC')));
  const out = [];
  for (const chunk of chunks) {
    const text = String(chunk.text).normalize('NFC');
    const start = Number(chunk.start), duration = Number(chunk.duration || 0);
    for (const match of text.matchAll(/[\p{L}\p{N}']+/gu)) {
      if (!set.has(match[0].toLowerCase())) continue;
      const at = start + (duration * match.index) / Math.max(text.length, 1);
      const end = duration > 0 ? Math.min(start + duration, at + 0.6) : at + 0.6;
      out.push({ start: Math.max(start, at - 0.15), end, word: match[0], segment: text.trim() });
    }
  }
  return out;
}

/** A segment followed within 3 segments by one that opens with the same 4 words: the earlier one was a flubbed take. */
export function findRetakes(chunks) {
  const out = [];
  for (let i = 0; i < chunks.length; i++) {
    const head = words(chunks[i].text).slice(0, 4).join(' ');
    if (head.split(' ').length < 4) continue;
    for (let j = i + 1; j <= Math.min(i + 3, chunks.length - 1); j++) {
      if (words(chunks[j].text).slice(0, 4).join(' ') === head) {
        out.push({ start: Number(chunks[i].start), end: Number(chunks[j].start), segment: String(chunks[i].text).trim(), kept: String(chunks[j].text).trim() });
        break;
      }
    }
  }
  return out;
}

export function timecode(seconds, fps) {
  const frames = Math.round(Math.max(0, seconds) * fps);
  const f = frames % fps, total = Math.floor(frames / fps);
  const two = n => String(n).padStart(2, '0');
  return `${two(Math.floor(total / 3600))}:${two(Math.floor(total / 60) % 60)}:${two(total % 60)}:${two(f)}`;
}

const csvCell = value => /[",\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value);

export function buildCuts({ silences, fillers, retakes, pad, source }) {
  const cuts = [
    ...silences.map(s => ({ start: s.start + pad, end: s.end - pad, type: 'silence', confidence: source === 'media' ? 'high' : 'low', note: source === 'media' ? 'measured silence' : 'gap between captions (approximate)' })),
    ...fillers.map(f => ({ start: f.start, end: f.end, type: 'filler', confidence: 'review', note: `"${f.word}" in: ${f.segment}` })),
    ...retakes.map(r => ({ start: r.start, end: r.end, type: 'retake', confidence: 'review', note: `cut: ${r.segment} | kept: ${r.kept}` })),
  ].filter(c => c.end - c.start >= 0.2);
  return cuts.sort((a, b) => a.start - b.start);
}

function parseArgs(argv) {
  const args = { minSilence: 0.8, noise: -35, pad: 0.15, fps: 30, fillers: DEFAULT_FILLERS, out: 'transcripts' };
  const take = (i, name) => { if (argv[i + 1] === undefined) throw new Stop(1, 'USAGE', `${name} needs a value.`); return argv[i + 1]; };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--media') args.media = take(i++, a);
    else if (a === '--silence-log') args.silenceLog = take(i++, a);
    else if (a === '--transcript') args.transcript = take(i++, a);
    else if (a === '--min-silence') args.minSilence = Number(take(i++, a));
    else if (a === '--noise') args.noise = Number(take(i++, a));
    else if (a === '--pad') args.pad = Number(take(i++, a));
    else if (a === '--fps') args.fps = Number(take(i++, a));
    else if (a === '--fillers') args.fillers = take(i++, a).split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--out') args.out = take(i++, a);
    else if (a === '--name') args.name = take(i++, a);
    else throw new Stop(1, 'USAGE', `Unknown argument: ${a}`);
  }
  if (!args.media && !args.silenceLog && !args.transcript) throw new Stop(1, 'USAGE', 'Pass --media <video or audio file> and/or --transcript <file.json from youtube-transcript --format json>.');
  if (args.transcript && !args.transcript.endsWith('.json')) throw new Stop(1, 'USAGE', '--transcript needs the .json file (youtube-transcript --format json): filler and retake times need segment durations.');
  for (const [name, value] of [['--min-silence', args.minSilence], ['--pad', args.pad], ['--fps', args.fps]]) {
    if (!Number.isFinite(value) || value < 0 || (name === '--fps' && value < 1)) throw new Stop(1, 'USAGE', `${name} must be a positive number.`);
  }
  return args;
}

export function run(argv) {
  const args = parseArgs(argv);
  const chunks = args.transcript ? JSON.parse(readFileSync(args.transcript, 'utf8')).chunks ?? [] : [];
  let silences = [], source = 'none';
  if (args.silenceLog) { silences = parseSilenceLog(readFileSync(args.silenceLog, 'utf8')); source = 'media'; }
  else if (args.media) { silences = detectSilences(args.media, args.noise, args.minSilence); source = 'media'; }
  else if (chunks.length) { silences = transcriptGaps(chunks, args.minSilence); source = 'transcript'; }
  const cuts = buildCuts({ silences, fillers: chunks.length ? findFillers(chunks, args.fillers) : [], retakes: chunks.length ? findRetakes(chunks) : [], pad: args.pad, source });
  const name = args.name || basename(args.media || args.silenceLog || args.transcript).replace(/\.[^.]+$/, '');
  mkdirSync(resolve(args.out), { recursive: true });
  const path = join(resolve(args.out), `${name}.edits.csv`);
  const rows = cuts.map(c => [timecode(c.start, args.fps), timecode(c.end, args.fps), c.start.toFixed(2), c.end.toFixed(2), (c.end - c.start).toFixed(2), c.type, c.confidence, c.note].map(csvCell).join(','));
  writeFileSync(path, `start_tc,end_tc,start_s,end_s,duration_s,type,confidence,note\n${rows.join('\n')}${rows.length ? '\n' : ''}`);
  const count = type => cuts.filter(c => c.type === type).length;
  const seconds = type => Number(cuts.filter(c => c.type === type).reduce((t, c) => t + c.end - c.start, 0).toFixed(1));
  return {
    exit: 0,
    output: {
      ok: true, version: VERSION, path, fps: args.fps, silence_source: source,
      cuts: { silence: count('silence'), filler: count('filler'), retake: count('retake') },
      seconds: { silence: seconds('silence'), filler: seconds('filler'), retake: seconds('retake') },
    },
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const { exit, output } = run(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(output)}\n`);
    process.exitCode = exit;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, code: error.code || 'ERROR', message: error.message })}\n`);
    process.exitCode = error.exit || 1;
  }
}
