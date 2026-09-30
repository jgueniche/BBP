// Local test bench: checks public.recipe_source_key against the cases
// shared with src/lib/import/source-key.ts. Prints SQL for psql:
//   node scripts/local/check-source-key.mjs | su postgres -c "psql -X -At -d copine_rls"
import fs from "node:fs";

const cases = JSON.parse(
  fs.readFileSync(
    new URL("../../src/lib/import/source-key.cases.json", import.meta.url),
    "utf8",
  ),
);
const quote = (value) =>
  value === null ? "null" : `'${value.replaceAll("'", "''")}'`;
const rows = cases
  .map(([url, key]) => `(${quote(url)}, ${quote(key)})`)
  .join(",\n  ");
console.log(`select case when count(*) = 0 then 'source keys: all ${cases.length} cases match'
  else string_agg(url || ' -> ' || coalesce(public.recipe_source_key(url), 'null') || ' (expected ' || coalesce(expected, 'null') || ')', E'\\n') end
from (values
  ${rows}
) as c(url, expected)
where public.recipe_source_key(url) is distinct from expected;`);
