// Offline contract tests: no model requests or user credentials are used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(relative, overrides = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths; const originalRequire = mod.require.bind(mod); mod.require = id => overrides[id] || originalRequire(id); mod._compile(code, filename); return mod.exports;
}
const { runCreation, validateInput, validateReview, parseModelJson } = load('src/lib/muling-workflow.ts');
const { applyTaskEvent } = load('src/lib/muling-types.ts');
const input = { brief: '将鱼的照片转为国风，保留颜色', scenario: 'life-photo', reference: 'data:image/png;base64,YQ==', history: '喜欢清雅配色', maxAttempts: 2 };
const plan = { title: '鱼跃', prompt: '清雅国风鱼图', keywords: ['鱼'], criteria: ['保留鱼的颜色'] };
const passed = { passed: true, summary: '主体和配色符合要求', issues: [], tags: ['雅致'] };
const rejected = { passed: false, summary: '主体颜色不符', issues: ['恢复鱼的原始红色'], tags: ['雅致'] };
function fixture(reviews = [passed]) {
  const events = [], prompts = [], references = [];
  const tools = {
    plan: async () => plan,
    retrieve: () => [{ id: 'fish', name: '鱼纹', meaning: '富足' }],
    generate: async (prompt, reference) => { prompts.push(prompt); references.push(reference); return 'data:image/png;base64,YQ=='; },
    review: async () => reviews.shift(),
  };
  return { tools, events, prompts, references, emit: event => events.push(event) };
}
test('successful creation retrieves knowledge, retains reference and ends after one image', async () => {
  const f = fixture(); await runCreation(input, f.tools, f.emit, new AbortController().signal);
  assert.equal(f.prompts.length, 1); assert.equal(f.references[0], input.reference);
  assert.match(f.prompts[0], /富足/); assert.match(f.prompts[0], /清雅配色/);
  assert.equal(f.events.at(-1).status, 'completed');
});
test('review feedback changes the next prompt and the loop is bounded', async () => {
  const f = fixture([rejected, rejected]); await runCreation(input, f.tools, f.emit, new AbortController().signal);
  assert.equal(f.prompts.length, 2); assert.match(f.prompts[1], /恢复鱼的原始红色/);
  assert.equal(f.events.at(-1).status, 'needs_revision');
});
test('a corrected second version can pass', async () => {
  const f = fixture([rejected, passed]); await runCreation(input, f.tools, f.emit, new AbortController().signal);
  assert.equal(f.prompts.length, 2); assert.equal(f.events.at(-1).status, 'completed');
});
test('opting out of automatic correction generates only once', async () => {
  const f = fixture([rejected]); await runCreation({ ...input, maxAttempts: 1 }, f.tools, f.emit, new AbortController().signal);
  assert.equal(f.prompts.length, 1); assert.equal(f.events.at(-1).status, 'needs_revision');
});
test('review outage never passes and the generated image is retained', async () => {
  const f = fixture(); f.tools.review = async () => { throw new Error('review unavailable'); };
  await assert.rejects(runCreation(input, f.tools, f.emit, new AbortController().signal), /review unavailable/);
  assert.ok(f.events.some(e => e.artwork)); assert.ok(!f.events.some(e => e.status === 'completed'));
});
test('cancelling after generation prevents another tool call', async () => {
  const f = fixture(); const controller = new AbortController(); let reviewed = false;
  f.tools.generate = async () => { controller.abort(); return 'image'; };
  f.tools.review = async () => { reviewed = true; return passed; };
  await assert.rejects(runCreation(input, f.tools, f.emit, controller.signal)); assert.equal(reviewed, false);
});
test('invalid inputs cannot select remote image URLs or unbounded retries', () => {
  for (const bad of [{ ...input, maxAttempts: 50 }, { ...input, brief: ' ' }, { ...input, reference: 'http://localhost/private' }, { ...input, history: 'a'.repeat(12001) }]) {
    assert.throws(() => validateInput(bad));
  }
  assert.equal(validateInput(input).brief, input.brief);
});
test('malformed and contradictory reviews are never accepted', () => {
  assert.throws(() => validateReview({ ...passed, passed: 'true' }));
  assert.throws(() => validateReview({ ...passed, issues: ['主体缺失'] }));
  assert.throws(() => validateReview({ ...rejected, issues: [] }));
  assert.throws(() => parseModelJson('无法检查'));
  assert.deepEqual(validateReview(parseModelJson('```json\n' + JSON.stringify(passed) + '\n```')), passed);
});
test('versions and checks persist separately from compact event history', () => {
  const original = { id: 'a', createdAt: '', brief: '', history: '', status: 'running', events: [], attempts: [] };
  const generated = applyTaskEvent(original, { stage: 'generation', message: 'generated', artwork: { number: 1, image: 'image', prompt: 'prompt' } });
  const reviewed = applyTaskEvent(generated, { stage: 'review', message: 'reviewed', attempt: 1, review: rejected });
  assert.equal(original.attempts.length, 0); assert.equal(reviewed.attempts[0].review.passed, false);
  assert.equal(reviewed.events[0].artwork, undefined); assert.equal(reviewed.attempts[0].image, 'image');
});

function routeWithConfig(configured = true) {
  return load('src/app/api/muling/create/route.ts', {
    '@/lib/api-config': { getApiToken: () => configured ? 'test-only-not-a-real-key' : undefined, loadConfig: () => ({}) },
    '@/lib/pattern-library-data': { getAllPatterns: () => [{ id: 'fish', name: '鱼纹', meaning: '富足' }] },
    '@/lib/traditional-color-data': { TRADITIONAL_COLORS: [{ id: 'blue', name: '群青', color: '#4169E1', meaning: '雅致' }] },
    '@/lib/muling-workflow': load('src/lib/muling-workflow.ts'),
    '@/lib/muling-network': { fetchMulingModel: (url, init) => global.fetch(url, init) },
  });
}
test('HTTP pipeline forwards reference through planning, generation and review', async () => {
  const originalFetch = global.fetch, bodies = [];
  let calls = 0;
  global.fetch = async (url, options) => {
    bodies.push(JSON.parse(options.body)); calls++;
    if (calls === 2) return Response.json({ data: [{ b64_json: 'iVBORw0KGgo=' }] });
    return Response.json({ choices: [{ message: { content: JSON.stringify(calls === 1 ? plan : passed) } }] });
  };
  try {
    const response = await routeWithConfig().POST(new Request('http://localhost/api/muling/create', { method: 'POST', body: JSON.stringify(input) }));
    const events = (await response.text()).trim().split('\n').map(JSON.parse);
    assert.equal(response.status, 200); assert.equal(events.at(-1).status, 'completed');
    assert.equal(calls, 3); assert.equal(bodies[0].messages[1].content[1].image_url.url, input.reference);
    assert.equal(bodies[1].image, input.reference); assert.equal(bodies[1].response_format, 'b64_json');
    assert.equal(bodies[2].messages[1].content[2].image_url.url, input.reference);
    assert.ok(events.some(e => e.materials?.[0]?.id === 'fish'));
  } finally { global.fetch = originalFetch; }
});
test('design study completes from text without an uploaded photo', async () => {
  const originalFetch = global.fetch, bodies = [];
  global.fetch = async (url, options) => {
    bodies.push(JSON.parse(options.body));
    if (bodies.length === 2) return Response.json({ data: [{ b64_json: 'iVBORw0KGgo=' }] });
    return Response.json({ choices: [{ message: { content: JSON.stringify(bodies.length === 1 ? plan : passed) } }] });
  };
  try {
    const response = await routeWithConfig().POST(new Request('http://localhost/api/muling/create', {
      method: 'POST', body: JSON.stringify({ brief: '为设计课程制作一张国风海报，使用荷花纹与群青、铅白配色，并说明文化寓意。', scenario: 'design-study', maxAttempts: 1 }),
    }));
    const events = (await response.text()).trim().split('\n').map(JSON.parse);
    assert.equal(events.at(-1).status, 'completed');
    assert.equal(typeof bodies[0].messages[1].content, 'string');
    assert.equal(bodies[0].thinking.type, 'disabled');
    assert.equal(bodies[1].image, undefined);
    assert.equal(bodies[2].messages[1].content.length, 2);
  } finally { global.fetch = originalFetch; }
});

test('HTTP throttling fails without claiming success', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response('', { status: 429, headers: { 'Retry-After': '0' } });
  try {
    const response = await routeWithConfig().POST(new Request('http://localhost/api/muling/create', { method: 'POST', body: JSON.stringify(input) }));
    const events = (await response.text()).trim().split('\n').map(JSON.parse);
    assert.equal(events.at(-1).status, 'failed'); assert.match(events.at(-1).message, /429/);
    assert.ok(!events.some(e => e.artwork));
  } finally { global.fetch = originalFetch; }
});
test('HTTP rejects missing configuration and malformed input', async () => {
  const request = value => new Request('http://localhost/api/muling/create', { method: 'POST', body: JSON.stringify(value) });
  assert.equal((await routeWithConfig(false).POST(request(input))).status, 503);
  assert.equal((await routeWithConfig().POST(request({}))).status, 400);
});
