#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const PROJECT_REF = "reboxjzkoopkfwaemjrz";

const token = (process.env.SUPABASE_ACCESS_TOKEN || execFileSync("pbpaste", { encoding: "utf8" })).trim();

if (!/^sbp_[A-Za-z0-9]+$/.test(token)) {
  throw new Error("SUPABASE_ACCESS_TOKEN or clipboard must contain a Supabase personal access token.");
}

const query = `
select jsonb_build_object(
  'suppliers', (select count(*) from catalog_hub.suppliers),
  'supplierVehicleTypes', (select count(*) from catalog_hub.supplier_vehicle_types where supplier_id = 'bardi'),
  'supplierVehicleYears', (select count(*) from catalog_hub.supplier_vehicle_years where supplier_id = 'bardi'),
  'supplierVehicleRefs', (select count(*) from catalog_hub.supplier_vehicle_refs where supplier_id = 'bardi'),
  'adminUsers', (select count(*) from catalog_hub.admin_users where email = 'pitonov.vasile@gmail.com' and is_active = true),
  'coverageSample', (
    select jsonb_agg(row_to_json(x) order by x.make)
    from (
      select
        t.external_make_label as make,
        count(distinct t.external_type_id)::integer as vehicle_types,
        count(distinct concat(y.external_type_id, ':', y.production_year))::integer as model_years,
        count(distinct r.external_vehicle_id)::integer as vehicle_refs
      from catalog_hub.supplier_vehicle_types t
      left join catalog_hub.supplier_vehicle_years y
        on y.supplier_id = t.supplier_id
       and y.external_type_id = t.external_type_id
      left join catalog_hub.supplier_vehicle_refs r
        on r.supplier_id = t.supplier_id
       and r.external_type_id = t.external_type_id
      where t.supplier_id = 'bardi'
        and t.external_make_label in ('AUDI', 'BMW', 'FORD', 'MERCEDES BENZ')
      group by t.external_make_label
    ) x
  )
) as result;
`;

const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ query }),
});

const text = await response.text();
if (!response.ok) {
  throw new Error(`Catalog Hub count query failed (${response.status}): ${text.slice(0, 4000)}`);
}

const payload = JSON.parse(text);
console.log(JSON.stringify(payload, null, 2));
