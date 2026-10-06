import { useEffect } from "react";
import garageLogo from "../../../assets/garage-solutions-logo.png";

/**
 * Clonă funcțională a headerului din `categorii/suspensie.html` (aceleași clase CSS ca site-ul),
 * cu încărcare dinamică a `assets/css/main.css` ca să nu fie procesat de PostCSS/Tailwind din Vite.
 * Butonul «Garajul meu» este navigare generală pe site; pe pagini precum catalogul OEM+ nu înseamnă că acel catalog citește garajul.
 */
export function GarageSiteHeader() {
  useEffect(() => {
    document.body.classList.add("body--categorie");
    return () => {
      document.body.classList.remove("body--categorie");
    };
  }, []);

  useEffect(() => {
    const id = "garage-injected-main-css";
    if (document.getElementById(id)) return;
    const href = new URL("../assets/css/main.css", window.location.href).href;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);

  useEffect(() => {
    const id = "garage-injected-site-theme";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.src = new URL("../assets/js/site-theme.js", window.location.href).href;
    s.defer = true;
    document.body.appendChild(s);
  }, []);

  return (
    <div className="site-top site-top--hero">
      <header className="header header--secondary-apex">
        <a className="logo-link" href="../index.html" aria-label="Garage Solutions — acasa">
          <img className="logo-img" src={garageLogo} alt="Garage Solutions" width={333} height={222} loading="eager" />
        </a>
        <nav className="main-nav" aria-label="Navigare principala">
          <a href="../index.html#categorii">Piese auto</a>
          <a href="../anvelope.html">Anvelope</a>
          <a href="../universale/jante-auto.html">Jante</a>
          <a href="../universale.html">Universale</a>
          <a href="../index.html">Oferte</a>
          <a href="../index.html">Contact</a>
          <div className="header-account-cluster">
            <div className="header-account-cluster__buttons">
              <button
                id="garage-btn"
                className="account-link"
                type="button"
                aria-label="Zona garaj utilizator"
                onClick={() => {
                  window.location.href = "../garage.html";
                }}
              >
                Garajul meu
              </button>
              <button
                id="account-btn"
                className="account-link account-link--secondary"
                type="button"
                aria-label="Contul meu"
                aria-expanded="false"
                aria-controls="account-panel"
                onClick={() => {
                  window.location.href = "../cont.html";
                }}
              >
                Contul meu
              </button>
            </div>
          </div>
        </nav>
        <div className="header-apex" aria-label="Cont, favorite, cos">
          <button
            type="button"
            className="header-apex__identity"
            id="header-identity-btn"
            aria-controls="account-panel"
            aria-label="Deschide contul"
            onClick={() => {
              window.location.href = "../cont.html";
            }}
          >
            <svg className="header-apex__svg" width={22} height={22} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.35" />
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                d="M5 20.2c1.3-4.2 4.8-6.5 7-6.5s5.7 2.3 7 6.5"
              />
            </svg>
            <span className="header-apex__user-text" id="header-user-label">
              Autentificate!
            </span>
          </button>
          <span className="header-apex__favorites-wrap" id="header-favorites-wrap" hidden>
            <button type="button" className="header-apex__icon-btn" id="header-favorites-btn" aria-label="Favorite" title="Favorite">
              <svg className="header-apex__svg" width={22} height={22} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinejoin="round"
                  d="M12 20.2S5 15.7 5 10.3c0-2.8 2.2-5 4.9-5 1.5 0 2.9.7 3.6 1.9.7-1.1 2-1.9 3.5-1.9 2.8 0 5 2.2 5 5 0 5.4-7 9.9-7 9.9Z"
                />
              </svg>
            </button>
          </span>
          <button type="button" className="header-apex__icon-btn" id="header-cart-btn" aria-label="Cos cumparaturi" title="Cos">
            <svg className="header-apex__svg" width={22} height={22} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5V4a3 3 0 0 1 6 0v1M6 6h12l-1.4 12.2a1.5 1.5 0 0 1-1.5 1.3H8.9a1.5 1.5 0 0 1-1.5-1.3L6 6Z"
              />
              <circle cx="10" cy="20" r="0.95" fill="currentColor" stroke="none" />
              <circle cx="17" cy="20" r="0.95" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
        <div className="theme-switch-wrap theme-switch-wrap--header-corner" aria-label="Comutator temă">
          <span className="theme-switch__txt">Dark</span>
          <label className="theme-switch">
            <input
              type="checkbox"
              id="site-theme-toggle"
              className="theme-switch__input"
              role="switch"
              aria-checked="false"
              aria-label="Comută tema între dark și bright"
            />
            <span className="theme-switch__slider" />
          </label>
          <span className="theme-switch__txt">Bright</span>
        </div>
      </header>
    </div>
  );
}
