/** Import verified Bardi accessory product rows into the static catalog.
 * Usage: node scripts/import-bardi-accessories.mjs /absolute/path/to/products.jsonl
 * Each line: {sku,name,brand,category,subcategory,attributes,sourceUrl}
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const input = process.argv[2];
if (!input) throw new Error("Furnizează calea fișierului JSONL cu produse Bardi verificate.");
const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/data/bardi-accessories.json");
const data = JSON.parse(await readFile(target, "utf8"));
const roots = new Map(data.categories.map((category) => [category.name, category]));
const lines = (await readFile(input, "utf8")).split(/\r?\n/).filter((line) => line.trim());
const rows = lines.map((line) => JSON.parse(line));
const existing = new Map(data.products.map((product) => [product.sku, product]));

for (const [index, row] of rows.entries()) {
  const sku = String(row.sku || "").trim();
  const name = String(row.name || "").trim();
  const brand = String(row.brand || "").trim();
  const category = roots.get(row.category);
  const subcategory = String(row.subcategory || "").trim();
  const leaf = String(row.leaf || "").trim();
  const sourceUrl = String(row.sourceUrl || "").trim();
  if (!sku || !name || !category || !sourceUrl.startsWith("https://www.bardiauto.ro/webshop/")) {
    throw new Error(`Linia ${index + 1}: cod, nume, categorie sau URL Bardi lipsă/invalid.`);
  }
  if (subcategory && !category.children.includes(subcategory)) {
    throw new Error(`Linia ${index + 1}: subcategoria „${subcategory}” nu aparține grupei „${row.category}”.`);
  }
  if (leaf && !category.branches?.[subcategory]?.includes(leaf)) {
    throw new Error(`Linia ${index + 1}: ramura „${leaf}” nu aparține subcategoriei „${subcategory}”.`);
  }
  if (!row.attributes || typeof row.attributes !== "object" || Array.isArray(row.attributes)) {
    throw new Error(`Linia ${index + 1}: attributes trebuie să fie un obiect.`);
  }
  const previous = existing.get(sku);
  const categories = previous?.categories || (previous
    ? [{ categoryId: previous.categoryId, subcategory: previous.subcategory }] : []);
  if (!categories.some((entry) => entry.categoryId === category.id && entry.subcategory === subcategory && (entry.leaf || "") === leaf)) {
    categories.push({ categoryId: category.id, subcategory, ...(leaf ? { leaf } : {}) });
  }
  const product = {
    sku,
    name,
    brand,
    categoryId: categories[0].categoryId,
    subcategory: categories[0].subcategory,
    categories,
    attributes: { ...(previous?.attributes || {}), ...row.attributes },
    sourceUrl: previous?.sourceUrl?.includes("/termeklap/") && !previous.sourceUrl.includes("…")
      ? previous.sourceUrl : sourceUrl,
    observedAt: row.observedAt || new Date().toISOString().slice(0, 10),
  };
  existing.set(sku, product);
}

data.products = [...existing.values()].sort((a, b) => a.name.localeCompare(b.name, "ro"));
await writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Importate ${lines.length} rânduri. Total produse: ${data.products.length}.`);
