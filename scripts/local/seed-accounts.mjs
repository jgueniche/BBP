// Local test bench: creates onboarded test accounts through lite's auth.
//   node scripts/local/seed-accounts.mjs lea sarah   → lea@test.local / sarah@test.local
// Password for all: « motdepasse-local-123 ». Reads .local-bench/env.local.
import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs
    .readFileSync(
      new URL("../../.local-bench/env.local", import.meta.url),
      "utf8",
    )
    .trim()
    .split("\n")
    .map((line) => line.split(/=(.*)/s).slice(0, 2)),
);
const PASSWORD = "motdepasse-local-123";

for (const name of process.argv.slice(2)) {
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false },
    },
  );
  const email = `${name}@test.local`;
  let { data, error } = await supabase.auth.signUp({
    email,
    password: PASSWORD,
  });
  if (error)
    ({ data, error } = await supabase.auth.signInWithPassword({
      email,
      password: PASSWORD,
    }));
  if (error || !data.user) throw new Error(`${email}: ${error?.message}`);
  const display = name.charAt(0).toUpperCase() + name.slice(1);
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    display_name: display,
    onboarding_completed_at: new Date().toISOString(),
  });
  if (profileError) throw new Error(profileError.message);
  await supabase
    .from("user_settings")
    .upsert({ user_id: data.user.id }, { onConflict: "user_id" });
  console.log(`${email} ${data.user.id}`);
}
