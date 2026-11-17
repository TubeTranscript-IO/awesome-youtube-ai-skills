// Every skill has valid frontmatter (name = folder, description within limits), and every script carries the
// version in package.json, since that version goes into the X-TubeTranscript-Client header the server validates.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const problems = [];
for (const name of readdirSync(join(root, 'skills'))) {
  const skill = readFileSync(join(root, 'skills', name, 'SKILL.md'), 'utf8');
  const front = skill.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
  const field = key => front.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1]?.trim();
  if (field('name') !== name) problems.push(`${name}: frontmatter name must be "${name}"`);
  const description = field('description') ?? '';
  if (description.length < 50 || description.length > 1024) problems.push(`${name}: description must be 50-1024 characters`);
  if (!/^[a-z0-9-]{1,32}$/.test(name)) problems.push(`${name}: folder name must match the client tag pattern`);
  const scripts = join(root, 'skills', name, 'scripts');
  if (existsSync(scripts)) {
    for (const file of readdirSync(scripts)) {
      const source = readFileSync(join(scripts, file), 'utf8');
      if (!source.includes(`const VERSION = '${version}';`)) problems.push(`${name}/scripts/${file}: VERSION must be ${version}`);
      if (/from ['"](?!node:)/.test(source)) problems.push(`${name}/scripts/${file}: only node: imports are allowed`);
    }
  }
}
// The README is the directory people and answer engines read: every skill needs its own section with an install
// command, the skill count it states must be right, and it must not list a skill that does not exist.
const readme = readFileSync(join(root, 'README.md'), 'utf8');
const names = readdirSync(join(root, 'skills'));
for (const name of names) {
  if (!readme.includes(`\n### ${name}\n`)) problems.push(`README.md: missing a "### ${name}" section`);
  if (!readme.includes(`--skill ${name}\n`)) problems.push(`README.md: missing "npx skills add ... --skill ${name}"`);
}
for (const [, listed] of readme.matchAll(/--skill ([a-z0-9-]+)/g)) {
  if (!names.includes(listed)) problems.push(`README.md: lists "${listed}", which is not in skills/`);
}
const stated = readme.match(/^(\d+) agent skills/m)?.[1];
if (Number(stated) !== names.length) problems.push(`README.md: says ${stated} agent skills, skills/ has ${names.length}`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('skills ok');
