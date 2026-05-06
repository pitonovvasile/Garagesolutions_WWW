/**
 * Viewer STL (Three.js) pentru BMW E46 Compact — fișier: assets/garage-cars/bmw/e46/compact/e46-compact.stl
 * Se activează din garaj: „3D view” + mașina curentă E46 cu caroserie Compact.
 */
import { detectBmwGaragePlatform } from "./garage-bmw-platform.mjs";
import { getEffectiveBodyType } from "./garage-body-type.mjs";

export const GARAGE_E46_COMPACT_STL_PATH = "assets/garage-cars/bmw/e46/compact/e46-compact.stl";

/** Vedere implicită: ~50% mai aproape (obiectul pare ~1.5× mai mare). */
const STL_DEFAULT_ZOOM_FACTOR = 1.5;

const THREE_VER = "0.162.0";
const THREE_BASE = `https://esm.sh/three@${THREE_VER}`;

/** @type {Promise<{ THREE: import("three"); STLLoader: typeof import("three/examples/jsm/loaders/STLLoader.js").STLLoader; OrbitControls: typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls }> | null} */
let libsPromise = null;

function loadThreeLibs() {
  if (!libsPromise) {
    libsPromise = Promise.all([
      import(/* webpackIgnore: true */ THREE_BASE),
      import(/* webpackIgnore: true */ `${THREE_BASE}/examples/jsm/loaders/STLLoader.js`),
      import(/* webpackIgnore: true */ `${THREE_BASE}/examples/jsm/controls/OrbitControls.js`),
    ]).then(([threeMod, stlMod, orbitMod]) => ({
      THREE: threeMod,
      STLLoader: stlMod.STLLoader,
      OrbitControls: orbitMod.OrbitControls,
    }));
  }
  return libsPromise;
}

/**
 * @param {{ brand?: string, model?: string, engine?: string, bodyType?: string } | null} car
 */
function wantsE46CompactStl(car) {
  if (!car) return false;
  if (detectBmwGaragePlatform(car) !== "e46") return false;
  return getEffectiveBodyType(car) === "compact";
}

/** @type {{ raf?: number; onResize?: () => void; controls?: import("three/examples/jsm/controls/OrbitControls.js").OrbitControls; mesh?: import("three").Mesh; scene?: import("three").Scene; camera?: import("three").PerspectiveCamera; renderer?: import("three").WebGLRenderer; initializing?: boolean }} */
const st = {};

let stlSession = 0;

function disposeInternals() {
  st.initializing = false;
  if (st.raf != null) {
    cancelAnimationFrame(st.raf);
    st.raf = undefined;
  }
  if (st.onResize) {
    window.removeEventListener("resize", st.onResize);
    st.onResize = undefined;
  }
  st.controls?.dispose();
  st.controls = undefined;
  if (st.mesh) {
    st.mesh.geometry?.dispose();
    const m = st.mesh.material;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m?.dispose();
    st.mesh = undefined;
  }
  if (st.scene) {
    st.scene.clear();
    st.scene = undefined;
  }
  st.camera = undefined;
  if (st.renderer) {
    st.renderer.dispose();
    st.renderer.domElement?.remove();
    st.renderer = undefined;
  }
}

/**
 * @param {HTMLElement | null} mount
 * @param {HTMLElement | null} statusEl
 * @param {HTMLElement} bodyEl
 * @param {{ car: object | null, view3d: boolean }} opts
 */
export function syncGarageStlViewer(mount, statusEl, bodyEl, { car, view3d }) {
  const want = Boolean(view3d && wantsE46CompactStl(car));

  if (!want) {
    stlSession += 1;
    disposeInternals();
    mount?.setAttribute("hidden", "");
    if (mount) mount.replaceChildren();
    statusEl?.setAttribute("hidden", "");
    if (statusEl) statusEl.textContent = "";
    bodyEl.classList.remove("garage-body--stl-active");
    return;
  }

  if (!mount) return;

  mount.removeAttribute("hidden");
  bodyEl.classList.add("garage-body--stl-active");

  if (st.renderer) {
    if (statusEl && st.mesh) {
      statusEl.setAttribute("hidden", "");
      statusEl.textContent = "";
    }
    return;
  }

  if (st.initializing) return;

  if (statusEl) {
    statusEl.removeAttribute("hidden");
    statusEl.textContent = "Se încarcă modelul 3D…";
  }

  const session = stlSession;
  st.initializing = true;
  const stlUrl = new URL(GARAGE_E46_COMPACT_STL_PATH, window.location.href).href;

  loadThreeLibs()
    .then(({ THREE, STLLoader, OrbitControls }) => {
      st.initializing = false;
      if (session !== stlSession) return;
      if (!bodyEl.classList.contains("garage-body--3d-view")) {
        mount.setAttribute("hidden", "");
        bodyEl.classList.remove("garage-body--stl-active");
        disposeInternals();
        return;
      }
      if (!wantsE46CompactStl(car)) {
        mount.setAttribute("hidden", "");
        bodyEl.classList.remove("garage-body--stl-active");
        disposeInternals();
        return;
      }

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000);
      const z = STL_DEFAULT_ZOOM_FACTOR;
      camera.position.set(2.2 / z, 1.4 / z, 2.6 / z);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mount.replaceChildren(renderer.domElement);

      const hemi = new THREE.HemisphereLight(0x9fb4d9, 0x1a1a22, 0.85);
      scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xffffff, 1.05);
      dir.position.set(4, 8, 6);
      scene.add(dir);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.target.set(0, 0, 0);
      controls.zoomSpeed = 1.35;

      st.scene = scene;
      st.camera = camera;
      st.renderer = renderer;
      st.controls = controls;

      const loader = new STLLoader();
      loader.load(
        stlUrl,
        (geometry) => {
          if (session !== stlSession || !st.scene || !st.renderer) return;
          geometry.computeVertexNormals();
          geometry.center();
          geometry.computeBoundingBox();
          const box = geometry.boundingBox;
          const size = new THREE.Vector3();
          if (box) box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
          const scale = 1.85 / maxDim;

          const material = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            metalness: 0.35,
            roughness: 0.45,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.scale.setScalar(scale);
          scene.add(mesh);
          st.mesh = mesh;
          controls.update();

          if (statusEl) {
            statusEl.setAttribute("hidden", "");
            statusEl.textContent = "";
          }
        },
        undefined,
        () => {
          if (session !== stlSession) return;
          disposeInternals();
          mount.replaceChildren();
          mount.setAttribute("hidden", "");
          bodyEl.classList.remove("garage-body--stl-active");
          if (statusEl) {
            statusEl.removeAttribute("hidden");
            statusEl.textContent =
              "Nu s-a putut încărca e46-compact.stl (verifică fișierul în assets/…/compact/ și rețeaua pentru Three.js).";
          }
        }
      );

      const resize = () => {
        if (!st.renderer || !st.camera || !mount) return;
        const w = mount.clientWidth || 640;
        const h = mount.clientHeight || 360;
        st.camera.aspect = w / h;
        st.camera.updateProjectionMatrix();
        st.renderer.setSize(w, h, false);
      };
      st.onResize = resize;
      window.addEventListener("resize", resize);
      requestAnimationFrame(resize);

      const tick = () => {
        if (!st.renderer || !st.scene || !st.camera) return;
        /** @type {number | undefined} */
        const raf = requestAnimationFrame(tick);
        st.raf = raf;
        st.controls?.update();
        st.renderer.render(st.scene, st.camera);
      };
      tick();
    })
    .catch(() => {
      st.initializing = false;
      if (session !== stlSession) return;
      disposeInternals();
      mount.setAttribute("hidden", "");
      bodyEl.classList.remove("garage-body--stl-active");
      if (statusEl) {
        statusEl.removeAttribute("hidden");
        statusEl.textContent = "Three.js nu s-a putut încărca (rețea / CDN blocat).";
      }
    });
}
