// Runs the skill scripts as the agent would (child processes) against a local mock of the TubeTranscript API.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const TRANSCRIPT = join(root, 'skills/youtube-transcript/scripts/transcript.mjs');
const SETUP = join(root, 'skills/tubetranscript-setup/scripts/setup.mjs');
const KEY = 'tt_live_' + 'a'.repeat(32);
const ID = 'jNQXAC9IVRw';

let server, base, requests = [], plan = {};
before(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const url = new URL(req.url, 'http://x');
      requests.push({ method: req.method, path: url.pathname, query: url.searchParams, headers: req.headers, body: body ? JSON.parse(body) : null });
      const reply = (status, json, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(json)); };
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${KEY}`) return reply(402, { error: 'Payment Required', reason: auth ? 'INVALID_API_KEY' : 'MISSING_API_KEY', invoice: { payment_url: 'https://tubetranscript.io/pricing' } });
      const step = (plan[url.pathname] ?? []).shift();
      if (step) return reply(...step);
      return reply(500, { error: 'NO_PLAN' });
    });
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

function run(script, args, { env = {}, input } = {}) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'tt-skills-')));
  return new Promise(done => {
    const child = execFile(process.execPath, [script, ...args], {
      cwd: home,
      env: { PATH: process.env.PATH, HOME: home, XDG_CONFIG_HOME: join(home, '.config'), TUBETRANSCRIPT_BASE_URL: base, ...env },
    }, (error, stdout, stderr) => done({ code: error ? error.code : 0, json: JSON.parse(stdout.trim().split('\n').pop()), stderr, home }));
    if (input !== undefined) { child.stdin.end(input); }
  });
}
const reset = steps => { requests = []; plan = steps; };
const chunks = [{ start: 0, duration: 4.2, text: 'All right, so here we are' }, { start: 3725.5, duration: 2, text: 'the end' }];

test('saves a timestamped Markdown file and prints a short JSON summary, never the transcript', async () => {
  reset({ '/api/mcp/transcript': [[200, { content: [{ type: 'text', text: 'All right, so here we are\n\nthe end' }], job_id: 'j1', status: 'completed', chunks, language: 'en', video_title: 'Me at the zoo' }]] });
  const { code, json, home } = await run(TRANSCRIPT, [`https://www.youtube.com/watch?v=${ID}`], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 0);
  assert.equal(json.ok, true); assert.equal(json.video_id, ID); assert.equal(json.title, 'Me at the zoo'); assert.equal(json.segments, 2);
  assert.equal(json.duration_seconds, 3728); assert.equal(json.timestamps, true);
  assert.equal(json.path, join(home, 'transcripts', `${ID}.en.md`));
  assert.ok(!JSON.stringify(json).includes('here we are'));
  const file = readFileSync(json.path, 'utf8');
  assert.match(file, /^# Me at the zoo\n/);
  assert.match(file, /\[00:00\] All right, so here we are\n\[1:02:05\] the end\n$/);
  const [request] = requests;
  assert.equal(request.query.get('chunks'), '1'); assert.equal(request.query.get('video_url'), `https://www.youtube.com/watch?v=${ID}`);
  assert.equal(request.headers['x-tubetranscript-client'], 'skills/0.2.0/youtube-transcript');
});

test('reads the key from the credentials file when the env var is unset', async () => {
  reset({ '/api/mcp/transcript': [[200, { content: [{ type: 'text', text: 'hi' }], job_id: 'j1', status: 'completed', chunks: [{ start: 1, duration: 1, text: 'hi' }], language: 'en', video_title: null }]] });
  const home = mkdtempSync(join(tmpdir(), 'tt-cred-'));
  mkdirSync(join(home, 'tubetranscript'), { recursive: true });
  writeFileSync(join(home, 'tubetranscript', 'credentials'), `# saved by setup\nTUBETRANSCRIPT_API_KEY=${KEY}\n`);
  const { code, json } = await run(TRANSCRIPT, [ID], { env: { XDG_CONFIG_HOME: home } });
  assert.equal(code, 0); assert.equal(requests[0].query.get('video_id'), ID);
  assert.match(readFileSync(json.path, 'utf8'), /^# jNQXAC9IVRw\n/);
});

test('waits while a video without captions is transcribed, then saves it', async () => {
  reset({ '/api/mcp/transcript': [
    [202, { content: [], job_id: 'audio-1', status: 'processing' }, { 'retry-after': '1' }],
    [200, { content: [{ type: 'text', text: 'spoken' }], job_id: 'audio-1', status: 'completed', chunks: [{ start: 0, duration: 1, text: 'spoken' }], language: 'vi', video_title: 'T' }],
  ] });
  const { code, json, stderr } = await run(TRANSCRIPT, [ID, '--wait', '30'], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 0); assert.equal(json.language, 'vi'); assert.match(stderr, /transcribed from audio/);
  assert.equal(requests.length, 2);
});

test('stops with exit 5 and the job id when the wait runs out', async () => {
  reset({ '/api/mcp/transcript': [[202, { content: [], job_id: 'audio-1', status: 'processing' }, { 'retry-after': '60' }]] });
  const { code, json } = await run(TRANSCRIPT, [ID, '--wait', '0'], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 5); assert.equal(json.code, 'STILL_PROCESSING'); assert.equal(json.job_id, 'audio-1');
});

test('a new job id while waiting means the audio job failed: exit 4, no endless loop', async () => {
  reset({ '/api/mcp/transcript': [
    [202, { content: [], job_id: 'audio-1', status: 'processing' }, { 'retry-after': '1' }],
    [202, { content: [], job_id: 'audio-2', status: 'processing' }, { 'retry-after': '1' }],
  ] });
  const { code, json } = await run(TRANSCRIPT, [ID, '--wait', '60'], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 4); assert.equal(json.code, 'TRANSCRIPTION_FAILED'); assert.equal(requests.length, 2);
});

test('missing or invalid key: exit 2 pointing at the setup skill; quota: exit 3 with an upgrade link', async () => {
  reset({});
  let result = await run(TRANSCRIPT, [ID]);
  assert.equal(result.code, 2); assert.equal(result.json.code, 'MISSING_API_KEY'); assert.equal(requests.length, 0);
  result = await run(TRANSCRIPT, [ID], { env: { TUBETRANSCRIPT_API_KEY: 'tt_live_wrong' } });
  assert.equal(result.code, 2); assert.equal(result.json.code, 'INVALID_API_KEY'); assert.match(result.json.message, /tubetranscript-setup/);
  reset({ '/api/mcp/transcript': [[402, { reason: 'RATE_LIMIT_EXCEEDED', invoice: { payment_url: 'https://tubetranscript.io/pricing?source=mcp_quota' } }, { 'retry-after': '3600' }]] });
  result = await run(TRANSCRIPT, [ID], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(result.code, 3); assert.equal(result.json.retry_after_seconds, 3600);
  assert.equal(result.json.upgrade_url, 'https://tubetranscript.io/pricing?source=mcp_quota&utm_source=agent-skills&utm_medium=youtube-transcript');
});

test('video errors: exit 4 with the API message', async () => {
  reset({ '/api/mcp/transcript': [[404, { error: 'VIDEO_NOT_FOUND', message: 'This video is private or does not exist.' }]] });
  const { code, json } = await run(TRANSCRIPT, [ID], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 4); assert.equal(json.message, 'This video is private or does not exist.');
});

test('TikTok and other links go through the MCP transcribe_url tool and are saved as plain text', async () => {
  reset({ '/api/mcp': [[200, { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'hello tiktok' }], structuredContent: { video_id: '7300000000000000000', status: 'completed', job_id: 'm1', transcript: 'hello tiktok', platform: 'tiktok' } } }]] });
  const link = 'https://www.tiktok.com/@someone/video/7300000000000000000';
  const { code, json } = await run(TRANSCRIPT, [link], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 0); assert.equal(json.timestamps, false); assert.equal(json.video_id, 'tiktok-7300000000000000000');
  assert.deepEqual(requests[0].body.params, { name: 'transcribe_url', arguments: { url: link } });
  assert.match(readFileSync(json.path, 'utf8'), /\nhello tiktok\n$/);
});

test('bad input is a usage error without any request', async () => {
  reset({});
  const { code, json } = await run(TRANSCRIPT, ['not a link'], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 1); assert.equal(json.code, 'USAGE'); assert.equal(requests.length, 0);
});

test('setup --check uses the free tools/list call and never prints the key', async () => {
  reset({ '/api/mcp': [[200, { jsonrpc: '2.0', id: 1, result: { tools: [] } }]] });
  const { code, json } = await run(SETUP, ['--check'], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 0); assert.deepEqual(json, { ok: true, source: 'env', key_hint: '…aaaa' });
  assert.equal(requests[0].body.method, 'tools/list');
  const missing = await run(SETUP, ['--check']);
  assert.equal(missing.code, 2); assert.equal(missing.json.code, 'MISSING_API_KEY');
});

test('setup --save reads the key from stdin, verifies it and writes an owner-only credentials file', async () => {
  reset({ '/api/mcp': [[200, { jsonrpc: '2.0', id: 1, result: { tools: [] } }]] });
  const { code, json, home } = await run(SETUP, ['--save', '--stdin'], { input: `${KEY}\n` });
  assert.equal(code, 0); assert.ok(!JSON.stringify(json).includes(KEY));
  const path = join(home, '.config', 'tubetranscript', 'credentials');
  assert.equal(json.saved_to, path);
  assert.equal(readFileSync(path, 'utf8'), `TUBETRANSCRIPT_API_KEY=${KEY}\n`);
  assert.equal(statSync(path).mode & 0o777, 0o600);
  const bad = await run(SETUP, ['--save', '--stdin'], { input: 'sk_live_nope\n' });
  assert.equal(bad.code, 2); assert.equal(bad.json.code, 'MALFORMED_API_KEY');
});

test('setup reports a key without API access as exit 3 with an upgrade link', async () => {
  reset({ '/api/mcp': [[402, { reason: 'PLAN_UPGRADE_REQUIRED' }]] });
  const { code, json } = await run(SETUP, ['--from-env'], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 3); assert.equal(json.code, 'PLAN_UPGRADE_REQUIRED'); assert.match(json.upgrade_url, /utm_medium=tubetranscript-setup/);
});

test('setup --save without a terminal or --stdin fails at once instead of waiting on stdin', async () => {
  reset({});
  const { code, json } = await run(SETUP, ['--save'], { input: '' });
  assert.equal(code, 1); assert.match(json.message, /own terminal/); assert.equal(requests.length, 0);
});

test('a key saved by setup is the key the transcript script sends', async () => {
  reset({ '/api/mcp': [[200, { jsonrpc: '2.0', id: 1, result: { tools: [] } }]] });
  const saved = await run(SETUP, ['--save', '--stdin'], { input: `${KEY}\n` });
  assert.equal(saved.code, 0);
  reset({ '/api/mcp/transcript': [[200, { content: [{ type: 'text', text: 'x' }], job_id: 'j', status: 'completed', chunks: [], language: 'en', video_title: 'Line one\nLine two' }]] });
  const fetched = await run(TRANSCRIPT, [ID], { env: { XDG_CONFIG_HOME: join(saved.home, '.config'), HOME: saved.home } });
  assert.equal(fetched.code, 0); assert.equal(requests[0].headers.authorization, `Bearer ${KEY}`);
  assert.match(readFileSync(fetched.json.path, 'utf8'), /^# Line one Line two\n/);
});

test('a link that is not a single video is a usage error (exit 1), not a video error', async () => {
  reset({ '/api/mcp/transcript': [[400, { error: 'INVALID_INPUT', message: 'Not a valid YouTube video URL.' }]] });
  const { code, json } = await run(TRANSCRIPT, ['https://www.youtube.com/@somechannel'], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 1); assert.equal(json.code, 'INVALID_INPUT');
});

const timed = [
  { start: 0, duration: 4.2, text: 'All right,  so' },
  { start: 3.5, duration: 2, text: 'here we are' },
  { start: 3725.25, duration: 0, text: 'the end' },
];
const timedReply = () => [200, { content: [{ type: 'text', text: 'x' }], job_id: 'j1', status: 'completed', chunks: timed, language: 'en', video_title: 'Zoo' }];

test('--format srt writes numbered cues that never overlap', async () => {
  reset({ '/api/mcp/transcript': [timedReply()] });
  const { code, json } = await run(TRANSCRIPT, [ID, '--format', 'srt', '--via', 'youtube-to-srt'], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 0); assert.equal(json.format, 'srt'); assert.match(json.path, /\.en\.srt$/);
  assert.equal(readFileSync(json.path, 'utf8'),
    '1\n00:00:00,000 --> 00:00:03,500\nAll right, so\n\n' +
    '2\n00:00:03,500 --> 00:00:05,500\nhere we are\n\n' +
    '3\n01:02:05,250 --> 01:02:08,250\nthe end\n');
  assert.equal(requests[0].headers['x-tubetranscript-client'], 'skills/0.2.0/youtube-to-srt');
});

test('--format vtt writes a WEBVTT file with dot milliseconds', async () => {
  reset({ '/api/mcp/transcript': [timedReply()] });
  const { code, json } = await run(TRANSCRIPT, [ID, '--format', 'vtt'], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 0);
  const file = readFileSync(json.path, 'utf8');
  assert.match(file, /^WEBVTT\n\n00:00:00\.000 --> 00:00:03\.500\nAll right, so\n\n/);
  assert.equal(requests[0].headers['x-tubetranscript-client'], 'skills/0.2.0/youtube-transcript');
});

test('subtitle formats need timestamps: a TikTok link with --format srt is exit 4, no file', async () => {
  reset({ '/api/mcp': [[200, { jsonrpc: '2.0', id: 1, result: { content: [], structuredContent: { video_id: '73', status: 'completed', job_id: 'm1', transcript: 'hi', platform: 'tiktok' } } }]] });
  const { code, json } = await run(TRANSCRIPT, ['https://www.tiktok.com/@a/video/73', '--format', 'srt'], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 4); assert.equal(json.code, 'NO_TIMESTAMPS');
});

test('bad --format or --via is a usage error without a request', async () => {
  reset({});
  for (const args of [['--format', 'docx'], ['--via', 'Not A Skill'], ['--via', 'a'.repeat(33)]]) {
    const { code, json } = await run(TRANSCRIPT, [ID, ...args], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
    assert.equal(code, 1, args.join(' ')); assert.equal(json.code, 'USAGE');
  }
  assert.equal(requests.length, 0);
});

test('--format json writes the timed segments for other scripts', async () => {
  reset({ '/api/mcp/transcript': [timedReply()] });
  const { code, json } = await run(TRANSCRIPT, [ID, '--format', 'json'], { env: { TUBETRANSCRIPT_API_KEY: KEY } });
  assert.equal(code, 0); assert.match(json.path, /\.en\.json$/);
  const data = JSON.parse(readFileSync(json.path, 'utf8'));
  assert.equal(data.video_id, ID); assert.equal(data.title, 'Zoo'); assert.deepEqual(data.chunks, timed);
});

test('the key is read from ./.env (export and quotes allowed) when the environment has none', async () => {
  reset({ '/api/mcp/transcript': [timedReply()], '/api/mcp': [[200, { jsonrpc: '2.0', id: 1, result: { tools: [] } }]] });
  const cwd = realpathSync(mkdtempSync(join(tmpdir(), 'tt-dotenv-')));
  writeFileSync(join(cwd, '.env'), `OTHER=1\nexport TUBETRANSCRIPT_API_KEY="${KEY}"  # TubeTranscript\n`);
  const fetched = await new Promise(done => execFile(process.execPath, [TRANSCRIPT, ID], { cwd, env: { PATH: process.env.PATH, HOME: cwd, XDG_CONFIG_HOME: join(cwd, 'cfg'), TUBETRANSCRIPT_BASE_URL: base } },
    (error, stdout) => done({ code: error ? error.code : 0, json: JSON.parse(stdout.trim().split('\n').pop()) })));
  assert.equal(fetched.code, 0); assert.equal(requests[0].headers.authorization, `Bearer ${KEY}`);
  const checked = await new Promise(done => execFile(process.execPath, [SETUP, '--check'], { cwd, env: { PATH: process.env.PATH, HOME: cwd, XDG_CONFIG_HOME: join(cwd, 'cfg'), TUBETRANSCRIPT_BASE_URL: base } },
    (error, stdout) => done(JSON.parse(stdout.trim()))));
  assert.equal(checked.ok, true); assert.equal(checked.source, 'dotenv');
});
