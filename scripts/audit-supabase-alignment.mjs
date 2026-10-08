// Read-only comparison. Public access cannot verify private row counts under RLS.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../assets/js/supabase-config.mjs';

const oldSource = execFileSync('git', ['show', '0ce3076:assets/js/supabase-config.mjs'], { encoding: 'utf8' });
const oldUrl = oldSource.match(/export const SUPABASE_URL\s*=\s*"([^"]+)"/)[1];
const oldKey = oldSource.match(/export const SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/)[1];
const tables = [
  'manufacturer_groups', 'brands', 'models', 'models_display', 'generations',
  'generation_body_styles', 'body_styles', 'body_types', 'generation_specs',
  'generation_variants', 'engines', 'model_production_years', 'transmissions',
  'transmission_gears', 'products', 'catalog_products', 'parts', 'bmw_variants',
  'bmw_variant_configurations', 'bmw_dropdown_catalog', 'bmw_configuration_lookup',
  'bmw_configuration_differentials', 'bmw_configuration_differential_lookup',
  'bmw_technical_specs', 'bmw_variant_lookup', 'bmw_chassis_selector',
  'bmw_autodata_specs_import', 'bmw_catalog_entries', 'bmw_catalog_aliases',
  'bilstein_suspension_options', 'aero_package', 'aero_profile', 'aero_component',
  'aero_package_component', 'aero_component_effect', 'aero_component_mode',
  'profiles', 'delivery_addresses', 'user_saved_vehicles',
  'user_saved_vehicles_display', 'user_saved_vehicles_resolved',
];
const projects = {
  restored: { url: oldUrl, key: oldKey },
  current: { url: SUPABASE_URL, key: SUPABASE_ANON_KEY },
};
const results = {};
for (const [name, project] of Object.entries(projects)) {
  results[name] = {};
  // Four requests at a time, with no mutations or privileged credentials.
  for (let i = 0; i < tables.length; i += 4) {
    await Promise.all(tables.slice(i, i + 4).map(async table => {
      try {
        const response = await fetch(`${project.url}/rest/v1/${table}?select=*&limit=1`, {
          headers: { apikey: project.key, Prefer: 'count=exact' },
          signal: AbortSignal.timeout(20000),
        });
        const body = await response.json();
        results[name][table] = {
          status: response.status,
          publicCount: response.headers.get('content-range')?.split('/')[1] ?? null,
          sampleColumns: Array.isArray(body) && body[0] ? Object.keys(body[0]).sort() : [],
          ...(response.ok ? {} : { error: body.message, code: body.code }),
        };
      } catch (error) {
        results[name][table] = { error: error.message };
      }
    }));
  }
}
const out = new URL('../db-backups/alignment-2026-10-09/', import.meta.url);
await mkdir(out, { recursive: true });
await writeFile(new URL('public-api-inventory.json', out), JSON.stringify({
  checkedAt: new Date().toISOString(),
  projects: Object.fromEntries(Object.entries(projects).map(([name, p]) => [name, p.url])),
  warning: 'Anonymous access counts only visible rows. Zero private rows does not mean an empty table.',
  results,
}, null, 2) + '\n');
for (const table of tables) {
  const old = results.restored[table];
  const current = results.current[table];
  const addedColumns = old.sampleColumns?.filter(c => !current.sampleColumns?.includes(c)) ?? [];
  if (old.status !== current.status || old.publicCount !== current.publicCount || addedColumns.length) {
    console.log(JSON.stringify({ table, restored: old.status ?? old.error, current: current.status ?? current.error,
      restoredPublicRows: old.publicCount, currentPublicRows: current.publicCount, restoredOnlyColumns: addedColumns }));
  }
}
console.log('Saved db-backups/alignment-2026-10-09/public-api-inventory.json');

if (process.argv.includes('--snapshot')) {
  const privateObjects = new Set(['profiles', 'delivery_addresses', 'user_saved_vehicles',
    'user_saved_vehicles_display', 'user_saved_vehicles_resolved']);
  for (const [name, project] of Object.entries(projects)) {
    const dataDir = new URL(`${name}-public-data/`, out);
    await mkdir(dataDir, { recursive: true });
    for (const table of tables) {
      if (privateObjects.has(table) || ![200, 206].includes(results[name][table].status)) continue;
      const rows = [];
      const expected = Number(results[name][table].publicCount);
      for (let offset = 0; ; offset += 1000) {
        const response = await fetch(`${project.url}/rest/v1/${table}?select=*&limit=1000&offset=${offset}`, {
          headers: { apikey: project.key }, signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new Error(`${name}.${table}: HTTP ${response.status}`);
        const page = await response.json();
        if (!Array.isArray(page)) throw new Error(`${name}.${table}: invalid response`);
        rows.push(...page);
        if (!page.length || rows.length >= expected) break;
      }
      if (rows.length !== expected) throw new Error(`${name}.${table}: expected ${expected}, received ${rows.length}`);
      await writeFile(new URL(`${table}.json`, dataDir), JSON.stringify(rows, null, 2) + '\n');
      console.log(`Snapshot ${name}.${table}: ${rows.length}`);
    }
  }
}
