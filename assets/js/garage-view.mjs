import {
  readSavedCars,
  writeSavedCars,
  onGarageCarsUpdated,
} from "./garage-saved-cars.mjs";
import { getBrandLogoUrl } from "./brand-logo-fallbacks.mjs";
import { getGarageHeroImageSrc, isPhotoHeroAsset } from "./garage-hero-assets.mjs";
import {
  getGarageBodyTypeOptions,
  getEffectiveBodyType,
} from "./garage-body-type.mjs";
import {
  readCarPaint,
  saveCarPaint,
  applyCarPaintStack,
} from "./garage-car-paint.mjs";
import { syncGarageStlViewer } from "./garage-stl-viewer.mjs";
import { garageOemSuspensionFromCar } from "./garage-oem-suspension.mjs";

function parseCarIndex() {
  const raw = new URLSearchParams(window.location.search).get("car");
  if (raw === null || raw === "") return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function clampIndex(i, len) {
  if (len <= 0) return 0;
  return Math.min(Math.max(0, i), len - 1);
}

function absoluteAssetHref(src) {
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

/** Index 0 = cea mai recentă salvată (același contract ca index.html: unshift). */

/** Mască alpha = același fișier ca imaginea, aliniată ca object-fit (vopsea doar pe siluetă). */
function syncCarPaintLayerMask(root, src) {
  const layers = root.querySelectorAll(".garage-car-stack__paint-layer");
  if (!layers.length) return;
  const maskVal =
    src && typeof src === "string"
      ? `url(${JSON.stringify(new URL(src, window.location.href).href)})`
      : "none";
  layers.forEach((el) => {
    el.style.setProperty("--garage-car-mask", maskVal);
  });
}

export function initGarageView(root = document) {
  const hudEmpty = root.getElementById("garage-hud-empty");
  const hudVehicle = root.getElementById("garage-hud-vehicle");
  const hudLogo = root.getElementById("garage-hud-logo");
  const hudBrand = root.getElementById("garage-hud-brand");
  const hudModel = root.getElementById("garage-hud-model");
  const hudEngine = root.getElementById("garage-hud-engine");
  const hudOem = root.getElementById("garage-hud-oem");
  const hudCount = root.getElementById("garage-hud-count");
  const hudNav = root.getElementById("garage-hud-nav");
  const btnPrev = root.getElementById("garage-hud-prev");
  const btnNext = root.getElementById("garage-hud-next");
  const hudOrigin = root.getElementById("garage-hud-origin");
  const bodyTypeRail = root.getElementById("garage-hud-body-rail");
  const bodyTypeSeg = root.getElementById("garage-hud-body-seg");
  const carStack = root.querySelector(".garage-car-stack");
  const carImg = root.querySelector(".garage-car-stack__hero .garage-car-stack__img");
  const carReflectImgs = root.querySelectorAll(".garage-car-stack__reflection-inner img");
  const paintColorEl = root.getElementById("garage-car-paint-color");
  const paintStrengthEl = root.getElementById("garage-car-paint-strength");
  const paintResetEl = root.getElementById("garage-car-paint-reset");
  const btn3dView = root.getElementById("garage-3d-view-btn");
  const garagePageBody = root.body ?? document.body;
  const stlMount = root.getElementById("garage-stl-mount");
  const stlStatus = root.getElementById("garage-stl-status");

  let carIndex = parseCarIndex();
  let carPaintWired = false;
  let bodyTypeSegWired = false;
  /** Anulează fade-uri în curs dacă utilizatorul schimbă rapid mașina. */
  let heroSwapGen = 0;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let heroDimTimer;

  /** Citește garajul: localStorage + transfer session (fără duplicare logică index). */
  function getGarageList() {
    return readSavedCars();
  }

  function persistBodyTypeIfNeeded(cars, i) {
    const car = cars[i];
    if (!car) return;
    const opts = getGarageBodyTypeOptions(car);
    if (!opts.length) return;
    const eff = getEffectiveBodyType(car);
    if (car.bodyType === eff) return;
    car.bodyType = eff;
    writeSavedCars(cars);
  }

  function syncBodyTypeRow(cars, i) {
    if (!bodyTypeSeg) return;
    const car = cars[i];
    if (!car) return;
    const opts = getGarageBodyTypeOptions(car);
    if (opts.length <= 1) {
      bodyTypeRail?.setAttribute("hidden", "");
      return;
    }
    if (!bodyTypeSegWired) {
      bodyTypeSegWired = true;
      bodyTypeSeg.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-garage-body]");
        if (!btn) return;
        const id = btn.getAttribute("data-garage-body");
        if (!id) return;
        const list = getGarageList();
        const idx = clampIndex(carIndex, list.length);
        const c = list[idx];
        if (!c) return;
        c.bodyType = id;
        writeSavedCars(list);
        render();
      });
    }
    bodyTypeRail?.removeAttribute("hidden");
    const eff = getEffectiveBodyType(car);
    bodyTypeSeg.replaceChildren();
    for (const o of opts) {
      const b = document.createElement("button");
      b.type = "button";
      b.className =
        "garage-hud__body-chip" + (o.id === eff ? " garage-hud__body-chip--active" : "");
      b.textContent = o.label;
      b.setAttribute("data-garage-body", o.id);
      b.setAttribute("aria-pressed", o.id === eff ? "true" : "false");
      bodyTypeSeg.appendChild(b);
    }
  }

  function syncCarPaintUi(car) {
    if (!paintColorEl || !paintStrengthEl) return;
    const { hex, strength } = readCarPaint(car);
    paintColorEl.value = hex;
    paintStrengthEl.value = String(Math.round(strength * 100));
  }

  function wireCarPaintUi() {
    if (carPaintWired) return;
    if (!carStack || !paintColorEl || !paintStrengthEl || !paintResetEl) return;
    carPaintWired = true;

    function onPaintColorPick() {
      const cars = getGarageList();
      const car = cars[clampIndex(carIndex, cars.length)];
      if (!car) return;
      let s = Number(paintStrengthEl.value) / 100;
      const prev = readCarPaint(car).strength;
      if (prev < 0.04 && s < 0.04) s = 0.78;
      paintStrengthEl.value = String(Math.round(s * 100));
      saveCarPaint(car, paintColorEl.value, s);
      applyCarPaintStack(carStack, car);
    }

    paintColorEl.addEventListener("input", onPaintColorPick);
    paintColorEl.addEventListener("change", onPaintColorPick);

    paintStrengthEl.addEventListener("input", () => {
      const cars = getGarageList();
      const car = cars[clampIndex(carIndex, cars.length)];
      if (!car) return;
      saveCarPaint(car, paintColorEl.value, Number(paintStrengthEl.value) / 100);
      applyCarPaintStack(carStack, car);
    });

    paintResetEl.addEventListener("click", () => {
      const cars = getGarageList();
      const car = cars[clampIndex(carIndex, cars.length)];
      if (!car) return;
      saveCarPaint(car, paintColorEl.value, 0);
      paintStrengthEl.value = "0";
      applyCarPaintStack(carStack, car);
    });
  }

  const paintHeroTargets = root.querySelectorAll(
    ".garage-car-stack__hero .garage-car-stack__paint, .garage-car-stack__reflection .garage-car-stack__paint"
  );

  function applyHeroDomInstant(car) {
    const src = getGarageHeroImageSrc(car);
    const photo = isPhotoHeroAsset(src);
    const alt = car ? `${car.brand} ${car.model}` : "Vehicle";
    if (carImg) {
      carImg.src = src;
      carImg.classList.toggle("garage-car-stack__img--photo", photo);
      carImg.alt = alt;
    }
    carReflectImgs.forEach((img) => {
      img.src = src;
      img.classList.toggle("garage-car-stack__img--photo", photo);
      img.alt = "";
    });
    root.querySelectorAll(".garage-car-stack__paint").forEach((el) => {
      el.classList.toggle("garage-car-stack__paint--knockout-dark", photo);
    });
    syncCarPaintLayerMask(root, src);
  }

  function applyHeroImages(car) {
    const src = getGarageHeroImageSrc(car);
    const photo = isPhotoHeroAsset(src);
    const alt = car ? `${car.brand} ${car.model}` : "Vehicle";
    const nextHref = absoluteAssetHref(src);
    const curHref = carImg ? String(carImg.src || "") : "";
    const same = curHref && curHref === nextHref;

    const reduced =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !carImg) {
      applyHeroDomInstant(car);
      return;
    }

    const gen = ++heroSwapGen;
    const fadeMs = 180;

    const commit = () => {
      if (gen !== heroSwapGen) return;
      if (carImg) {
        carImg.src = src;
        carImg.classList.toggle("garage-car-stack__img--photo", photo);
        carImg.alt = alt;
      }
      carReflectImgs.forEach((img) => {
        img.src = src;
        img.classList.toggle("garage-car-stack__img--photo", photo);
        img.alt = "";
      });
      root.querySelectorAll(".garage-car-stack__paint").forEach((el) => {
        el.classList.toggle("garage-car-stack__paint--knockout-dark", photo);
      });
      syncCarPaintLayerMask(root, src);

      const imgs = [carImg, ...Array.from(carReflectImgs)].filter(Boolean);
      let pending = imgs.length;
      const undim = () => {
        if (gen !== heroSwapGen) return;
        pending -= 1;
        if (pending <= 0) {
          paintHeroTargets.forEach((el) => el.classList.remove("garage-car-stack__paint--hero-dim"));
        }
      };

      if (pending === 0) {
        paintHeroTargets.forEach((el) => el.classList.remove("garage-car-stack__paint--hero-dim"));
        return;
      }

      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth > 0) undim();
        else {
          img.addEventListener("load", undim, { once: true });
          img.addEventListener("error", undim, { once: true });
        }
      });
    };

    if (same && car) {
      if (carImg) carImg.alt = alt;
      return;
    }

    clearTimeout(heroDimTimer);
    paintHeroTargets.forEach((el) => el.classList.add("garage-car-stack__paint--hero-dim"));
    heroDimTimer = setTimeout(commit, fadeMs);
  }

  function render() {
    const cars = getGarageList();
    const len = cars.length;

    if (len === 0) {
      carStack?.classList.add("garage-car-stack--empty");
      applyCarPaintStack(carStack, null);
      hudEmpty?.removeAttribute("hidden");
      hudVehicle?.setAttribute("hidden", "");
      hudNav?.setAttribute("hidden", "");
      if (hudOrigin) {
        try {
          const n = readSavedCars().length;
          hudOrigin.textContent = `Origin: ${window.location.origin} · mașini în garaj (memorie): ${n}`;
        } catch {
          hudOrigin.textContent = `Origin: ${window.location.origin}`;
        }
      }
      heroSwapGen += 1;
      paintHeroTargets.forEach((el) => el.classList.remove("garage-car-stack__paint--hero-dim"));
      clearTimeout(heroDimTimer);
      if (carImg) {
        carImg.alt = "Vehicle";
        applyHeroDomInstant(null);
        carImg.classList.remove("garage-car-stack__img--photo");
      }
      bodyTypeRail?.setAttribute("hidden", "");
      hudOem?.setAttribute("hidden", "");
      applyStlSync();
      return;
    }

    carStack?.classList.remove("garage-car-stack--empty");
    hudEmpty?.setAttribute("hidden", "");
    hudVehicle?.removeAttribute("hidden");

    carIndex = clampIndex(carIndex, len);
    persistBodyTypeIfNeeded(cars, carIndex);
    const car = cars[carIndex];
    syncBodyTypeRow(cars, carIndex);
    const logoUrl = getBrandLogoUrl(car.brand);

    if (hudLogo) {
      if (logoUrl) {
        hudLogo.src = logoUrl;
        hudLogo.alt = `${car.brand} logo`;
        hudLogo.removeAttribute("hidden");
      } else {
        hudLogo.removeAttribute("src");
        hudLogo.alt = "";
        hudLogo.setAttribute("hidden", "");
      }
    }
    if (hudBrand) hudBrand.textContent = car.brand;
    if (hudModel) hudModel.textContent = car.model != null && String(car.model).trim() ? car.model : "—";
    if (hudEngine) hudEngine.textContent = car.engine != null && String(car.engine).trim() ? car.engine : "—";
    if (hudOem) {
      const oem = garageOemSuspensionFromCar(car);
      const line = `OEM suspensie: față ${oem.front || "—"} · spate ${oem.rear || "—"}`;
      hudOem.textContent = line;
      hudOem.removeAttribute("hidden");
    }
    if (hudCount) {
      hudCount.textContent =
        len === 1 ? "1 mașină în garaj" : `${len} mașini în garaj · ${carIndex + 1}/${len}`;
    }

    if (len > 1) {
      hudNav?.removeAttribute("hidden");
      if (btnPrev) btnPrev.disabled = carIndex <= 0;
      if (btnNext) btnNext.disabled = carIndex >= len - 1;
    } else {
      hudNav?.setAttribute("hidden", "");
    }

    const alt = `${car.brand} ${car.model}`;
    if (carImg) carImg.alt = alt;
    carReflectImgs.forEach((img) => {
      img.alt = "";
    });

    applyHeroImages(car);
    applyCarPaintStack(carStack, car);
    syncCarPaintUi(car);

    const url = new URL(window.location.href);
    url.searchParams.set("car", String(carIndex));
    window.history.replaceState({}, "", url);

    applyStlSync();
  }

  function applyStlSync() {
    const cars = getGarageList();
    const len = cars.length;
    const view3d = garagePageBody.classList.contains("garage-body--3d-view");
    const car = len > 0 ? cars[clampIndex(carIndex, len)] : null;
    syncGarageStlViewer(stlMount, stlStatus, garagePageBody, { car, view3d });
  }

  btnPrev?.addEventListener("click", () => {
    carIndex -= 1;
    render();
  });
  btnNext?.addEventListener("click", () => {
    carIndex += 1;
    render();
  });

  btn3dView?.addEventListener("click", () => {
    const on = garagePageBody.classList.toggle("garage-body--3d-view");
    btn3dView.setAttribute("aria-pressed", on ? "true" : "false");
    applyStlSync();
  });

  const unsubBroadcast = onGarageCarsUpdated(() => render());

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) render();
  });

  window.addEventListener("focus", () => render());

  void import("./garage-cloud-sync.mjs")
    .then((m) => m.syncGarageFromCloudAndLocal())
    .catch((e) => console.warn("[garage-view] sync", e))
    .finally(() => render());

  wireCarPaintUi();

  return () => unsubBroadcast();
}
