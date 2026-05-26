import { createRoot } from "react-dom/client";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GarageSiteHeader } from "./components/GarageSiteHeader";
import { SuspensionCategoryPage } from "./suspension-catalog/components/SuspensionCategoryPage";
import { SUSPENSION_KITS_OEM_PLUS_SLUG } from "./suspension-catalog/types";

function readOemPlusQueryParams(): {
  productCategorySlug?: string;
  tableName: string;
} {
  if (typeof window === "undefined") {
    return { tableName: "bilstein_suspension_options" };
  }
  const qs = new URLSearchParams(window.location.search);
  const slug = qs.get("product_category_slug")?.trim();
  const table = qs.get("table")?.trim();
  return {
    productCategorySlug: slug || undefined,
    tableName: table || "bilstein_suspension_options",
  };
}

const { productCategorySlug: slugFromUrl, tableName } = readOemPlusQueryParams();
const productCategorySlug = slugFromUrl ?? SUSPENSION_KITS_OEM_PLUS_SLUG;

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = '<p style="color:#fecaca;padding:16px">Lipsește &lt;div id="root"&gt;.</p>';
} else {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <div className="oem-plus-app flex min-h-dvh w-full flex-col bg-transparent text-neutral-200 antialiased">
        <GarageSiteHeader />
        <SuspensionCategoryPage tableConfig={{ tableName }} productCategorySlug={productCategorySlug} />
      </div>
    </ErrorBoundary>,
  );
}
