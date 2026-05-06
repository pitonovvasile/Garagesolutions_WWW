/**
 * Generează subpaginile `universale/<slug>.html` și reîmprospătează lista din `universale.html`.
 * Rulare: node scripts/render-universale.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "universale");
const indexFile = path.join(root, "universale.html");

const categories = [
  { slug: "ulei-motor", title: "Ulei motor" },
  { slug: "ulei-cv-manuala", title: "Ulei c.v. manuală" },
  { slug: "ulei-cv-automata", title: "Ulei c.v. automată" },
  { slug: "ulei-diferential", title: "Ulei diferențial" },
  { slug: "ulei-servodirectie", title: "Ulei servodirecție" },
  { slug: "ulei-hidraulic", title: "Ulei hidraulic" },
  { slug: "lichid-frana", title: "Lichid de frână" },
  { slug: "antigel", title: "Antigel" },
  { slug: "vaselina", title: "Vaselină" },
  { slug: "solutie-parbriz", title: "Soluție parbriz" },
  { slug: "aditivi", title: "Aditivi" },
  { slug: "produse-intretinere", title: "Produse întreținere" },
  { slug: "stergatoare-universale", title: "Ștergătoare universale" },
  { slug: "becuri-auto", title: "Becuri auto" },
  { slug: "acumulatori-auto", title: "Acumulatori auto" },
  { slug: "acumulatori-moto", title: "Acumulatori moto" },
  { slug: "sigurante-auto", title: "Siguranțe auto" },
  { slug: "huse-auto", title: "Huse auto" },
  { slug: "covorase-auto", title: "Covorașe auto" },
  { slug: "racord-flexibil-esapament", title: "Racord flexibil eșapament" },
  { slug: "anvelope-auto", title: "Anvelope auto" },
  { slug: "accesorii-roti", title: "Accesorii roți" },
  { slug: "capace-roti", title: "Capace roți" },
  { slug: "jante-auto", title: "Jante auto" },
  { slug: "lanturi-antiderapante", title: "Lanțuri antiderapante" },
  { slug: "portbagaje-auto", title: "Portbagaje auto" },
  { slug: "set-bare-portbagaj", title: "Set bare portbagaj" },
  { slug: "set-montare-bare-portbagaj", title: "Set montare bare portbagaj" },
  { slug: "furtun-aer", title: "Furtun aer" },
  { slug: "furtun-apa", title: "Furtun apă" },
  { slug: "furtun-combustibil", title: "Furtun combustibil" },
  { slug: "o-ring-uri", title: "O-ring-uri" },
  { slug: "burduf-universal", title: "Burduf universal" },
  { slug: "coliere-universale", title: "Coliere universale" },
  { slug: "produse-moto", title: "Produse moto" },
  { slug: "scule-auto", title: "Scule auto" },
  { slug: "accesorii-auto", title: "Accesorii auto" },
  { slug: "electrice-auto", title: "Electrice auto" },
  { slug: "deflectoare-aer", title: "Deflectoare aer" },
  { slug: "protectie-bara", title: "Protecție bară" },
  { slug: "remorcare", title: "Remorcare" },
  { slug: "siguranta-rutiera", title: "Siguranță rutieră" },
  { slug: "catalizator-universal", title: "Catalizator universal" },
  { slug: "accesorii-iarna", title: "Accesorii iarnă" },
  { slug: "accesorii-masini-electrice", title: "Accesorii mașini electrice" },
  { slug: "machete-auto", title: "Machete auto" },
];

function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function subpageTemplate(c) {
  const t = esc(c.title);
  const fullTitle = `${c.title} (universale) — Garage Solutions`;
  return `<!DOCTYPE html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(fullTitle)}</title>
    <link rel="stylesheet" href="../assets/css/main.css" />
  </head>
  <body class="body--categorie">
    <header class="header">
      <a class="logo-link" href="../index.html" aria-label="Garage Solutions — acasa">
        <img
          class="logo-img"
          src="../assets/garage-solutions-logo.png"
          alt=""
          width="200"
          height="56"
          loading="eager"
        />
      </a>
      <nav class="main-nav" aria-label="Navigare principala">
        <a href="../index.html#categorii">Piese auto</a>
        <a href="../anvelope.html">Anvelope</a>
        <a href="../universale.html">Universale</a>
        <a href="../index.html">Oferte</a>
        <a href="../index.html">Contact</a>
        <a class="account-link" href="../index.html">Garajul meu</a>
        <a class="account-link account-link--secondary" href="../index.html">Contul meu</a>
      </nav>
    </header>

    <main class="categorie-sub">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a class="breadcrumbs__link" href="../index.html">Acasa</a>
        <span class="breadcrumbs__sep" aria-hidden="true">/</span>
        <a class="breadcrumbs__link" href="../universale.html">Universale</a>
        <span class="breadcrumbs__sep" aria-hidden="true">/</span>
        <span class="breadcrumbs__current">${t}</span>
      </nav>

      <header class="categorie-sub__head categorie-sub__head--solo">
        <div class="categorie-sub__intro">
          <h1 class="categorie-sub__title">${t}</h1>
          <p class="categorie-sub__lead">
            Produse si subcategorii pentru categoria <strong>${t}</strong> din oferta de piese universale. Alege
            filtrele din catalog (dimensiune, specificatie, pret) sau revino spre
            <a class="categorie-sub__inline" href="../universale.html">lista tuturor categoriilor</a>.
          </p>
        </div>
      </header>

      <section class="categorie-sub__content" aria-labelledby="u-cat-continut">
        <h2 id="u-cat-continut" class="categorie-sub__h2">Catalog</h2>
        <p>
          Pagina de categorie se va conecta la stoc in functie de partenerii Garage Solutions. Pana
          atunci, poti
          <a class="categorie-sub__inline" href="../index.html">inapoi pe pagina principala</a> pentru
          selectia de autovehicul si aflarea compatibilitatilor aferente.
        </p>
        <p class="categorie-sub__actions">
          <a class="categorie-sub__btn" href="../universale.html">Inapoi la categoriile universale</a>
        </p>
        <p class="categorie-sub__actions categorie-sub__actions--minor">
          <a class="categorie-sub__inline" href="../index.html">Spre piese &amp; autovehicul</a>
        </p>
      </section>
    </main>

    <footer class="footer">
      <small>© <span id="y"></span> Garage Solutions</small>
    </footer>
    <script src="../assets/js/main.js"></script>
  </body>
</html>
`;
}

function listHtml() {
  const items = categories
    .map(
      (c) =>
        `          <li><a class="universale-categories__link" href="universale/${c.slug}.html">${esc(
          c.title
        )}</a></li>`
    )
    .join("\n");
  return `        <ul class="universale-categories" role="list">\n${items}\n        </ul>`;
}

fs.mkdirSync(outDir, { recursive: true });

for (const c of categories) {
  const file = path.join(outDir, `${c.slug}.html`);
  fs.writeFileSync(file, subpageTemplate(c), "utf8");
  console.log("Wrote", path.relative(root, file));
}

let raw = fs.readFileSync(indexFile, "utf8");
const marker = /<!--\s*RENDER:UNIVERSALE_LIST_START\s*-->[\s\S]*?<!--\s*RENDER:UNIVERSALE_LIST_END\s*-->/;
if (!marker.test(raw)) {
  throw new Error(
    "Lipseste perechea de markere RENDER:UNIVERSALE_LIST_START/END in universale.html"
  );
}
raw = raw.replace(marker, `<!-- RENDER:UNIVERSALE_LIST_START -->\n${listHtml()}\n        <!-- RENDER:UNIVERSALE_LIST_END -->`);
fs.writeFileSync(indexFile, raw, "utf8");
console.log("Updated universale.html (lista + linkuri)");
console.log("Done —", categories.length, "subpagini universale/.");
