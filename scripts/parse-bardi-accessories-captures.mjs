/** Convert browser AX captures into verified product rows for the accessories importer. */
import { readFile, writeFile } from "node:fs/promises";

const input = process.argv[2] || "/private/tmp/bardi-accessories-captures.jsonl";
const output = process.argv[3] || "/private/tmp/bardi-accessories-products.jsonl";
const prefixes = [
  "Este necesară asamblarea/demontarea profesională!",
  "Reper suplimentar / info suplimentar",
  "Capacitate de încărcare la 24V",
  "Pentru numărul OE",
  "Rezolutia ecranului", "Mediu depozitare", "Tip cuplaj intrare",
  "Capacitate de stocare", "Acuratete de masurare",
  "Gama de frecvențe", "Înregistrare de performanță",
  "Putere de agățare", "Tensiune nominala", "Mod de functionare",
  "Sunet de avertizare",
  "Unitatea de cantitate", "Ghid de instalare de luat în considerare",
  "Lungimea cablului de retea", "Tip senzor", "Cantitate",
  "Aprovizionarea cu alimente", "Conținutul spațiului",
  "Valoare presiune", "Capacitate ozon", "Poziția de montare",
  "Efect desinfectant", "Aplicatie speciala", "Concantrat",
  "Lungime cablu", "Unitate de ambalare", "Prezentare",
  "Aplicaţie", "Mărime", "Méret", "Tip lampa", "Functie iluminare",
  "Functionare pe gaz", "Model filtru", "Specificatie",
  "Diametru exterior/lungime 1", "Diametru intern/lățime 1",
  "Diametru interior", "Diametru exterior", "Tip combustibil",
  "Echipamentul vehiculului",
  "Tip pol final", "Versiune cleme baterie", "Dimensiune filet 1",
  "Unitate de ambalare", "Inaltime totala", "Putere nominala",
  "Numar conexiuni", "Numar aplicare", "Tipul becului", "Culare cadru",
  "L.totala", "Înălțime", "Latime", "Lungime", "Intensitate",
  "Adancime", "Material", "alternativ",
  "Forma carcasei de conexiune", "Tehnica pentru conexiuni",
  "Numar rotatii", "Tipul de iluminat", "Poli conexiune",
  "De la sectiune", "Pana la sectiune", "Model soclu",
  "Versiune", "Putere", "bec",
  "Descriere (HU)", "Denumire", "Producator", "Categoria", "Tensiune",
  "Observatii", "Diametru", "Accesoriu", "Culoare", "Descriere", "Numar poli", "mufa",
];

function parseCapture(capture) {
  const [category, subcategory = ""] = capture.categoryPath;
  const lines = capture.ax.replace(/\r(?!\n)/g, " ").split(/\r?\n/);
  const starts = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const link = lines[i].match(/\d+ link (.+), Value: (.+)$/);
    if (link && /\d+ image\s*$/.test(lines[i + 1])) starts.push({ index: i, title: link[1], href: link[2] });
  }
  return starts.map(({ index, title, href }, pos) => {
    const titleParts = title.split(/\s+/);
    const lastPart = titleParts.at(-1);
    const precedingPart = titleParts.at(-2) || "";
    const sku = lastPart.length <= 3 && /^[A-Z0-9._/-]{3,}$/.test(precedingPart)
      ? `${precedingPart} ${lastPart}` : lastPart;
    const attributes = {};
    const rawAttributes = [];
    for (const line of lines.slice(index + 2, starts[pos + 1]?.index ?? lines.length)) {
      if (line.includes("Informații despre stoc:")) break;
      const match = line.match(/\d+ text (.+)$/);
      if (!match) continue;
      const value = match[1].trim();
      const key = prefixes.find((prefix) => value.startsWith(`${prefix} `));
      if (key) {
        const detail = value.slice(key.length + 1).trim();
        if (!attributes[key]) attributes[key] = detail;
        else if (!attributes[key].split("; ").includes(detail)) attributes[key] += `; ${detail}`;
      }
      else if (value && !/^[\uE000-\uF8FF\s]+$/.test(value)) rawAttributes.push(value);
    }
    const name = attributes.Denumire || title.slice(0, -sku.length).trim();
    const brand = attributes.Producator || "";
    delete attributes.Denumire;
    delete attributes.Producator;
    attributes["Denumire Bardi"] = title.slice(0, -sku.length).trim();
    if (rawAttributes.length) attributes["Alte detalii Bardi"] = rawAttributes.join("; ");
    const sourceUrl = href.startsWith("bardiauto.ro/webshop/termeklap/") && !href.includes("…")
      ? `https://www.${href}` : capture.sourceUrl;
    return { sku, name, brand, category, subcategory, attributes, sourceUrl, observedAt: "2026-10-08" };
  });
}

const captures = (await readFile(input, "utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const products = captures.flatMap(parseCapture);
if (!products.length) throw new Error("Nu au fost găsite produse în capturi.");
await writeFile(output, `${products.map((product) => JSON.stringify(product)).join("\n")}\n`);
console.log(`${captures.length} capturi, ${products.length} produse: ${output}`);
