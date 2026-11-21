#!/usr/bin/env node
// Finds the moments where viewers leave (dips) or rewatch (spikes) in an audience-retention CSV exported from
// YouTube Studio, and attaches what was being said at each moment. Zero dependencies.
// Usage: node retention.mjs <retention.csv> --transcript FILE.md|FILE.json [--duration SECONDS]
//          [--position-column NAME] [--retention-column NAME] [--top 5]
// Prints ONE JSON line. Exit 0 ok, 1 usage or input error.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.2.0';
const INTRO_SECONDS = 30;

class Stop extends Error { constructor(code, message) { super(message); this.code = code; } }

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === '\t' || c === ';') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(v => v.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(v => v.trim())) rows.push(row);
  return rows;
}

const number = value => {
  const v = String(value).trim().replace('%', '').replace(',', '.');
  if (/^\d+(:\d{1,2}){1,2}$/.test(v)) return v.split(':').map(Number).reduce((t, p) => t * 60 + p, 0);
  return v === '' ? NaN : Number(v);
};

function pickColumn(headers, wanted, patterns) {
  if (wanted) {
    const i = headers.findIndex(h => h.trim().toLowerCase() === wanted.toLowerCase());
    if (i < 0) throw new Stop('COLUMN_NOT_FOUND', `No column named "${wanted}". Columns: ${headers.join(', ')}`);
    return i;
  }
  for (const pattern of patterns) {
    const i = headers.findIndex(h => pattern.test(h));
    if (i >= 0) return i;
  }
  return -1;
}

/** Transcript lines { start, text } from the youtube-transcript skill's .md or .json file. */
export function readTranscript(path) {
  const text = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) return (JSON.parse(text).chunks ?? []).map(c => ({ start: Number(c.start), end: Number(c.start) + Number(c.duration || 0), text: String(c.text).trim() }));
  return [...text.matchAll(/^\[((?:\d+:)?\d{1,2}:\d{2})\]\s*(.*)$/gm)].map(m => ({ start: m[1].split(':').map(Number).reduce((t, p) => t * 60 + p, 0), text: m[2].trim() }));
}

const stamp = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; const two = n => String(n).padStart(2, '0'); return h ? `${h}:${two(m)}:${two(r)}` : `${two(m)}:${two(r)}`; };

/** Points { seconds, retention (percent) } from the CSV, positions scaled to seconds. */
export function readPoints(rows, { duration, positionColumn, retentionColumn }) {
  const headers = rows[0].map(h => h.trim());
  const p = pickColumn(headers, positionColumn, [/position/i, /moment|time|second|thời điểm|vị trí/i]);
  const r = pickColumn(headers, retentionColumn, [/absolute.*retention|retention.*absolute/i, /retention|giữ chân/i, /audience|watching|viewers|người xem/i]);
  if (p < 0 || r < 0 || p === r) throw new Stop('COLUMNS_NOT_FOUND', `Could not tell which columns hold the video position and the retention. Columns: ${headers.join(', ')}. Pass --position-column and --retention-column.`);
  let points = rows.slice(1).map(row => ({ position: number(row[p]), retention: number(row[r]) })).filter(pt => Number.isFinite(pt.position) && Number.isFinite(pt.retention));
  if (points.length < 5) throw new Stop('TOO_FEW_POINTS', `Only ${points.length} usable rows. Export the audience retention data for a single video.`);
  const maxPos = Math.max(...points.map(pt => pt.position));
  const relative = /%|percent|ratio/i.test(headers[p]) || maxPos <= 1.0001 || (maxPos <= 100 && duration && duration > 120);
  if (relative && !duration) throw new Stop('DURATION_NEEDED', 'Positions are relative (percent or 0-1), so the video length is needed: pass --duration or --transcript.');
  const scale = !relative ? 1 : maxPos <= 1.0001 ? duration : duration / 100;
  const maxRet = Math.max(...points.map(pt => pt.retention));
  const retScale = maxRet <= 1.5 ? 100 : 1;
  points = points.map(pt => ({ seconds: pt.position * scale, retention: pt.retention * retScale })).sort((a, b) => a.seconds - b.seconds);
  return { points, columns: { position: headers[p], retention: headers[r] }, position_scale: relative ? (maxPos <= 1.0001 ? 'ratio' : 'percent') : 'seconds' };
}

function retentionAt(points, seconds) {
  for (let i = 1; i < points.length; i++) {
    if (points[i].seconds >= seconds) {
      const a = points[i - 1], b = points[i];
      return a.retention + ((b.retention - a.retention) * (seconds - a.seconds)) / Math.max(b.seconds - a.seconds, 1e-9);
    }
  }
  return points.at(-1).retention;
}

const median = values => { const s = [...values].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/** Steepest drops and rises after the intro, merged when adjacent, with a noise floor from the median step. */
export function findEvents(points, top) {
  const steps = [];
  for (let i = 1; i < points.length; i++) steps.push({ from: points[i - 1], to: points[i], change: points[i].retention - points[i - 1].retention });
  const later = steps.filter(s => s.from.seconds >= INTRO_SECONDS);
  const typical = median(later.map(s => Math.abs(s.change)));
  const merge = (list) => list.reduce((out, s) => {
    const last = out.at(-1);
    if (last && Math.abs(last.to.seconds - s.from.seconds) < 1e-6) { last.to = s.to; last.change += s.change; } else out.push({ ...s });
    return out;
  }, []);
  const dips = merge(later.filter(s => s.change < 0 && -s.change >= Math.max(1.5, 2.5 * typical))).sort((a, b) => a.change - b.change).slice(0, top);
  const spikes = merge(later.filter(s => s.change > 0 && s.change >= Math.max(1, 2.5 * typical))).sort((a, b) => b.change - a.change).slice(0, top);
  return { dips, spikes, typical_step: Number(typical.toFixed(2)) };
}

function describe(event, lines) {
  const at = event.from.seconds;
  return {
    time: stamp(at), seconds: Math.round(at), until: stamp(event.to.seconds),
    change: Number(event.change.toFixed(1)), retention_before: Number(event.from.retention.toFixed(1)), retention_after: Number(event.to.retention.toFixed(1)),
    said: lines.filter(l => l.start >= at - 20 && l.start <= event.to.seconds + 5).map(l => `[${stamp(l.start)}] ${l.text}`),
  };
}

function parseArgs(argv) {
  const args = { top: 5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--transcript') args.transcript = argv[++i];
    else if (a === '--duration') args.duration = Number(argv[++i]);
    else if (a === '--position-column') args.positionColumn = argv[++i];
    else if (a === '--retention-column') args.retentionColumn = argv[++i];
    else if (a === '--top') args.top = Number(argv[++i]);
    else if (!args.csv) args.csv = a;
    else throw new Stop('USAGE', `Unexpected argument: ${a}`);
  }
  if (!args.csv) throw new Stop('USAGE', 'Pass the retention CSV exported from YouTube Studio.');
  return args;
}

export function run(argv) {
  const args = parseArgs(argv);
  const lines = args.transcript ? readTranscript(args.transcript) : [];
  const fromTranscript = lines.length ? Math.ceil(lines.at(-1).end ?? lines.at(-1).start + 5) : null;
  const duration = Number.isFinite(args.duration) && args.duration > 0 ? args.duration : fromTranscript;
  const rows = parseCsv(readFileSync(args.csv, 'utf8'));
  if (rows.length < 2) throw new Stop('EMPTY_CSV', 'The CSV has no data rows.');
  const { points, columns, position_scale } = readPoints(rows, { duration, positionColumn: args.positionColumn, retentionColumn: args.retentionColumn });
  const start = points[0].retention;
  const at30 = retentionAt(points, INTRO_SECONDS);
  const { dips, spikes, typical_step } = findEvents(points, args.top);
  return {
    exit: 0,
    output: {
      ok: true, version: VERSION, columns, position_scale, duration_seconds: duration, points: points.length,
      intro: { retention_at_start: Number(start.toFixed(1)), retention_at_30s: Number(at30.toFixed(1)), lost_in_first_30s: Number((start - at30).toFixed(1)), said: lines.filter(l => l.start < INTRO_SECONDS).map(l => `[${stamp(l.start)}] ${l.text}`) },
      end_retention: Number(points.at(-1).retention.toFixed(1)), typical_step,
      dips: dips.map(e => describe(e, lines)), spikes: spikes.map(e => describe(e, lines)),
      transcript: lines.length ? 'attached' : 'none (pass --transcript to see what was said)',
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
    process.exitCode = 1;
  }
}
