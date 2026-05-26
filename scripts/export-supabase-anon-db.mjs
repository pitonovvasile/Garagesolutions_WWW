import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../assets/js/supabase-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(repoRoot, "supabase", "migrations");

const PAGE_SIZE = 1000;

const DEFAULT_TABLES = [
  "manufacturer_groups",
  "brands",
  "bmw_catalog_entries",
  "bmw_catalog_aliases",
  "models",
  "models_display",
  "generations",
  "generation_body_styles",
  "body_styles",
  "generation_specs",
  "generation_variants",
  "engines",
  "model_production_years",
  "transmissions",
  "transmission_gears",
  "products",
  "catalog_products",
  "parts",
  "bmw_variants",
  "bmw_variant_configurations",
  "bmw_dropdown_catalog",
  "bmw_configuration_lookup",
  "bmw_configuration_differential_lookup",
  "bmw_technical_specs",
  "bilstein_suspension_options",
];

const KNOWN_VIEWS = new Set([
  "models_display",
  "bmw_dropdown_catalog",
  "bmw_configuration_lookup",
  "bmw_configuration_differential_lookup",
  "bmw_technical_specs",
  "user_saved_vehicles_resolved",
]);

const PRIVATE_OR_AUTHENTICATED_OBJECTS = [
  "profiles",
  "delivery_addresses",
  "user_saved_vehicles",
  "user_saved_vehicles_resolved",
  "auth.users",
];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out") out.outDir = argv[++i];
    else if (arg === "--tables") out.tables = argv[++i]?.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return out;
}

function timestampForPath() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function projectRefFromUrl(url) {
  try {
    return new URL(url).host.split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}

function restUrl(table) {
  const url = new URL(`/rest/v1/${encodeURIComponent(table)}`, SUPABASE_URL);
  url.searchParams.set("select", "*");
  return url;
}

function headers(rangeStart, rangeEnd) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: "application/json",
    Prefer: "count=exact",
    Range: `${rangeStart}-${rangeEnd}`,
    "Range-Unit": "items",
  };
}

function parseContentRange(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d+)-(\d+)\/(\d+|\*)$/);
  if (!match) return null;
  return {
    from: Number(match[1]),
    to: Number(match[2]),
    total: match[3] === "*" ? null : Number(match[3]),
  };
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { response, body };
}

async function fetchTable(table) {
  const rows = [];
  let total = null;

  for (let start = 0; ; start += PAGE_SIZE) {
    const end = start + PAGE_SIZE - 1;
    const { response, body } = await fetchJson(restUrl(table), { headers: headers(start, end) });
    if (!response.ok) {
      const message =
        body && typeof body === "object"
          ? [body.code, body.message, body.details].filter(Boolean).join(" - ")
          : String(body || response.statusText);
      throw new Error(`${response.status} ${message}`);
    }
    if (!Array.isArray(body)) {
      throw new Error(`Unexpected response for ${table}: ${typeof body}`);
    }

    rows.push(...body);
    const contentRange = parseContentRange(response.headers.get("content-range"));
    if (contentRange?.total != null) total = contentRange.total;
    if (body.length < PAGE_SIZE) break;
    if (total != null && rows.length >= total) break;
  }

  return { rows, total: total ?? rows.length };
}

function collectColumns(rows) {
  const columns = [];
  const seen = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

function csvValue(value) {
  if (value == null) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows) {
  const columns = collectColumns(rows);
  const lines = [columns.map(csvValue).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvValue(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function quoteIdent(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function sqlLiteral(value) {
  if (value == null) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `'${text.replaceAll("'", "''")}'`;
}

function rowsToInsertSql(table, rows) {
  if (!rows.length) return `-- No rows exported for public.${quoteIdent(table)}.\n`;
  const columns = collectColumns(rows);
  const chunks = [];
  for (let i = 0; i < rows.length; i += 500) {
    const slice = rows.slice(i, i + 500);
    const values = slice
      .map((row) => `  (${columns.map((column) => sqlLiteral(row[column])).join(", ")})`)
      .join(",\n");
    chunks.push(
      [
        `insert into public.${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")}) values`,
        values,
        "on conflict do nothing;",
      ].join("\n"),
    );
  }
  return `${chunks.join("\n\n")}\n`;
}

async function copyMigrations(outDir) {
  const destDir = path.join(outDir, "migrations");
  await mkdir(destDir, { recursive: true });
  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();
  const combined = [];
  for (const file of files) {
    const source = path.join(migrationsDir, file);
    const dest = path.join(destDir, file);
    await copyFile(source, dest);
    const sql = await readFile(source, "utf8");
    combined.push(`-- ${file}\n${sql.trim()}\n`);
  }
  await writeFile(path.join(outDir, "schema_from_repo_migrations.sql"), `${combined.join("\n\n")}\n`, "utf8");
  return files;
}

async function saveOpenApi(outDir) {
  const url = new URL("/rest/v1/", SUPABASE_URL);
  const { response, body } = await fetchJson(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/openapi+json",
    },
  });
  if (!response.ok) return { ok: false, status: response.status, error: body };
  await writeFile(path.join(outDir, "postgrest_openapi.json"), `${JSON.stringify(body, null, 2)}\n`, "utf8");
  return { ok: true };
}

function readme({ projectRef, tables, exported, failed, outDirName, openApi }) {
  const exportedRows = exported.reduce((sum, item) => sum + item.rows, 0);
  return `# Supabase local export

Created from project \`${projectRef}\` using the public anon API configured in \`assets/js/supabase-config.mjs\`.

This is a local copy of the data that is readable by the current public key. It is not a full privileged PostgreSQL dump.

## Contents

- \`schema_from_repo_migrations.sql\`: concatenated SQL migrations from this repo.
- \`migrations/\`: individual migration files copied from \`supabase/migrations\`.
- \`data/*.json\`: exported rows for each readable table/view.
- \`data/*.csv\`: CSV versions of the same rows.
- \`data/public_base_table_inserts.sql\`: insert SQL for exported base tables only.
- \`manifest.json\`: export status, row counts, skipped tables, and failures.
- \`postgrest_openapi.json\`: API schema reported by PostgREST, when the API exposes it to the configured key.

## Summary

- Tables/views requested: ${tables.length}
- Objects exported: ${exported.length}
- Rows exported: ${exportedRows}
- Objects not exported: ${failed.length}
- API schema exported: ${openApi?.ok ? "yes" : "no"}

## Restore on another Supabase account

1. Create the new Supabase project.
2. Run \`schema_from_repo_migrations.sql\` in the new project's SQL editor, or apply the files in \`migrations/\` in filename order.
3. Import CSV files through Supabase Table Editor, or run \`data/public_base_table_inserts.sql\` after the matching base tables exist.
4. For generated views such as \`bmw_technical_specs\`, restore their underlying base tables/schema first; view JSON/CSV files are included as a reference snapshot.

## Not included

These objects require an authenticated user, service-role key, or direct database connection and were not copied with the public anon key:

${PRIVATE_OR_AUTHENTICATED_OBJECTS.map((name) => `- \`${name}\``).join("\n")}

For a complete account-to-account clone, use a direct database connection string and \`pg_dump\` from Supabase's Database settings.

Backup folder: \`${outDirName}\`
`;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in assets/js/supabase-config.mjs");
  }

  const args = parseArgs(process.argv.slice(2));
  const tables = args.tables?.length ? args.tables : DEFAULT_TABLES;
  const projectRef = projectRefFromUrl(SUPABASE_URL);
  const outDir = path.resolve(repoRoot, args.outDir || path.join("db-backups", `supabase-anon-${projectRef}-${timestampForPath()}`));
  const dataDir = path.join(outDir, "data");

  await mkdir(dataDir, { recursive: true });
  const migrationFiles = await copyMigrations(outDir);
  const openApi = await saveOpenApi(outDir).catch((error) => ({ ok: false, error: String(error?.message || error) }));

  const exported = [];
  const failed = [];
  const insertSqlParts = [
    "-- Public base-table data exported through Supabase PostgREST anon access.",
    "-- Run this only after creating the matching schema in the target Supabase project.",
    "begin;",
    "",
  ];

  for (const table of tables) {
    try {
      const { rows, total } = await fetchTable(table);
      await writeFile(path.join(dataDir, `${table}.json`), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
      await writeFile(path.join(dataDir, `${table}.csv`), rowsToCsv(rows), "utf8");
      const objectType = KNOWN_VIEWS.has(table) ? "view_or_readonly_api_object" : "base_table_candidate";
      if (!KNOWN_VIEWS.has(table)) {
        const sql = rowsToInsertSql(table, rows);
        await writeFile(path.join(dataDir, `${table}.insert.sql`), sql, "utf8");
        insertSqlParts.push(`-- public.${quoteIdent(table)} (${rows.length} rows)`);
        insertSqlParts.push(sql);
      }
      exported.push({ table, objectType, rows: rows.length, reportedTotal: total });
      console.log(`exported ${table}: ${rows.length} row(s)`);
    } catch (error) {
      failed.push({ table, error: String(error?.message || error) });
      console.warn(`skipped ${table}: ${String(error?.message || error)}`);
    }
  }

  insertSqlParts.push("commit;", "");
  await writeFile(path.join(dataDir, "public_base_table_inserts.sql"), insertSqlParts.join("\n"), "utf8");

  const manifest = {
    createdAt: new Date().toISOString(),
    source: {
      projectRef,
      supabaseUrl: SUPABASE_URL,
      method: "Supabase PostgREST anon export",
    },
    migrations: migrationFiles,
    openApi,
    requestedTables: tables,
    exported,
    failed,
    intentionallyNotExported: PRIVATE_OR_AUTHENTICATED_OBJECTS,
  };

  await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(outDir, "README.md"),
    readme({ projectRef, tables, exported, failed, outDirName: path.relative(repoRoot, outDir), openApi }),
    "utf8",
  );

  console.log("");
  console.log(`Export complete: ${path.relative(repoRoot, outDir)}`);
  console.log(`Exported objects: ${exported.length}; failed/skipped: ${failed.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
