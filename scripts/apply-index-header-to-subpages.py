#!/usr/bin/env python3
"""One-off helper: replace legacy <header class="header"> with index-style apex header + account panel."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PANEL_RAW = r"""    <aside id="account-panel" class="account-panel" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="account-panel-title">
      <div class="account-panel__header">
        <h2 id="account-panel-title">Contul meu</h2>
        <button id="account-close-btn" type="button" class="account-panel__close">Inchide</button>
      </div>
      <div class="account-panel__section account-panel__section--auth" id="auth-section">
        <h3>Cont (demo)</h3>
        <p class="account-panel__hint" style="margin-top: 0; margin-bottom: 0.55rem; font-size: 0.76rem">
          <a class="account-panel__cont-link" href="__CONT_HREF__">Pagină cont (nume, firmă, parolă) — baza de date</a>
        </p>
        <div id="auth-logged-out">
          <div class="account-panel__subnav" role="tablist" aria-label="Autentificare și cont">
            <button
              type="button"
              class="account-panel__tab"
              role="tab"
              id="auth-tab-login"
              aria-selected="true"
              aria-controls="auth-panel-login"
            >
              Conectează-te
            </button>
            <button
              type="button"
              class="account-panel__tab"
              role="tab"
              id="auth-tab-register"
              aria-selected="false"
              aria-controls="auth-panel-register"
            >
              Creare cont
            </button>
            <button
              type="button"
              class="account-panel__tab"
              role="tab"
              id="auth-tab-forgot"
              aria-selected="false"
              aria-controls="auth-panel-forgot"
            >
              Parolă uitată
            </button>
          </div>
          <div id="auth-panel-login" class="account-panel__tabpanel" role="tabpanel" aria-labelledby="auth-tab-login">
            <p class="account-panel__hint">
              Parola de demonstrație: <strong>demo</strong> — orice e-mail valid (ex.
              <code>eu@exemplu.ro</code>).
            </p>
            <form id="demo-login-form" class="account-panel__form" novalidate>
              <label class="account-panel__field">
                <span class="account-panel__field-label">E-mail</span>
                <input
                  id="demo-email"
                  name="email"
                  type="email"
                  autocomplete="username"
                  required
                  placeholder="nume@domeniu.ro"
                  class="account-panel__input"
                />
              </label>
              <label class="account-panel__field">
                <span class="account-panel__field-label">Parolă</span>
                <input
                  id="demo-password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  placeholder="demo"
                  class="account-panel__input"
                />
              </label>
              <p id="demo-auth-error" class="account-panel__error" role="alert" hidden></p>
              <button type="submit" class="account-panel__submit" id="demo-login-btn">Conectează-te</button>
            </form>
          </div>
          <div id="auth-panel-register" class="account-panel__tabpanel" role="tabpanel" aria-labelledby="auth-tab-register" hidden>
            <p class="account-panel__hint">
              Alege o parolă de cel puțin 6 caractere. După creare ești conectat automat; la următoarea vizită folosește
              același e-mail cu parola <strong>demo</strong> (mod demonstrație).
            </p>
            <form id="demo-register-form" class="account-panel__form" novalidate>
              <label class="account-panel__field">
                <span class="account-panel__field-label">E-mail</span>
                <input
                  id="demo-register-email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  placeholder="nume@domeniu.ro"
                  class="account-panel__input"
                />
              </label>
              <label class="account-panel__field">
                <span class="account-panel__field-label">Parolă</span>
                <input
                  id="demo-register-password"
                  name="password"
                  type="password"
                  autocomplete="new-password"
                  required
                  minlength="6"
                  class="account-panel__input"
                />
              </label>
              <label class="account-panel__field">
                <span class="account-panel__field-label">Confirmă parola</span>
                <input
                  id="demo-register-password2"
                  name="password2"
                  type="password"
                  autocomplete="new-password"
                  required
                  minlength="6"
                  class="account-panel__input"
                />
              </label>
              <p id="demo-register-error" class="account-panel__error" role="alert" hidden></p>
              <button type="submit" class="account-panel__submit" id="demo-register-btn">Creează contul</button>
            </form>
          </div>
          <div id="auth-panel-forgot" class="account-panel__tabpanel" role="tabpanel" aria-labelledby="auth-tab-forgot" hidden>
            <p class="account-panel__hint">
              Introdu adresa de e-mail asociată contului. În modul demonstrație nu se trimite un e-mail real.
            </p>
            <form id="demo-forgot-form" class="account-panel__form" novalidate>
              <label class="account-panel__field">
                <span class="account-panel__field-label">E-mail</span>
                <input
                  id="demo-forgot-email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  placeholder="nume@domeniu.ro"
                  class="account-panel__input"
                />
              </label>
              <p id="demo-forgot-error" class="account-panel__error" role="alert" hidden></p>
              <p id="demo-forgot-success" class="account-panel__success" role="status" aria-live="polite" hidden></p>
              <button type="submit" class="account-panel__submit" id="demo-forgot-btn">Trimite instrucțiuni</button>
            </form>
          </div>
        </div>
        <div id="auth-logged-in" hidden>
          <p id="demo-user-line" class="account-panel__welcome"></p>
          <p id="demo-session-meta" class="account-panel__meta"></p>
          <p style="margin: 0 0 0.5rem; font-size: 0.8rem">
            <a class="account-panel__cont-link" href="__CONT_HREF__">Deschide pagina de cont (Supabase) →</a>
          </p>
          <button type="button" class="account-panel__logout" id="demo-logout-btn">Deconectare</button>
        </div>
      </div>
      <div class="account-panel__section">
        <h3>Mașinile salvate</h3>
        <ul id="garage-saved-list"></ul>
      </div>
      <div class="account-panel__section" id="cos-cumparaturi-section">
        <h3>Istoric comenzi (demo)</h3>
        <div id="orders-demo-container"></div>
      </div>
      <div class="account-panel__section" id="favorite-articles-section">
        <h3>Piese favorite (demo)</h3>
        <div id="favorites-demo-container"></div>
      </div>
      <div class="account-panel__section">
        <h3>Activitate recentă (demo)</h3>
        <div id="activity-demo-container"></div>
      </div>
    </aside>
"""


def panel_html(base: str) -> str:
    href = f"{base}cont.html"
    return PANEL_RAW.replace("__CONT_HREF__", href)


def header_html(
    base: str,
    jante_href: str,
    *,
    jante_aria: str = "",
    universale_aria: str = "",
    account_aria: str = "",
) -> str:
    return f"""    <div class="site-top site-top--hero">
      <header class="header header--secondary-apex">
        <a class="logo-link" href="{base}index.html" aria-label="Garage Solutions — acasa">
          <img
            class="logo-img"
            src="{base}assets/garage-solutions-logo.png"
            alt="Garage Solutions"
            width="333"
            height="222"
            loading="eager"
          />
        </a>
        <nav class="main-nav" aria-label="Navigare principala">
          <a href="{base}index.html#categorii">Piese auto</a>
          <a href="{base}anvelope.html">Anvelope</a>
          <a href="{jante_href}"{jante_aria}>Jante</a>
          <a href="{base}universale.html"{universale_aria}>Universale</a>
          <a href="{base}index.html">Oferte</a>
          <a href="{base}index.html">Contact</a>
          <div class="header-account-cluster">
            <div class="header-account-cluster__buttons">
              <button id="garage-btn" class="account-link" type="button" aria-label="Zona garaj utilizator">
                Garajul meu
              </button>
              <button
                id="account-btn"
                class="account-link account-link--secondary"
                type="button"
                aria-label="Contul meu"
                aria-expanded="false"
                aria-controls="account-panel"{account_aria}
              >
                Contul meu
              </button>
            </div>
          </div>
        </nav>
        <div class="header-apex" aria-label="Cont, favorite, cos">
          <button type="button" class="header-apex__identity" id="header-identity-btn" aria-controls="account-panel" aria-label="Deschide contul">
            <svg class="header-apex__svg" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" stroke-width="1.35" />
              <path fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" d="M5 20.2c1.3-4.2 4.8-6.5 7-6.5s5.7 2.3 7 6.5" />
            </svg>
            <span class="header-apex__user-text" id="header-user-label">Autentificate!</span>
          </button>
          <span class="header-apex__favorites-wrap" id="header-favorites-wrap" hidden>
            <button type="button" class="header-apex__icon-btn" id="header-favorites-btn" aria-label="Piese favorite salvate" title="Favorite">
              <svg class="header-apex__svg" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.35"
                  stroke-linejoin="round"
                  d="M12 20.2S5 15.7 5 10.3c0-2.8 2.2-5 4.9-5 1.5 0 2.9.7 3.6 1.9.7-1.1 2-1.9 3.5-1.9 2.8 0 5 2.2 5 5 0 5.4-7 9.9-7 9.9Z"
                />
              </svg>
            </button>
          </span>
          <button type="button" class="header-apex__icon-btn" id="header-cart-btn" aria-label="Cos cumparaturi" title="Cos">
            <svg class="header-apex__svg" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="1.35"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 5V4a3 3 0 0 1 6 0v1M6 6h12l-1.4 12.2a1.5 1.5 0 0 1-1.5 1.3H8.9a1.5 1.5 0 0 1-1.5-1.3L6 6Z"
              />
              <circle cx="10" cy="20" r="0.95" fill="currentColor" stroke="none" />
              <circle cx="17" cy="20" r="0.95" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
        <div
          class="theme-switch-wrap theme-switch-wrap--header-corner"
          aria-label="Comutator temă"
        >
          <span class="theme-switch__txt">Dark</span>
          <label class="theme-switch">
            <input
              type="checkbox"
              id="site-theme-toggle"
              class="theme-switch__input"
              role="switch"
              aria-checked="false"
              aria-label="Comută tema între dark și bright"
            />
            <span class="theme-switch__slider"></span>
          </label>
          <span class="theme-switch__txt">Bright</span>
        </div>
      </header>
    </div>
"""


def scripts_standard(base: str) -> str:
    mod = f"{base}assets/js/" if base else "./assets/js/"
    return f"""    <script src="{base}assets/js/site-theme.js" defer></script>
    <script src="{base}assets/js/main.js"></script>
    <script type="module">
      import {{ initAccountPanel }} from "{mod}account-panel.mjs";
      import {{ initDemoAuthUI }} from "{mod}demo-auth-ui.mjs";

      document.getElementById("y").textContent = new Date().getFullYear();

      const accountBtn = document.getElementById("account-btn");
      const accountPanel = document.getElementById("account-panel");
      const accountCloseBtn = document.getElementById("account-close-btn");
      const garageSavedList = document.getElementById("garage-saved-list");
      let refreshDemoAuthUi = () => {{}};
      const accountPanelApi = initAccountPanel({{
        accountBtn,
        accountPanel,
        accountCloseBtn,
        savedCarsList: garageSavedList,
        onOpen: () => refreshDemoAuthUi(),
      }});
      refreshDemoAuthUi = initDemoAuthUI();

      function scrollAccountSection(id) {{
        const el = document.getElementById(id);
        el?.scrollIntoView({{ block: "nearest", behavior: "smooth" }});
      }}

      document.getElementById("header-identity-btn")?.addEventListener("click", () => {{
        accountPanelApi.open();
      }});
      document.getElementById("header-favorites-btn")?.addEventListener("click", () => {{
        accountPanelApi.open();
        requestAnimationFrame(() => scrollAccountSection("favorite-articles-section"));
      }});
      document.getElementById("header-cart-btn")?.addEventListener("click", () => {{
        accountPanelApi.open();
        requestAnimationFrame(() => scrollAccountSection("cos-cumparaturi-section"));
      }});

      const garageBtn = document.getElementById("garage-btn");
      if (garageBtn) {{
        garageBtn.addEventListener("click", function () {{
          window.location.href = "{base}index.html";
        }});
      }}
    </script>
"""


def scripts_cont_page() -> str:
    base = ""
    return f"""    <script src="{base}assets/js/site-theme.js" defer></script>
    <script type="module">
      import {{ initAccountPanel }} from "./assets/js/account-panel.mjs";
      import {{ initDemoAuthUI }} from "./assets/js/demo-auth-ui.mjs";

      document.getElementById("y").textContent = new Date().getFullYear();

      const accountBtn = document.getElementById("account-btn");
      const accountPanel = document.getElementById("account-panel");
      const accountCloseBtn = document.getElementById("account-close-btn");
      const garageSavedList = document.getElementById("garage-saved-list");
      let refreshDemoAuthUi = () => {{}};
      const accountPanelApi = initAccountPanel({{
        accountBtn,
        accountPanel,
        accountCloseBtn,
        savedCarsList: garageSavedList,
        onOpen: () => refreshDemoAuthUi(),
      }});
      refreshDemoAuthUi = initDemoAuthUI();

      function scrollAccountSection(id) {{
        const el = document.getElementById(id);
        el?.scrollIntoView({{ block: "nearest", behavior: "smooth" }});
      }}

      document.getElementById("header-identity-btn")?.addEventListener("click", () => {{
        accountPanelApi.open();
      }});
      document.getElementById("header-favorites-btn")?.addEventListener("click", () => {{
        accountPanelApi.open();
        requestAnimationFrame(() => scrollAccountSection("favorite-articles-section"));
      }});
      document.getElementById("header-cart-btn")?.addEventListener("click", () => {{
        accountPanelApi.open();
        requestAnimationFrame(() => scrollAccountSection("cos-cumparaturi-section"));
      }});

      const garageBtn = document.getElementById("garage-btn");
      if (garageBtn) {{
        garageBtn.addEventListener("click", function () {{
          window.location.href = "{base}index.html";
        }});
      }}
    </script>
    <script type="module" src="assets/js/account-profile-page.mjs"></script>
"""


OLD_HEADER_RE = re.compile(r"\s*<header class=\"header\">.*?</header>\s*", re.DOTALL)

FOOTER_TAIL_RE = re.compile(
    r"(<footer class=\"footer\">\s*<small>©\s*<span id=\"y\"></span>\s*Garage Solutions</small>\s*</footer>\s*)(.*)(</body>\s*</html>\s*)",
    re.DOTALL,
)


def inject_panel(text: str, base: str) -> str:
    if 'id="account-panel"' in text:
        return text
    panel = panel_html(base)
    return re.sub(
        r"(</main>)(\s*)(?=<footer class=\"footer\">)",
        r"\1\n\n" + panel + r"\2",
        text,
        count=1,
    )


def replace_footer_scripts(text: str, base: str, *, cont_page: bool) -> str:
    def repl(m: re.Match[str]) -> str:
        footer_open = m.group(1)
        _old_scripts = m.group(2)
        body_close = m.group(3)
        if cont_page:
            new_scripts = scripts_cont_page()
        else:
            new_scripts = scripts_standard(base)
        return footer_open + "\n" + new_scripts + "\n" + body_close

    new_text, n = FOOTER_TAIL_RE.subn(repl, text, count=1)
    if n != 1:
        raise RuntimeError("Could not replace footer script block")
    return new_text


def process(
    path: Path,
    *,
    base: str,
    jante_href: str,
    jante_aria: str = "",
    universale_aria: str = "",
    account_aria: str = "",
    cont_tail: bool = False,
) -> None:
    text = path.read_text(encoding="utf-8")
    if "header--secondary-apex" in text:
        print(f"skip (already apex): {path.relative_to(ROOT)}")
        return
    m = OLD_HEADER_RE.search(text)
    if not m:
        print(f"skip (no legacy header): {path.relative_to(ROOT)}")
        return
    h = header_html(
        base,
        jante_href,
        jante_aria=jante_aria,
        universale_aria=universale_aria,
        account_aria=account_aria,
    )
    text = OLD_HEADER_RE.sub(h, text, count=1)
    text = inject_panel(text, base)
    text = replace_footer_scripts(text, base, cont_page=cont_tail)
    path.write_text(text, encoding="utf-8")
    print(f"ok: {path.relative_to(ROOT)}")


def main() -> None:
    for f in sorted((ROOT / "universale").glob("*.html")):
        is_jante = f.name == "jante-auto.html"
        process(
            f,
            base="../",
            jante_href="jante-auto.html",
            jante_aria=' aria-current="page"' if is_jante else "",
        )

    for f in sorted((ROOT / "categorii").glob("*.html")):
        process(
            f,
            base="../",
            jante_href="../universale/jante-auto.html",
        )

    process(
        ROOT / "universale.html",
        base="",
        jante_href="universale/jante-auto.html",
        universale_aria=' aria-current="page"',
    )

    process(
        ROOT / "cont.html",
        base="",
        jante_href="universale/jante-auto.html",
        account_aria=' aria-current="page"',
        cont_tail=True,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(e, file=sys.stderr)
        sys.exit(1)
