# Supabase Types

Generate schema types from live database:

```bash
npm run supabase:types
```

This writes `assets/types/supabase.generated.ts`.

Use in TypeScript clients:

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.generated";

const supabase = createClient<Database>(url, anonKey);
```

Regenerate after every schema change.
