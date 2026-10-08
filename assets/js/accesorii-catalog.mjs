const root = document.getElementById("accessories-categories");
const subcategories = document.getElementById("accessories-subcategories");
const results = document.getElementById("accessories-products");
const title = document.getElementById("accessories-results-title");
const count = document.getElementById("accessories-count");
const search = document.getElementById("accessories-search");

const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("ro")
  .trim();

const locations = (product) => product.categories?.length
  ? product.categories : [{ categoryId: product.categoryId, subcategory: product.subcategory }];
const belongs = (product, categoryId, subcategory = "", leaf = "") => locations(product).some((entry) =>
  entry.categoryId === categoryId && (!subcategory || entry.subcategory === subcategory) &&
  (!leaf || entry.leaf === leaf));

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

try {
  const response = await fetch("../assets/data/bardi-accessories.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const products = Array.isArray(data.products) ? data.products : [];
  const pageSize = 48;
  let visibleLimit = pageSize;
  const params = new URLSearchParams(location.search);
  let selected = categories.some((category) => category.id === params.get("categorie"))
    ? params.get("categorie") : "";
  let selectedChild = categories.find((item) => item.id === selected)?.children?.includes(params.get("subcategorie"))
    ? params.get("subcategorie") : "";
  let selectedLeaf = categories.find((item) => item.id === selected)?.branches?.[selectedChild]?.includes(params.get("tip"))
    ? params.get("tip") : "";

  function render() {
    const query = normalize(search.value);
    root.replaceChildren();
    const all = node("button", "accessories-catalog__category", "Toate categoriile");
    all.type = "button";
    all.classList.toggle("is-active", !selected);
    all.setAttribute("aria-pressed", String(!selected));
    all.addEventListener("click", () => select(""));
    root.append(all);

    const visibleCategories = categories.filter((category) => !query ||
      normalize(category.name).includes(query) || category.children?.some((name) => normalize(name).includes(query)) || products.some((product) =>
        belongs(product, category.id) && matches(product, query)));
    for (const category of visibleCategories) {
      const button = node("button", "accessories-catalog__category", category.name);
      button.type = "button";
      button.classList.toggle("is-active", selected === category.id);
      button.setAttribute("aria-pressed", String(selected === category.id));
      button.addEventListener("click", () => select(category.id));
      root.append(button);
    }

    const category = categories.find((item) => item.id === selected);
    subcategories.replaceChildren();
    subcategories.hidden = !category?.children?.length;
    if (category?.children?.length) {
      const allChildren = node("button", "accessories-catalog__subcategory", "Toate subcategoriile");
      allChildren.type = "button";
      allChildren.classList.toggle("is-active", !selectedChild);
      allChildren.setAttribute("aria-pressed", String(!selectedChild));
      allChildren.addEventListener("click", () => selectChild(""));
      subcategories.append(allChildren);
      for (const child of category.children.filter((name) => !query || normalize(name).includes(query) ||
        products.some((product) => belongs(product, selected, name) && matches(product, query)))) {
        const button = node("button", "accessories-catalog__subcategory", child);
        button.type = "button";
        button.classList.toggle("is-active", selectedChild === child);
        button.setAttribute("aria-pressed", String(selectedChild === child));
        button.addEventListener("click", () => selectChild(child));
        subcategories.append(button);
      }
      for (const leaf of category.branches?.[selectedChild] || []) {
        if (query && !normalize(leaf).includes(query) && !products.some((product) =>
          belongs(product, selected, selectedChild, leaf) && matches(product, query))) continue;
        const button = node("button", "accessories-catalog__subcategory accessories-catalog__leaf", leaf);
        button.type = "button";
        button.classList.toggle("is-active", selectedLeaf === leaf);
        button.setAttribute("aria-pressed", String(selectedLeaf === leaf));
        button.addEventListener("click", () => selectLeaf(leaf));
        subcategories.append(button);
      }
    }

    const filtered = products.filter((product) => (!selected || belongs(product, selected, selectedChild, selectedLeaf)) && matches(product, query));
    title.textContent = selectedLeaf ? `Produse · ${selectedChild} · ${selectedLeaf}` : selectedChild ? `Produse · ${selectedChild}` : category ? `Produse · ${category.name}` : "Produse · toate categoriile";
    count.textContent = `${filtered.length} produse`;
    results.replaceChildren();
    if (!filtered.length) {
      const hasProductsHere = products.some((product) => !selected || belongs(product, selected, selectedChild, selectedLeaf));
      results.append(node("p", "accessories-catalog__empty", query && hasProductsHere
        ? "Nu există produse care să corespundă căutării."
        : "Produsele din această selecție nu sunt încă importate."));
      return;
    }
    for (const product of filtered.slice(0, visibleLimit)) {
      const article = node("article", "accessories-catalog__product");
      article.append(node("h4", "", product.name));
      const details = [product.brand, product.sku && `Cod: ${product.sku}`].filter(Boolean).join(" · ");
      if (details) article.append(node("p", "", details));
      if (product.attributes && typeof product.attributes === "object") {
        const list = node("dl", "accessories-catalog__attributes");
        for (const [key, value] of Object.entries(product.attributes)) {
          if (value === null || value === "") continue;
          list.append(node("dt", "", key), node("dd", "", String(value)));
        }
        if (list.childElementCount) article.append(list);
      }
      if (product.sourceUrl) {
        const link = node("a", "accessories-catalog__source",
          product.sourceUrl.includes("/termeklap/") ? "Vezi produsul la Bardi ↗" : "Vezi lista la Bardi ↗");
        link.href = product.sourceUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        article.append(link);
      }
      results.append(article);
    }
    if (filtered.length > visibleLimit) {
      const remaining = Math.min(pageSize, filtered.length - visibleLimit);
      const more = node("button", "accessories-catalog__more", `Afișează încă ${remaining} produse`);
      more.type = "button";
      more.addEventListener("click", () => {
        visibleLimit += pageSize;
        render();
      });
      results.append(more);
    }
  }

  function matches(product, query) {
    return !query || [product.name, product.brand, product.sku,
      ...locations(product).map((entry) => entry.subcategory),
      ...locations(product).map((entry) => entry.leaf),
      ...Object.values(product.attributes || {})].some((field) => normalize(field).includes(query));
  }

  function select(id) {
    selected = id;
    selectedChild = "";
    selectedLeaf = "";
    visibleLimit = pageSize;
    const url = new URL(location.href);
    if (id) url.searchParams.set("categorie", id);
    else url.searchParams.delete("categorie");
    url.searchParams.delete("subcategorie");
    url.searchParams.delete("tip");
    history.replaceState(null, "", url);
    render();
  }

  function selectChild(name) {
    selectedChild = name;
    selectedLeaf = "";
    visibleLimit = pageSize;
    const url = new URL(location.href);
    if (name) url.searchParams.set("subcategorie", name);
    else url.searchParams.delete("subcategorie");
    url.searchParams.delete("tip");
    history.replaceState(null, "", url);
    render();
  }

  function selectLeaf(name) {
    selectedLeaf = selectedLeaf === name ? "" : name;
    visibleLimit = pageSize;
    const url = new URL(location.href);
    if (selectedLeaf) url.searchParams.set("tip", selectedLeaf);
    else url.searchParams.delete("tip");
    history.replaceState(null, "", url);
    render();
  }

  search.addEventListener("input", () => {
    visibleLimit = pageSize;
    render();
  });
  render();
} catch (error) {
  results.append(node("p", "accessories-catalog__empty", "Catalogul de accesorii nu a putut fi încărcat."));
  console.error("Accesorii catalog:", error);
}
