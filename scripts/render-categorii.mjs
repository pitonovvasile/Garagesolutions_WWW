/**
 * Generează subpaginile statice din categorii/*.html
 * Rulare: node scripts/render-categorii.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "categorii");

const categories = [
  {
    slug: "ambreiaj",
    title: "Ambreiaj",
    image: "clutch-icon-alpha.png",
    lead: "Kituri de ambreiaj, placi, discuri volante, rulmenti: piese aliniate autovehiculului ales in garajul tau.",
  },
  {
    slug: "antrenare-punte",
    title: "Antrenare punte",
    image: "antrenare-punte-icon-alpha.png",
    lead: "Articulatii, planetare, piese de transmisie si antrenare pentru punte, cu compatibilitate dupa VIN / vehicul.",
  },
  {
    slug: "caroserie",
    title: "Caroserie",
    image: "caroserie-icon-alpha.png",
    lead: "Aripi, bara, oglinda, anexe caroserie — componente de structura si finisare vizuala.",
  },
  {
    slug: "directie-roti",
    title: "Directie / roti",
    image: "directie-roti-icon-alpha.png",
    lead: "Brate, bielete, directie, roti si accesorii conexe pentru ghidare precisa pe drum.",
  },
  {
    slug: "electrice",
    title: "Electrice",
    image: "electrice-icon-alpha.png",
    lead: "Senzori, comutatoare, becuri, alternatoare, cablaj si piese de instalatie electrica.",
  },
  {
    slug: "filtre",
    title: "Filtre",
    image: "filtre-icon-alpha.png",
    lead: "Filtru ulei, aer, carburant, habitaclu — inlocuiri de intretinere conform intervalului de service.",
  },
  {
    slug: "instalatie-franare",
    title: "Instalatie de franare",
    image: "franare-instalatie-icon-alpha.png",
    lead: "Placute, discuri, etriere, furtunuri, lichid de fran — componente BREMBO si alte marci renumite.",
  },
  {
    slug: "motor",
    title: "Motor",
    image: "motor-icon-alpha.png",
    lead: "Distributie, garnituri, injectie, piese mici si consumabile de motor, potrivite motorizarii selectate.",
  },
  {
    slug: "piese-service",
    title: "Piese de service / inspectie / intretinere",
    image: "piese-service-icon-alpha.png",
    lead: "Ulei, consumabile, scule si piese de revizie pentru intretinere periodica in siguranta.",
  },
  {
    slug: "aer-conditionat",
    title: "Sistem de aer conditionat",
    image: "aer-conditionat-icon-alpha.png",
    lead: "Compresoare, conducte, filtre de habitaclu si componente de climatizare.",
  },
  {
    slug: "racire-motor",
    title: "Sistem de racire motor",
    image: "racire-motor-icon-alpha.png",
    lead: "Radiator, termostat, ventilator, pompa de apa — racoare stabilă pentru longevitatea motorului.",
  },
  {
    slug: "esapament",
    title: "Sistemul de esapament",
    image: "exhaust-icon-alpha.png",
    lead: "Tobe, furtunuri, sonde, elemente de esapament sport sau OEM, dupa reglementari si compatibilitate.",
  },
  {
    slug: "suspensie",
    title: "Suspensie",
    image: "suspensie-icon-alpha.png",
    lead: "Amortizoare, arcuri, brate, bucse si piese de sasiu pentru confort si tinuta de drum.",
  },
  {
    slug: "accesorii",
    title: "Accesorii",
    image: "accesorii-icon-alpha.png",
    lead: "Produse de interior, curatenie, mici echipari si add-on-uri pentru autovehiculul tau.",
  },
];

function pageHtml(c) {
  const title = `${c.title} — Garage Solutions`;
  return `<!DOCTYPE html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
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
        <span class="breadcrumbs__current">${c.title}</span>
      </nav>

      <header class="categorie-sub__head">
        <div class="categorie-sub__icon" aria-hidden="true">
          <img src="../assets/${c.image}" alt="" width="200" height="200" />
        </div>
        <div class="categorie-sub__intro">
          <h1 class="categorie-sub__title">${c.title}</h1>
          <p class="categorie-sub__lead">${c.lead}</p>
        </div>
      </header>

      <section class="categorie-sub__content" aria-labelledby="categorie-continut">
        <h2 id="categorie-continut" class="categorie-sub__h2">Piese in aceasta categorie</h2>
        <p>
          Aici vei regasi catalogul de piese filtrat dupa marca, model si motorizare (din pagina
          <a class="categorie-sub__inline" href="../index.html">principala</a>). Pana conectam lista
          live, foloseste selectia de autovehicul de acasa si revenim cu rezultatele aici in functie de
          stoc.
        </p>
        <p class="categorie-sub__actions">
          <a class="categorie-sub__btn" href="../index.html">Inapoi la piese &amp; autovehicul</a>
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

fs.mkdirSync(outDir, { recursive: true });
for (const c of categories) {
  const file = path.join(outDir, `${c.slug}.html`);
  fs.writeFileSync(file, pageHtml(c), "utf8");
  console.log("Wrote", path.relative(root, file));
}
console.log("Done —", categories.length, "subpagini.");
