import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const engineRequire = createRequire(new URL('garage-engineered-engine/package.json', root));
const ts = engineRequire('typescript');
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const effects = [];
const updates = [];
const timers = new Map();
let timerId = 0, authCallback, unsubscribed = false, insideAuth = false, syncCount = 0;
const cloud = {
  getGarageCloudSupabase: () => ({ auth: {
    onAuthStateChange(callback) {
      authCallback = callback;
      return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } };
    },
  } }),
  async syncGarageFromCloudAndLocal() {
    assert.equal(insideAuth, false, 'Supabase requests must run after the auth callback');
    syncCount++;
    return [{ brand: 'BMW', model: 'E46' }];
  },
};
const source = readFileSync(new URL('garage-engineered-engine/src/hooks/useGarageCars.ts', root), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = {
  exports: {}, console,
  setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
  clearTimeout(id) { timers.delete(id); },
  require(name) {
    if (name === 'react') return {
      useState: () => [[], value => updates.push(value)],
      useEffect: fn => effects.push(fn),
    };
    if (name === '@site-garage-cloud') return cloud;
    if (name === '../lib/garageInitialLoad') return {
      loadInitialGarageData: async () => [],
      enrichGarageCarsWithDbData: async cars => cars,
    };
    if (name === '../lib/garageStorage') return {
      readSavedCars: () => [], subscribeGarageCars: () => () => {},
    };
    throw new Error(name);
  },
};
vm.runInNewContext(compiled, context);
context.exports.useGarageCars();
const cleanups = effects.map(fn => fn());
await flush();
assert.equal(typeof authCallback, 'function');
insideAuth = true;
authCallback('SIGNED_IN');
assert.equal(syncCount, 0);
insideAuth = false;
for (const [id, fn] of timers) { timers.delete(id); fn(); }
await flush();
assert.equal(syncCount, 1);
assert.equal(updates.at(-1)[0].model, 'E46');
authCallback('TOKEN_REFRESHED');
assert.equal(timers.size, 0);
authCallback('SIGNED_IN');
cleanups.forEach(fn => fn?.());
assert.equal(timers.size, 0, 'Unmount must cancel pending auth work');
assert.equal(unsubscribed, true);
assert.equal(syncCount, 1);

// The database read must fail before any local or cloud write is attempted.
let writes = 0;
const cloudSource = readFileSync(new URL('assets/js/garage-cloud-sync.mjs', root), 'utf8')
  .replace(/^import[\s\S]*?;\n/gm, '')
  .replace(/export /g, '');
const resolvedError = { message: 'View unavailable' };
const tableError = { message: 'Permission denied' };
const authError = { message: 'Session refresh failed' };
const cloudContext = {
  console: { warn() {} }, setTimeout,
  dedupeGarageCars: x => x,
  fetchResolvedGarageForUser: async () => ({ data: null, error: resolvedError }),
  readSavedCars: () => [{ brand: 'BMW' }],
  writeSavedCars: () => { writes++; },
  localStorage: { getItem: () => null },
};
vm.createContext(cloudContext);
vm.runInContext(cloudSource, cloudContext);
const client = {
  auth: { getSession: async () => ({ data: { session: { user: { id: 'user-1' } } }, error: null }) },
  from: () => ({
    select: () => ({ eq: () => ({ order: async () => ({ data: null, error: tableError }) }) }),
    delete: () => { writes++; throw new Error('Unexpected write'); },
  }),
};
await assert.rejects(cloudContext.syncGarageFromCloudAndLocal(client), e => e === tableError);
assert.equal(writes, 0);
client.auth.getSession = async () => ({ data: { session: null }, error: authError });
await assert.rejects(cloudContext.syncGarageFromCloudAndLocal(client), e => e === authError);
assert.equal(writes, 0);

const siteSource = readFileSync(new URL('garage-engineered-engine/src/lib/supabaseSiteClient.ts', root), 'utf8');
const siteCompiled = ts.transpileModule(siteSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const sharedClient = {};
const siteContext = { exports: {}, require(name) {
  if (name === '@site-garage-cloud') return { getGarageCloudSupabase: () => sharedClient };
  if (name === '@site-supabase-config') return { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'public-key' };
  throw new Error(name);
} };
vm.runInNewContext(siteCompiled, siteContext);
assert.equal(siteContext.exports.getSiteSupabaseClient(), sharedClient);
console.log('PASS: deferred auth sync, garage update, cleanup, failed-read write protection, shared client');
