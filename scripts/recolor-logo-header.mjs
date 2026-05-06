/**
 * Face textul din logo (gri neutru) alb, păstrează roșul și zonele foarte închise.
 * Citește și suprascrie assets/garage-solutions-logo.png
 *
 * Rulare: npm run logo:header
 * Apoi (opțional): npm run favicon — ca favicon-ul să folosească aceeași versiune.
 */
import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logoPath = path.join(root, "assets", "garage-solutions-logo.png");

/**
 * „GARAGE” (gri închis / ușor colorat) + „SOLUTIONS” → alb; roșu păstrat.
 * Pragurile vechi lăsau griul închis al lui GARAGE neschimbat.
 */
function recolorPixel(r, g, b, a) {
  if (a < 8) return [r, g, b, a];

  const maxc = Math.max(r, g, b);
  const minc = Math.min(r, g, b);
  const sum = r + g + b;
  const avg = sum / 3;
  const sat = maxc - minc;

  const neutral =
    Math.abs(r - g) < 44 && Math.abs(g - b) < 44 && Math.abs(r - b) < 44;

  const isRed = r > 56 && r > g + 7 && r > b + 7 && sat > 12;
  if (isRed) return [r, g, b, a];

  /* doar negru aproape pur (contur fin / anti-aliasing spre transparent) */
  if (maxc <= 22 && avg <= 28) return [r, g, b, a];

  if (neutral && avg >= 22) {
    return [255, 255, 255, a];
  }

  /* GARAGE uneori nu e perfect neutru (nuanță rece) dar tot text gri */
  if (sat < 52 && avg >= 22 && avg < 250) {
    if (maxc <= 22 && avg <= 28) return [r, g, b, a];
    return [255, 255, 255, a];
  }

  return [r, g, b, a];
}

function recolorInPlace(png) {
  const { data } = png;
  for (let i = 0; i < data.length; i += 4) {
    const [nr, ng, nb, na] = recolorPixel(data[i], data[i + 1], data[i + 2], data[i + 3]);
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
    data[i + 3] = na;
  }
}

const buf = fs.readFileSync(logoPath);
const png = PNG.sync.read(buf);
recolorInPlace(png);
fs.writeFileSync(logoPath, PNG.sync.write(png));
console.log("Written (text alb):", logoPath, `${png.width}×${png.height}`);
