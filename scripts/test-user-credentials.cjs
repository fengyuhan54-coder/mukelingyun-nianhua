const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

function fixture() {
  let current = new Map();
  const jar = {
    get: name => current.has(name) ? { value: current.get(name) } : undefined,
    set: (name, value, options) => { current.set(name, value); jar.options = options; },
    delete: name => current.delete(name),
  };
  const filename = path.resolve(__dirname, '../src/lib/api-config.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = new Module(filename, module);
  mod.require = name => {
    assert.equal(name, 'next/headers', 'credential storage must not access fs or other shared stores');
    return { cookies: () => jar };
  };
  mod._compile(code, filename);
  return { api: mod.exports, jar, switchBrowser: () => { current = new Map(); } };
}

test('a browser without credentials receives no developer credential', () => {
  const { api } = fixture();
  assert.equal(api.getApiToken(), undefined);
  assert.deepEqual(api.loadConfig(), {});
});

test('credentials belong to the current browser and are HttpOnly session cookies', () => {
  const { api, jar, switchBrowser } = fixture();
  api.saveConfig({ apiToken: 'test-user-credential-placeholder' }, true);
  assert.equal(api.getApiToken(), 'test-user-credential-placeholder');
  assert.equal(jar.options.httpOnly, true);
  assert.equal(jar.options.secure, true);
  assert.equal(jar.options.sameSite, 'strict');
  assert.equal(jar.options.maxAge, undefined);
  switchBrowser();
  assert.equal(api.getApiToken(), undefined);
});

test('clearing a browser credential removes model access', () => {
  const { api } = fixture();
  api.saveConfig({ apiToken: 'test-user-credential-placeholder' });
  api.saveConfig({ apiToken: '' });
  assert.equal(api.getApiToken(), undefined);
});

test('API sources do not read developer token files or shared token environment variables', () => {
  const root = path.resolve(__dirname, '../src');
  for (const file of fs.readdirSync(root, { recursive: true })) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(text, /\.api-config\.json|process\.env\.(?:DOUBAO_API_TOKEN|ARK_API_TOKEN)/, file);
  }
});
