// Explicit live smoke test: one generated image per invocation; consumes model quota.
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const root = path.resolve(__dirname, '../.muling-check');
  const revise = process.argv.includes('--revise');
  const previous = revise ? JSON.parse(fs.readFileSync(path.join(root, 'last-result.json'), 'utf8')) : undefined;
  const brief = revise ? '保留鱼的主体和红色，背景改为更清雅的淡青水波，留白更多。'
    : '为设计课程创作一张雅致国风插画：一条红色金鱼，淡青水波，米白留白背景，不要文字。';
  const response = await fetch('http://localhost:5001/api/muling/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief, scenario: 'life-photo', maxAttempts: 1, ...(previous ? { reference: previous.image, history: previous.brief } : {}) }),
    signal: AbortSignal.timeout(300000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.json()).error}`);
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let pending = '', latest, terminal;
  const log = [];
  function accept(event) {
    if (event.artwork) latest = event.artwork;
    if (event.status) terminal = event.status;
    const { artwork, ...safe } = event; log.push(safe);
    console.log(JSON.stringify({ stage: event.stage, message: event.message, status: event.status }));
  }
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    let index;
    while ((index = pending.indexOf('\n')) !== -1) { accept(JSON.parse(pending.slice(0, index))); pending = pending.slice(index + 1); }
  }
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, revise ? 'revision-log.json' : 'creation-log.json'), JSON.stringify(log, null, 2));
  if (latest) {
    fs.writeFileSync(path.join(root, 'last-result.json'), JSON.stringify({ brief, image: latest.image }));
    fs.writeFileSync(path.join(root, revise ? 'revision.png' : 'creation.png'), Buffer.from(latest.image.split(',')[1], 'base64'));
  }
  if (terminal !== 'completed' && terminal !== 'needs_revision') throw new Error('Live workflow did not complete; see safe event log.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
