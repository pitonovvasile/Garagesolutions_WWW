import { createRoot, type Root } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";

declare global {
  interface Window {
    __garageEngineRoot?: Root;
    __garageEngineRootContainer?: HTMLElement;
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    '<p style="color:#fecaca;padding:16px">Lipsește &lt;div id="root"&gt; în HTML.</p>';
} else {
  if (window.__garageEngineRoot && window.__garageEngineRootContainer === rootEl) {
    try {
      window.__garageEngineRoot.unmount();
    } catch (error) {
      console.warn("[garage-engine] previous React root cleanup failed", error);
    }
  }
  rootEl.replaceChildren();
  window.__garageEngineRootContainer = rootEl;
  window.__garageEngineRoot = createRoot(rootEl);
  window.__garageEngineRoot.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
}
