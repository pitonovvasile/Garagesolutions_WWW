import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../assets/js/supabase-config.mjs';

const backup = new URL('../db-backups/alignment-2026-10-09/', import.meta.url);
async function rows(table) {
  const data = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1000&offset=${offset}`, {
      headers: { apikey: SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(30000),
    });
    assert.ok(response.ok, `${table}: HTTP ${response.status}`);
    const page = await response.json();
    data.push(...page);
    if (page.length < 1000) return data;
  }
}
const catalog = {};
for (const table of ['products','bmw_variants','bmw_variant_configurations','bmw_dropdown_catalog',
  'bmw_technical_specs','bmw_configuration_differential_lookup','bmw_chassis_selector','bmw_variant_lookup']) {
  catalog[table] = await rows(table);
}
const key = (table,row) => table === 'bmw_dropdown_catalog'
  ? `${row.item_type}:${row.model_id}:${row.generation_id}` : String(row.id);
for (const table of ['products','bmw_variants','bmw_variant_configurations','bmw_dropdown_catalog']) {
  const original = JSON.parse(await readFile(new URL(`current-public-data/${table}.json`,backup),'utf8'));
  assert.equal(catalog[table].length,original.length,`${table}: preserved row count`);
  const byKey = new Map(catalog[table].map(row => [key(table,row),row]));
  for (const old of original) for (const [column,value] of Object.entries(old)) {
    assert.deepEqual(byKey.get(key(table,old))?.[column],value,`${table}.${column}: preserved current value`);
  }
}
assert.equal(catalog.bmw_technical_specs.length,1143);
assert.equal(catalog.bmw_configuration_differential_lookup.length,2315);
assert.equal(catalog.bmw_chassis_selector.length,66);
assert.equal(catalog.bmw_variant_lookup.length,1228);
assert.equal(catalog.bmw_technical_specs.filter(row => row.configuration_id != null && row.differential_type == null).length,0);
const result={checkedAt:new Date().toISOString(),project:SUPABASE_URL,counts:Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,v.length])),preservesCurrentData:true};
await writeFile(new URL('live-validation-result.json',backup),JSON.stringify(result,null,2)+'\n');
console.log('PASS: live public API returns recovered technical data; current products, vehicles and dropdown values are unchanged.');
