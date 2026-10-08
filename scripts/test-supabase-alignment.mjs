import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const runtime = process.env.ALIGNMENT_PGLITE_MODULE;
if (!runtime) throw new Error('Set ALIGNMENT_PGLITE_MODULE to the installed PGlite dist/index.js path.');
const { PGlite } = await import(pathToFileURL(runtime).href);
const db = await PGlite.create();
const root = new URL('../', import.meta.url);
const backup = new URL('db-backups/alignment-2026-10-09/', root);
const read = path => readFile(new URL(path, root), 'utf8');
const schema = JSON.parse(await readFile(new URL('old-schema.json', backup), 'utf8'));
const q = value => '"' + value.replaceAll('"', '""') + '"';
await db.exec('create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key, email text);');
const legacyMissing = new Set(['bmw_configuration_differentials','body_types','model_body_engine','model_body_types','model_generations','variant_body_styles','bmw_autodata_specs_import']);
const currentTables = schema.filter(r => r.object_type === 'table' && !legacyMissing.has(r.object_name.split('.')[1]));
for (const row of currentTables) {
  const meta = JSON.parse(row.definition);
  const columns = [];
  for (const c of meta.columns) {
    if (c.default?.startsWith('nextval(')) {
      const sequence = c.default.match(/nextval\('([^']+)'/)[1];
      await db.exec(`create sequence if not exists ${q(sequence)};`);
    }
    columns.push(`${q(c.name)} ${c.type}${c.default ? ' default '+c.default : ''}${c.not_null ? ' not null' : ''}`);
  }
  columns.push(...(meta.constraints ?? []).filter(c => !c.definition.startsWith('FOREIGN KEY')).map(c => `constraint ${q(c.name)} ${c.definition}`));
  await db.exec(`create table ${row.object_name} (${columns.join(',')});`);
  const name = row.object_name.split('.')[1];
  try {
    const rows = JSON.parse(await readFile(new URL(`current-public-data/${name}.json`, backup), 'utf8'));
    if (rows.length) await db.query(`insert into ${row.object_name} select * from jsonb_populate_recordset(null::${row.object_name},$1::jsonb)`,[JSON.stringify(rows)]);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
const bootstrap = await read('db-backups/restore-to-new-supabase-2026-10-06/00_catalog_schema_bootstrap.sql');
for (const view of bootstrap.matchAll(/create or replace view public\.(?:bmw_configuration_lookup|bmw_technical_specs|user_saved_vehicles_resolved) as[\s\S]*?;/g)) await db.exec(view[0]);
await db.exec(await read('db-backups/restore-to-new-supabase-2026-10-06/05_frontend_compat_views.sql'));
for (const row of currentTables) {
  const constraints = JSON.parse(row.definition).constraints ?? [];
  for (const c of constraints.filter(c => c.definition.startsWith('FOREIGN KEY'))) {
    await db.exec(`alter table ${row.object_name} add constraint ${q(c.name)} ${c.definition};`);
  }
}
const beforeProducts = (await db.query('select to_jsonb(p) as row from products p order by id')).rows;
const beforeVariants = (await db.query('select to_jsonb(p) as row from bmw_variants p order by id')).rows;
const beforeDropdown = (await db.query('select to_jsonb(p) as row from bmw_dropdown_catalog p order by item_type,model_id,generation_id')).rows;
assert.equal((await db.query('select count(*)::int as n from bmw_technical_specs')).rows[0].n,1142);
const migration = await read('supabase/migrations/020_restore_missing_bmw_catalog.sql');
await db.exec(migration);
assert.equal((await db.query('select count(*)::int as n from bmw_configuration_differential_lookup')).rows[0].n,2315);
assert.equal((await db.query('select count(*)::int as n from bmw_chassis_selector')).rows[0].n,66);
assert.equal((await db.query('select count(*)::int as n from bmw_variant_lookup')).rows[0].n,1228);
assert.equal((await db.query('select count(*)::int as n from bmw_technical_specs')).rows[0].n,1143);
assert.equal((await db.query('select count(*)::int as n from bmw_technical_specs where configuration_id is not null and differential_type is null')).rows[0].n,0);
assert.equal((await db.query('select count(*)::int as n from bmw_technical_specs where variant_id=64 and configuration_id is null')).rows[0].n,1);
assert.deepEqual((await db.query('select to_jsonb(p) as row from products p order by id')).rows,beforeProducts);
assert.deepEqual((await db.query('select to_jsonb(p) as row from bmw_variants p order by id')).rows,beforeVariants);
const afterDropdown = (await db.query('select to_jsonb(p) as row from bmw_dropdown_catalog p order by item_type,model_id,generation_id')).rows;
assert.equal(afterDropdown.length,beforeDropdown.length);
for (let i=0;i<beforeDropdown.length;i++) for (const [key,value] of Object.entries(beforeDropdown[i].row)) assert.deepEqual(afterDropdown[i].row[key],value);
const firstDefinition = (await db.query("select pg_get_viewdef('bmw_technical_specs'::regclass) as def")).rows[0].def;
await db.exec(migration);
assert.equal((await db.query("select pg_get_viewdef('bmw_technical_specs'::regclass) as def")).rows[0].def,firstDefinition);
assert.equal((await db.query('select count(*)::int as n from bmw_configuration_differentials')).rows[0].n,2315);
// The garage belongs to the matching target account, whose UUID can differ.
const targetId = '11111111-1111-4111-8111-111111111111';
const owner = JSON.parse(await readFile(new URL('garage_owner.json', backup), 'utf8'))[0];
await db.query('insert into auth.users(id,email) values($1,$2)',[targetId,owner.email]);
const recovery = await readFile(new URL('restore-private-garage.sql', backup), 'utf8');
await db.exec(recovery);
const garage = (await db.query('select user_id,model,engine from user_saved_vehicles order by model')).rows;
assert.equal(garage.length,2);
assert.ok(garage.every(c => c.user_id === targetId));
assert.deepEqual(garage.map(c=>c.model),['3 Series','X5']);
await db.exec(recovery);
assert.equal((await db.query('select count(*)::int as n from user_saved_vehicles')).rows[0].n,2);
// Production already grants these public catalog tables to the website roles.
await db.exec('grant select on bmw_variant_configurations,bmw_variants,models,generations,brands,generation_body_styles,body_styles to anon,authenticated;');
await db.exec('set role anon;');
assert.equal((await db.query('select count(*)::int as n from bmw_configuration_differential_lookup')).rows[0].n,2315);
await db.exec('reset role;');
const result = { validatedAt:new Date().toISOString(),differentials:2315,technicalSpecs:1143,chassis:66,variantBodyStyles:1228,garageCars:2,preservesCurrentProducts:true,preservesCurrentDropdown:true,idempotent:true };
await writeFile(new URL('validation-result.json', backup),JSON.stringify(result,null,2)+'\n');
console.log('PASS: public views, missing vehicle variant, unchanged products and dropdown, idempotence, account mapping, garage deduplication, anonymous differential read');
await db.close();
