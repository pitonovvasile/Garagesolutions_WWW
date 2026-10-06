/** Tipuri pentru modulul site-ului `assets/js/garage-cloud-sync.mjs` (alias Vite `@site-garage-cloud`). */
declare module "@site-garage-cloud" {
  /** Client Supabase (anon) — folosit și pentru `bmw_variant_configurations`. */
  export function getGarageCloudSupabase(): {
    from: (table: string) => {
      select: (columns: string) => {
        in: (
          column: string,
          values: string[],
        ) => Promise<{ data: unknown[] | null; error: { message?: string } | null }>;
        eq: (
          column: string,
          value: string | number,
        ) => {
          eq: (
            column: string,
            value: string | number,
          ) => {
            limit: (
              n: number,
            ) => Promise<{ data: unknown[] | null; error: { message?: string } | null }>;
          };
          limit: (
            n: number,
          ) => Promise<{ data: unknown[] | null; error: { message?: string } | null }>;
          maybeSingle: () => Promise<{ data: unknown | null; error: { message?: string } | null }>;
        };
      };
    };
    auth: {
      getUser: () => Promise<{ data: { user: { id: string } | null } }>;
      onAuthStateChange: (
        callback: (event: string, session: null | unknown) => void,
      ) => { data: { subscription: { unsubscribe: () => void } } };
    };
  };
  export function syncGarageFromCloudAndLocal(): Promise<
    { brand: string; model?: string; engine?: string; bodyType?: string; [key: string]: unknown }[]
  >;
  export function pushLocalGarageToCloud(): Promise<void>;
}
