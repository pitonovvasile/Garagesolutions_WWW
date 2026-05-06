import { readSavedCars, GARAGE_STORAGE_KEY } from "./garage-saved-cars.mjs";

/**
 * Panou „Contul meu”: fundal, Escape, focus, listă garaj din localStorage.
 */
export function initAccountPanel({
  accountBtn,
  accountPanel,
  accountCloseBtn,
  savedCarsList = null,
  /** Apelat la fiecare deschidere (ex. refresh UI autentificare demo). */
  onOpen = null,
}) {
  if (!accountPanel) {
    return {
      open() {},
      close() {},
      refreshSavedCars() {},
      destroy() {},
    };
  }

  const backdrop = document.createElement("div");
  backdrop.className = "account-panel__backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  document.body.appendChild(backdrop);

  let previousFocus = null;

  function renderSavedCars() {
    if (!savedCarsList) return;
    const cars = readSavedCars();
    savedCarsList.innerHTML = "";
    if (cars.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Nu ai masini salvate.";
      savedCarsList.appendChild(li);
      return;
    }
    cars.forEach((car) => {
      const li = document.createElement("li");
      li.textContent = `${car.brand} | ${car.model} | ${car.engine}`;
      savedCarsList.appendChild(li);
    });
  }

  function isOpen() {
    return accountPanel.classList.contains("is-open");
  }

  function open() {
    if (isOpen()) return;
    previousFocus = document.activeElement;
    accountPanel.classList.add("is-open");
    accountPanel.setAttribute("aria-hidden", "false");
    if (accountBtn) {
      accountBtn.setAttribute("aria-expanded", "true");
    }
    backdrop.classList.add("is-visible");
    document.body.classList.add("has-account-panel-open");
    renderSavedCars();
    try {
      if (typeof onOpen === "function") {
        onOpen();
      }
    } catch (e) {
      console.warn("[account-panel] onOpen:", e);
    }
    requestAnimationFrame(() => {
      const focusEl =
        accountCloseBtn || accountPanel.querySelector("button, [href], input, select, a");
      if (focusEl && typeof focusEl.focus === "function") {
        focusEl.focus();
      }
    });
  }

  function close() {
    if (!isOpen()) return;
    accountPanel.classList.remove("is-open");
    accountPanel.setAttribute("aria-hidden", "true");
    if (accountBtn) {
      accountBtn.setAttribute("aria-expanded", "false");
    }
    backdrop.classList.remove("is-visible");
    document.body.classList.remove("has-account-panel-open");
    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    } else {
      accountBtn?.focus();
    }
  }

  function onKeydown(e) {
    if (e.key !== "Escape" || !isOpen()) return;
    e.preventDefault();
    close();
  }

  function onStorage(e) {
    if (e.key === GARAGE_STORAGE_KEY) {
      renderSavedCars();
    }
  }

  function onAccountBtnClick(e) {
    e.preventDefault();
    open();
  }

  function onCloseBtnClick() {
    close();
  }

  function onBackdropClick() {
    close();
  }

  accountBtn?.addEventListener("click", onAccountBtnClick);
  accountCloseBtn?.addEventListener("click", onCloseBtnClick);
  backdrop.addEventListener("click", onBackdropClick);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("storage", onStorage);

  renderSavedCars();

  return {
    open,
    close,
    refreshSavedCars: renderSavedCars,
    destroy() {
      document.removeEventListener("keydown", onKeydown);
      window.removeEventListener("storage", onStorage);
      accountBtn?.removeEventListener("click", onAccountBtnClick);
      accountCloseBtn?.removeEventListener("click", onCloseBtnClick);
      backdrop.removeEventListener("click", onBackdropClick);
      backdrop.remove();
    },
  };
}
