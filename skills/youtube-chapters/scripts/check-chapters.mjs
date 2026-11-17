#!/usr/bin/env node
// Checks a YouTube chapter list against the rules YouTube applies before it shows chapters: the first timestamp is
// 0:00, there are at least 3 chapters, times go up, and every chapter lasts at least 10 seconds. Zero dependencies.
// Usage: node check-chapters.mjs <chapters.txt | -> [--duration SECONDS | --transcript FILE.json|FILE.md]
// Prints ONE JSON line: { ok, chapters, errors, warnings }. Exit 0 when YouTube would accept the list, 1 otherwise.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.1.0';
const MIN_CHAPTERS = 3;
const MIN_SECONDS = 10;
const LINE = /^\s*(?:[-*]\s*)?\(?((?:\d{1,2}:)?\d{1,2}:\d{2})\)?\s*(?:[-–—:|]\s*)?(.*\S)?\s*$/;

export function toSeconds(stamp) {
  return stamp.split(':').map(Number).reduce((total, part) => total * 60 + part, 0);
}

export function stamp(seconds) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  const two = n => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/** Video length from a transcript saved by the youtube-transcript skill: exact from .json, approximate from .md. */
export function durationFromTranscript(path) {
  const text = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) {
    const last = JSON.parse(text).chunks?.at(-1);
    return last ? Math.ceil(Number(last.start) + Number(last.duration || 0)) : null;
  }
  const times = [...text.matchAll(/^\[((?:\d+:)?\d{1,2}:\d{2})\]/gm)].map(m => toSeconds(m[1]));
  return times.length ? times.at(-1) + 5 : null;
}

export function parseChapters(text) {
  return text.split(/\r?\n/).map(line => line.match(LINE)).filter(Boolean)
    .map(([, time, title = '']) => ({ time, seconds: toSeconds(time), title: title.trim() }));
}

export function checkChapters(chapters, duration = null) {
  const errors = [], warnings = [];
  if (chapters.length < MIN_CHAPTERS) errors.push(`YouTube needs at least ${MIN_CHAPTERS} chapters; found ${chapters.length}.`);
  if (chapters.length && chapters[0].seconds !== 0) errors.push(`The first chapter must start at 0:00; it starts at ${chapters[0].time}.`);
  chapters.forEach((chapter, i) => {
    const next = chapters[i + 1];
    const end = next ? next.seconds : duration;
    if (next && next.seconds <= chapter.seconds) errors.push(`${next.time} does not come after ${chapter.time}.`);
    else if (end !== null && end !== undefined && end - chapter.seconds < MIN_SECONDS) {
      errors.push(`"${chapter.title || chapter.time}" (${chapter.time}) lasts ${end - chapter.seconds} s; each chapter needs at least ${MIN_SECONDS} s.`);
    }
    if (!chapter.title) errors.push(`The chapter at ${chapter.time} has no title.`);
    else if (chapter.title.length > 60) warnings.push(`"${chapter.title.slice(0, 30)}..." is ${chapter.title.length} characters; long titles are cut off on the progress bar.`);
    if (duration && chapter.seconds >= duration) errors.push(`${chapter.time} is past the end of the video (${stamp(duration)}).`);
  });
  if (duration && chapters.length > Math.max(MIN_CHAPTERS, Math.round(duration / 60))) {
    warnings.push(`${chapters.length} chapters for a ${Math.round(duration / 60)}-minute video is a lot: chapters under about a minute crowd the progress bar. Merge sub-topics into their parent chapter.`);
  }
  if (duration === null) warnings.push('Video length unknown: the last chapter\'s length was not checked. Pass --duration or --transcript.');
  return { ok: errors.length === 0, errors, warnings };
}

function parseArgs(argv) {
  const args = { input: null, duration: null, transcript: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--duration') args.duration = Number(argv[++i]);
    else if (argv[i] === '--transcript') args.transcript = argv[++i];
    else if (!args.input) args.input = argv[i];
  }
  return args;
}

export function run(argv) {
  const args = parseArgs(argv);
  if (!args.input) return { exit: 1, output: { ok: false, errors: ['Pass a file with one "0:00 Title" line per chapter, or - for stdin.'] } };
  const text = readFileSync(args.input === '-' ? 0 : args.input, 'utf8');
  const duration = Number.isFinite(args.duration) && args.duration > 0 ? args.duration : args.transcript ? durationFromTranscript(args.transcript) : null;
  const chapters = parseChapters(text);
  const verdict = checkChapters(chapters, duration);
  return { exit: verdict.ok ? 0 : 1, output: { ...verdict, version: VERSION, duration_seconds: duration, chapters } };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const { exit, output } = run(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(output)}\n`);
    process.exitCode = exit;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, errors: [error.message] })}\n`);
    process.exitCode = 1;
  }
}
