# Catalog Hub Architecture

Catalog Hub is the separate data layer for Garage Solutions vehicle identity,
supplier products, fitments, prices, stock and delivery times.

The main rule: Bardi is a parts distributor, not the canonical vehicle database.
Its vehicle selector is supplier-specific mapping evidence that helps us connect
Bardi products and offers to Garage Solutions vehicles.

## Goals

- Keep Garage Solutions vehicle and product identity independent from any one
  distributor.
- Store raw supplier evidence separately from reviewed canonical data.
- Support multiple distributors with different vehicle IDs, product SKUs,
  prices, stock states and delivery times.
- Let the current Supabase site consume clean, narrow views once the hub is
  stable.
- Preserve provenance for every capture, so odd years, duplicate models and
  changed supplier labels can be audited.

## Layers

### 1. Raw Evidence

`catalog_hub.source_snapshots`

This stores what we captured from a supplier frontend, file or future API:

- source kind: selector, years, engines, product listing, product detail, offer
- supplier
- source URL/file
- observed date
- browser/profile when known
- raw JSON payload or checksum

This layer is not the truth. It is the evidence.

### 2. Supplier Mapping

Supplier-specific rows live in:

- `catalog_hub.supplier_vehicle_types`
- `catalog_hub.supplier_vehicle_years`
- `catalog_hub.supplier_vehicle_refs`
- `catalog_hub.supplier_products`
- `catalog_hub.supplier_product_fitments`
- `catalog_hub.supplier_offers`

For Bardi, this is where the local SQLite data maps naturally:

- Bardi make/model/year/engine rows become supplier vehicle evidence.
- Bardi product rows become supplier products.
- Bardi prices, stock and lead times become supplier offers.
- A supplier vehicle ref can later point to a canonical vehicle variant.

Other distributors get their own supplier rows with the same structure.

### 3. Canonical Data

Canonical Garage Solutions rows live in:

- `catalog_hub.vehicle_makes`
- `catalog_hub.vehicle_models`
- `catalog_hub.vehicle_types`
- `catalog_hub.vehicle_type_years`
- `catalog_hub.vehicle_engines`
- `catalog_hub.vehicle_variants`
- `catalog_hub.part_brands`
- `catalog_hub.product_categories`
- `catalog_hub.canonical_products`
- `catalog_hub.product_identifiers`
- `catalog_hub.product_fitments`

These tables are the reviewed identity layer. The site should eventually use
these IDs, not Bardi IDs.

## Data Flow

1. Capture supplier frontend data.
2. Insert source payload metadata into `source_snapshots`.
3. Import supplier-specific vehicle/product/offer rows.
4. Match supplier vehicles to canonical vehicle variants.
5. Match supplier products to canonical products.
6. Use offer rows for price, stock and delivery comparison.
7. Expose only narrow read views/RPCs to the public site.

## Current Local Bardi Source

The current local prototype is outside this website repo:

`/Users/vasilepitonov/Desktop/GarageSolutions_Configurator/data/catalog.sqlite3`

It currently contains:

- 146 makes
- 1,703 vehicle types
- 28,497 model-year pairs
- 21,159 engine/variant rows
- 0 supplier offers

Ford and Mercedes-Benz currently have model/year coverage but no captured
engine rows in that local database.

## Supabase Strategy

The first migration is:

`supabase/migrations/018_catalog_hub_foundation.sql`

It creates a private `catalog_hub` schema. It intentionally does not grant anon
access. Public reads should come later through carefully shaped views or RPCs,
for example:

- vehicle selector view
- products for selected vehicle
- current offers for selected canonical product
- supplier comparison for selected vehicle/category

This keeps raw supplier data and internal matching work out of the public API.

## Next Implementation Steps

1. Build an importer from the local Bardi SQLite prototype into
   `catalog_hub.supplier_*` tables.
2. Add deterministic normalization helpers for makes, models, engine labels and
   OE codes.
3. Import the Bardi selector and engine captures as supplier evidence.
4. Add a review screen or report for unmatched/ambiguous vehicle rows.
5. Start product/price capture for Bardi into `supplier_products` and
   `supplier_offers`.
6. Create public read views once the matching quality is good enough for the
   site.
