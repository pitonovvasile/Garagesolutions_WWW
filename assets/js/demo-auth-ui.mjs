import {
  getSession,
  loginDemo,
  logoutDemo,
  registerDemo,
  requestPasswordResetDemo,
  DEMO_SESSION_KEY,
  DEMO_SESSION_CHANGED_EVENT,
} from "./demo-auth.mjs";
import { DEMO_ORDERS, DEMO_FAVORITES, DEMO_ACTIVITY } from "./demo-data.mjs";

/**
 * Conectează formularele (login / register / parolă uitată) și secțiunile comenzi / favorite / activitate in panou.
 * @param {{ manageHeader?: boolean }} [options]
 * @returns {() => void} apelat la fiecare deschidere a panoului
 */
export function initDemoAuthUI(options = {}) {
  const manageHeader = options.manageHeader !== false;
  const elOut = document.getElementById("auth-logged-out");
  const elIn = document.getElementById("auth-logged-in");
  const form = document.getElementById("demo-login-form");
  const email = document.getElementById("demo-email");
  const pass = document.getElementById("demo-password");
  const err = document.getElementById("demo-auth-error");
  const userLine = document.getElementById("demo-user-line");
  const metaLine = document.getElementById("demo-session-meta");
  const logoutBtn = document.getElementById("demo-logout-btn");
  const ordersBox = document.getElementById("orders-demo-container");
  const favBox = document.getElementById("favorites-demo-container");
  const actBox = document.getElementById("activity-demo-container");

  const tabLogin = document.getElementById("auth-tab-login");
  const tabRegister = document.getElementById("auth-tab-register");
  const tabForgot = document.getElementById("auth-tab-forgot");
  const panelLogin = document.getElementById("auth-panel-login");
  const panelRegister = document.getElementById("auth-panel-register");
  const panelForgot = document.getElementById("auth-panel-forgot");

  const formReg = document.getElementById("demo-register-form");
  const regEmail = document.getElementById("demo-register-email");
  const regPass = document.getElementById("demo-register-password");
  const regPass2 = document.getElementById("demo-register-password2");
  const errReg = document.getElementById("demo-register-error");

  const formForgot = document.getElementById("demo-forgot-form");
  const forgotEmail = document.getElementById("demo-forgot-email");
  const errForgot = document.getElementById("demo-forgot-error");
  const successForgot = document.getElementById("demo-forgot-success");

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function setActiveAuthTab(tabId) {
    const isLogin = tabId === "login";
    const isReg = tabId === "register";
    const isForg = tabId === "forgot";

    if (tabLogin) {
      tabLogin.setAttribute("aria-selected", isLogin ? "true" : "false");
    }
    if (tabRegister) {
      tabRegister.setAttribute("aria-selected", isReg ? "true" : "false");
    }
    if (tabForgot) {
      tabForgot.setAttribute("aria-selected", isForg ? "true" : "false");
    }

    if (panelLogin) {
      panelLogin.toggleAttribute("hidden", !isLogin);
    }
    if (panelRegister) {
      panelRegister.toggleAttribute("hidden", !isReg);
    }
    if (panelForgot) {
      panelForgot.toggleAttribute("hidden", !isForg);
    }

    if (!isReg && errReg) {
      errReg.textContent = "";
      errReg.hidden = true;
    }
    if (!isForg) {
      if (errForgot) {
        errForgot.textContent = "";
        errForgot.hidden = true;
      }
      if (successForgot) {
        successForgot.textContent = "";
        successForgot.hidden = true;
      }
    }
  }

  tabLogin?.addEventListener("click", () => setActiveAuthTab("login"));
  tabRegister?.addEventListener("click", () => setActiveAuthTab("register"));
  tabForgot?.addEventListener("click", () => setActiveAuthTab("forgot"));

  function renderLockedPlaceholder(container, message) {
    if (!container) return;
    container.innerHTML = `<p class="account-panel__placeholder">${esc(message)}</p>`;
  }

  function renderOrdersLoggedIn() {
    if (!ordersBox) return;
    ordersBox.innerHTML = "";
    DEMO_ORDERS.forEach((o) => {
      const art = document.createElement("article");
      art.className = "account-panel__order";
      art.innerHTML = `
        <div class="account-panel__order-head">
          <span class="account-panel__order-id">${esc(o.id)}</span>
          <span class="account-panel__order-date">${esc(o.date)}</span>
        </div>
        <p class="account-panel__order-status">
          <span class="account-panel__status-badge ${esc(o.statusClass || "")}">${esc(o.status)}</span>
          <strong>Total: ${esc(o.total)}</strong> · ${esc(o.method)}
        </p>
        <p class="account-panel__order-addr">${esc(o.address)}</p>
        <ul class="account-panel__order-items">
          ${o.items
            .map(
              (it) =>
                `<li><span class="ref">${esc(it.ref)}</span> ${esc(it.name)} ×${it.qty} <span class="line">${esc(it.line)}</span></li>`
            )
            .join("")}
        </ul>
      `;
      ordersBox.appendChild(art);
    });
  }

  function renderFavoritesLoggedIn() {
    if (!favBox) return;
    favBox.innerHTML = "";
    const ul = document.createElement("ul");
    ul.className = "account-panel__fav-list";
    DEMO_FAVORITES.forEach((f) => {
      const li = document.createElement("li");
      li.className = "account-panel__fav-item";
      li.innerHTML = `
        <p class="account-panel__fav-name">${esc(f.name)}</p>
        <p class="account-panel__fav-ref"><code>${esc(f.ref)}</code></p>
        <p class="account-panel__fav-note">${esc(f.note)}</p>
        <p class="account-panel__fav-price">${esc(f.price)}</p>
      `;
      ul.appendChild(li);
    });
    favBox.appendChild(ul);
  }

  function renderActivityLoggedIn() {
    if (!actBox) return;
    actBox.innerHTML = "";
    const ul = document.createElement("ul");
    ul.className = "account-panel__activity";
    DEMO_ACTIVITY.forEach((a) => {
      const li = document.createElement("li");
      li.innerHTML = `<time datetime="">${esc(a.t)}</time> <span class="msg">${esc(a.m)}</span>`;
      ul.appendChild(li);
    });
    actBox.appendChild(ul);
  }

  function updateDemoHeader(session) {
    if (!manageHeader) return;
    const headerUserLabel = document.getElementById("header-user-label");
    const headerFavoritesWrap = document.getElementById("header-favorites-wrap");
    if (!session) {
      if (headerUserLabel) headerUserLabel.textContent = "Contul meu";
      if (headerFavoritesWrap) headerFavoritesWrap.hidden = true;
      return;
    }
    if (headerUserLabel) {
      headerUserLabel.textContent = session.displayName || session.email?.split("@")[0] || "Utilizator";
    }
    if (headerFavoritesWrap) headerFavoritesWrap.hidden = false;
  }

  function clearAuthErrors() {
    if (err) {
      err.textContent = "";
      err.hidden = true;
    }
    if (errReg) {
      errReg.textContent = "";
      errReg.hidden = true;
    }
    if (errForgot) {
      errForgot.textContent = "";
      errForgot.hidden = true;
    }
  }

  function render() {
    const s = getSession();
    clearAuthErrors();
    if (successForgot) {
      successForgot.textContent = "";
      successForgot.hidden = true;
    }

    if (!s) {
      if (elOut) elOut.hidden = false;
      if (elIn) elIn.hidden = true;
      if (form) form.reset();
      if (formReg) formReg.reset();
      if (formForgot) formForgot.reset();
      setActiveAuthTab("login");
      renderLockedPlaceholder(
        ordersBox,
        "Autentifică-te (demo) ca să vezi comenzile exemplu cu detalii, stări si linii de produs."
      );
      renderLockedPlaceholder(
        favBox,
        "Autentifică-te (demo) pentru a vedea piese favorite cu referințe și prețuri orientative."
      );
      renderLockedPlaceholder(actBox, "Jurnalul de activitate (demo) este disponibil după autentificare.");
      updateDemoHeader(null);
      return;
    }

    if (elOut) elOut.hidden = true;
    if (elIn) elIn.hidden = false;
    if (userLine) {
      userLine.textContent = `Bună, ${s.displayName || "utilizator"}`;
    }
    if (metaLine) {
      const d = new Date(s.loginAt);
      metaLine.textContent = `E-mail: ${s.email} · Sesiune demo până la ${d.toLocaleDateString("ro-RO")} (sincronizare prin preview local).`;
    }
    updateDemoHeader(s);

    renderOrdersLoggedIn();
    renderFavoritesLoggedIn();
    renderActivityLoggedIn();
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (err) {
        err.textContent = "";
        err.hidden = true;
      }
      const r = loginDemo(email?.value, pass?.value);
      if (!r.ok) {
        if (err) {
          err.textContent = r.error;
          err.hidden = false;
        }
        return;
      }
      render();
    });
  }

  if (formReg) {
    formReg.addEventListener("submit", (e) => {
      e.preventDefault();
      if (errReg) {
        errReg.textContent = "";
        errReg.hidden = true;
      }
      const r = registerDemo(regEmail?.value, regPass?.value, regPass2?.value);
      if (!r.ok) {
        if (errReg) {
          errReg.textContent = r.error;
          errReg.hidden = false;
        }
        return;
      }
      render();
    });
  }

  if (formForgot) {
    formForgot.addEventListener("submit", (e) => {
      e.preventDefault();
      if (errForgot) {
        errForgot.textContent = "";
        errForgot.hidden = true;
      }
      if (successForgot) {
        successForgot.textContent = "";
        successForgot.hidden = true;
      }
      const r = requestPasswordResetDemo(forgotEmail?.value);
      if (!r.ok) {
        if (errForgot) {
          errForgot.textContent = r.error;
          errForgot.hidden = false;
        }
        return;
      }
      if (successForgot) {
        successForgot.textContent = r.message;
        successForgot.hidden = false;
      }
    });
  }

  logoutBtn?.addEventListener("click", () => {
    logoutDemo();
    render();
  });

  window.addEventListener("storage", (e) => {
    if (e.key === DEMO_SESSION_KEY) {
      render();
    }
  });
  window.addEventListener(DEMO_SESSION_CHANGED_EVENT, render);
  window.addEventListener("pageshow", render);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") render();
  });

  setActiveAuthTab("login");
  render();
  return render;
}
