// Local test bench: end-to-end checks of the session 23 import (ADR-036)
// against the app on :3000 (bench env), live French sites and platforms.
//   node scripts/local/seed-accounts.mjs lea sarah nadia
//   node scripts/local/checks/import-v2.mjs
// Resets the test accounts' imports first (local database copine_app).
import { execFileSync } from "node:child_process";

import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DB = process.env.BENCH_DB ?? "copine_app";
const PASSWORD = "motdepasse-local-123";
const results = [];
const consoleErrors = [];

function sql(query) {
  return execFileSync("su", ["postgres", "-c", `psql -X -At -q -d ${DB}`], {
    input: query,
    encoding: "utf8",
  }).trim();
}

// ONLY="texte" runs the checks whose name contains it (state left by the
// others is not rebuilt).
const ONLY = process.env.ONLY?.toLowerCase();

async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY)) return;
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail, ms: Date.now() - started });
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    results.push({
      name,
      ok: false,
      detail: String(error.message ?? error).split("\n")[0],
    });
    console.log(`✗ ${name} — ${String(error.message ?? error).split("\n")[0]}`);
  }
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});

async function login(email, viewport = { width: 420, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("pageerror", (e) => consoleErrors.push(`${email}: ${e.message}`));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !/Failed to load resource: the server responded with a status of 404/.test(
        m.text(),
      )
    ) {
      consoleErrors.push(`${email}: ${m.text().slice(0, 160)}`);
    }
  });
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.getByRole("button", { name: "Me connecter" }).click();
  await page.waitForURL(/\/recettes/, { timeout: 20000 });
  return page;
}

async function importLink(page, url) {
  await page.goto(`${BASE}/recettes/importer`);
  await page.getByRole("button", { name: "Lien", exact: true }).click();
  await page.fill('input[type="url"]', url);
  await page.getByRole("button", { name: "Importer" }).click();
}

const reviewText = "Vérifie et ajuste avant d'enregistrer";

async function draftTitle(page) {
  await page.getByText(reviewText).waitFor({ timeout: 60000 });
  const title = await page.getByLabel("Titre").inputValue();
  const ingredients = await page
    .locator(
      'input[placeholder*="ingrédient" i], input[aria-label*="ingrédient" i]',
    )
    .count();
  return { title, ingredients };
}

async function save(page) {
  await page
    .getByRole("button", { name: /enregistrer/i })
    .last()
    .click();
  await page.waitForURL(/\/recettes\/(?!importer)[a-z0-9-]+$/, {
    timeout: 20000,
  });
  return page.url().split("/").pop();
}

// A job's result as JSON (the bench stores it as a JSON string).
const RESULT =
  "(case jsonb_typeof(j.result) when 'string' then (j.result #>> '{}')::jsonb else j.result end)";

// Fresh state for the test accounts.
sql(`delete from import_jobs where user_id in (select id from auth.users where email like '%@test.local');
     delete from recipes where author_id in (select id from auth.users where email like '%@test.local');
     delete from creator_withdrawals; update creators set imports_blocked = false;`);

const lea = await login("lea@test.local");
const sarah = await login("sarah@test.local");
const nadia = await login("nadia@test.local");

for (const [name, url] of [
  [
    "Marmiton",
    "https://www.marmiton.org/recettes/recette_crepes-faciles_27121.aspx",
  ],
  ["750g", "https://www.750g.com/crepes-faciles-r78187.htm"],
  [
    "Cuisine AZ",
    "https://www.cuisineaz.com/recettes/pate-a-crepes-facile-56688.aspx",
  ],
  [
    "Journal des Femmes",
    "https://cuisine.journaldesfemmes.fr/recette/333415-pate-a-crepes",
  ],
  [
    "Ptitchef",
    "https://www.ptitchef.com/recettes/plat/one-pot-au-poulet-riz-a-la-tomate-et-au-poivron-fid-1614089",
  ],
  [
    "Hervé Cuisine (WordPress)",
    "https://hervecuisine.com/recette/recette-tartine-avocat-oeuf-mollet/",
  ],
  [
    "Elle à table",
    "https://www.elle.fr/Elle-a-Table/Recettes-de-cuisine/Palourdes-tomates-olives-4627274",
  ],
]) {
  await check(`site ${name} → draft`, async () => {
    await importLink(lea, url);
    const { title } = await draftTitle(lea);
    const credit = await lea
      .getByText("Crédit auteur")
      .locator("..")
      .innerText();
    if (!title) throw new Error("empty title");
    return `« ${title} » · ${credit.replace(/\s+/g, " ").slice(0, 60)}`;
  });
}

await check(
  "saving an import lands in the book, À cuisiner and « Mes imports »",
  async () => {
    await importLink(
      lea,
      "https://www.marmiton.org/recettes/recette_crepes-faciles_27121.aspx",
    );
    await draftTitle(lea);
    const slug = await save(lea);
    const credit = await lea
      .getByText(/D'après le site/)
      .first()
      .innerText();
    const state = sql(
      `select status from import_jobs j join auth.users u on u.id = j.user_id where u.email = 'lea@test.local' and j.source_key = 'web:marmiton.org/recettes/recette_pate-a-crepes-simple_27121.aspx' order by j.created_at desc limit 1`,
    );
    if (state !== "saved") throw new Error(`job ${state}`);
    return `${slug} · ${credit.replace(/\s+/g, " ")}`;
  },
);

await check(
  "same post again (other link shape) → my copy, no new job",
  async () => {
    const before = sql(
      `select count(*) from import_jobs j join auth.users u on u.id = j.user_id where u.email = 'lea@test.local'`,
    );
    await importLink(
      lea,
      "https://www.marmiton.org/recettes/recette_pate-a-crepes-simple_27121.aspx?utm_source=insta#top",
    );
    await lea.getByText(/déjà dans ton carnet/).waitFor({ timeout: 20000 });
    const after = sql(
      `select count(*) from import_jobs j join auth.users u on u.id = j.user_id where u.email = 'lea@test.local'`,
    );
    if (before !== after) throw new Error(`jobs ${before} → ${after}`);
    return "« Ouvrir ma copie » offered";
  },
);

await check(
  "TikTok short link → oEmbed only, @ kept, caption asked when not a recipe",
  async () => {
    await importLink(lea, "https://vm.tiktok.com/ZMhvqjqjq/");
    await lea
      .getByText("Je n'ai pas pu lire la recette automatiquement")
      .waitFor({ timeout: 30000 });
    const job = sql(
      `select source_url || ' | ' || coalesce(${RESULT} ->> 'question', '') from import_jobs j join auth.users u on u.id = j.user_id where u.email = 'lea@test.local' order by j.created_at desc limit 1`,
    );
    if (!job.includes("tiktok.com/@laviniapuglesii/video/7440114099565972791"))
      throw new Error(job.slice(0, 120));
    await lea.getByPlaceholder(/Colle ici la recette/).fill(`Crêpes express
Ingrédients :
- 250 g de farine
- 50 cl de lait
- 3 oeufs
Préparation :
1. Mélange la farine et les oeufs, ajoute le lait petit à petit.
2. Fais cuire les crêpes dans une poêle chaude.`);
    await lea.getByRole("button", { name: "Continuer" }).first().click();
    const { title } = await draftTitle(lea);
    const credit = await lea
      .getByText("Crédit auteur")
      .locator("..")
      .innerText();
    if (!credit.includes("@laviniapuglesii")) throw new Error(credit);
    const hint = await lea.getByText("reformule-les avec tes mots").count();
    const slug = await save(lea);
    const line = await lea
      .getByText(/D'après une vidéo de/)
      .first()
      .innerText();
    return `« ${title} » saved as ${slug} · ${line.replace(/\s+/g, " ")} · reformulate hint: ${hint > 0}`;
  },
);

await check(
  "Instagram → caption or captures with the @, credit kept",
  async () => {
    await importLink(lea, "https://www.instagram.com/p/C1aBcD2eFgH/?igsh=abc");
    await lea
      .getByText("Instagram ne donne plus la légende")
      .waitFor({ timeout: 20000 });
    await lea.getByLabel("@ de la créatrice").fill("@maya.cuisine");
    await lea.getByPlaceholder(/Colle ici la recette/).fill(`Salade de lentilles
Ingrédients :
- 200 g de lentilles vertes
- 1 échalote
- 2 c. à soupe d'huile d'olive
Préparation :
1. Fais cuire les lentilles 20 minutes.
2. Mélange avec l'échalote et l'huile.`);
    await lea.getByRole("button", { name: "Continuer" }).first().click();
    await draftTitle(lea);
    const credit = await lea
      .getByText("Crédit auteur")
      .locator("..")
      .innerText();
    if (!credit.includes("@maya.cuisine")) throw new Error(credit);
    const slug = await save(lea);
    const creator = sql(
      `select c.platform || ':' || c.handle from recipes r join creators c on c.id = r.creator_id where r.slug = '${slug}'`,
    );
    if (creator !== "instagram:maya.cuisine") throw new Error(creator);
    return `${slug} tied to ${creator}`;
  },
);

await check(
  "YouTube without API key → title, @ and the description asked",
  async () => {
    await importLink(lea, "https://youtu.be/dQw4w9WgXcQ?si=abc");
    await lea
      .getByText("Je n'ai pas pu lire la recette automatiquement")
      .waitFor({ timeout: 30000 });
    const job = sql(
      `select source_url || ' ' || coalesce(${RESULT} #>> '{question,sourceAuthor}', '?') from import_jobs j join auth.users u on u.id = j.user_id where u.email = 'lea@test.local' order by j.created_at desc limit 1`,
    );
    if (
      !job.startsWith(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ @rickastleyyt",
      )
    )
      throw new Error(job);
    return job;
  },
);

await check(
  "Pinterest pin → its site is read (credited to it), else the site is asked",
  async () => {
    await importLink(lea, "https://www.pinterest.fr/pin/99360735500167749/");
    await lea
      .getByText("Cette épingle ne donne pas le site de la recette")
      .waitFor({ timeout: 40000 });
    const job = sql(
      `select status || ' ' || coalesce(${RESULT} #>> '{question,ask}', '') || ' ' || coalesce(${RESULT} #>> '{question,sourceUrl}', '') from import_jobs j join auth.users u on u.id = j.user_id where u.email = 'lea@test.local' order by j.created_at desc limit 1`,
    );
    return job;
  },
);

await check(
  "a real recipe pin → the recipe of its site, credited to that site",
  async () => {
    await importLink(nadia, "https://www.pinterest.fr/pin/92464598596177491/");
    const { title } = await draftTitle(nadia);
    const job = sql(
      `select source_url from import_jobs j join auth.users u on u.id = j.user_id where u.email = 'nadia@test.local' order by j.created_at desc limit 1`,
    );
    if (!job.startsWith("https://www.cuisineaz.com/recettes/"))
      throw new Error(job);
    const slug = await save(nadia);
    const line = await nadia
      .getByText(/D'après le site/)
      .first()
      .locator("..")
      .innerText();
    if (!line.includes("cuisineaz.com")) throw new Error(line);
    return `« ${title} » from ${job.replace(/^https:\/\/www\./, "")} (${slug})`;
  },
);

await check(
  "a site that refuses imports → polite refusal, page never read",
  async () => {
    sql(`insert into creators (platform, handle, profile_url, imports_blocked) values ('web', 'cuisineaz.com', 'https://cuisineaz.com', true)
       on conflict (platform, handle) do update set imports_blocked = true`);
    await importLink(
      sarah,
      "https://www.cuisineaz.com/recettes/pate-a-crepes-facile-56688.aspx",
    );
    await sarah
      .getByText(/préfère que ses recettes ne soient pas importées/)
      .waitFor({ timeout: 20000 });
    const jobs = sql(
      `select count(*) from import_jobs j join auth.users u on u.id = j.user_id where u.email = 'sarah@test.local'`,
    );
    sql(
      `update creators set imports_blocked = false where platform = 'web' and handle = 'cuisineaz.com'`,
    );
    if (jobs !== "0") throw new Error(`${jobs} job(s) created`);
    return "no job, « Voir l'original » offered";
  },
);

await check(
  "a withdrawn post → refusal even through a short link",
  async () => {
    sql(`insert into creators (platform, handle, profile_url) values ('tiktok', 'laviniapuglesii', 'https://www.tiktok.com/@laviniapuglesii') on conflict do nothing;
       insert into creator_withdrawals (creator_id, source_key) select id, 'tiktok:7440114099565972791' from creators where platform = 'tiktok' and handle = 'laviniapuglesii' on conflict do nothing;`);
    await importLink(sarah, "https://vm.tiktok.com/ZMhvqjqjq/");
    await sarah
      .getByText(/a retiré cette publication/)
      .waitFor({ timeout: 30000 });
    sql(`delete from creator_withdrawals`);
    return "refused after the short link resolved";
  },
);

await check(
  "quota: near the limit it says so, at the limit it stops",
  async () => {
    sql(`insert into import_jobs (user_id, kind, source_url, status)
       select u.id, 'url', 'https://blog-' || g || '.fr/r', 'failed' from auth.users u, generate_series(1, 18) g where u.email = 'sarah@test.local'`);
    await sarah.goto(`${BASE}/recettes/importer`);
    const near = await sarah
      .getByText(/Il te reste 2 imports aujourd'hui/)
      .count();
    sql(`insert into import_jobs (user_id, kind, source_url, status)
       select u.id, 'url', 'https://blog-' || g || '.fr/r', 'failed' from auth.users u, generate_series(19, 20) g where u.email = 'sarah@test.local'`);
    await sarah.goto(`${BASE}/recettes/importer`);
    await sarah
      .getByText(/c'est le maximum pour l'instant/)
      .waitFor({ timeout: 10000 });
    const disabled = await sarah
      .getByRole("button", { name: "Importer" })
      .isDisabled();
    sql(
      `delete from import_jobs where user_id = (select id from auth.users where email = 'sarah@test.local')`,
    );
    if (near !== 1 || !disabled)
      throw new Error(`near=${near} disabled=${disabled}`);
    return "2 left shown, then the button waits for tomorrow";
  },
);

await check("captures without an AI key → paste the text instead", async () => {
  await sarah.goto(`${BASE}/recettes/importer`);
  await sarah.getByRole("button", { name: "Captures" }).click();
  await sarah
    .getByText("La lecture des captures arrive dès que l'IA est configurée")
    .waitFor({ timeout: 5000 });
  return "tab explains, nothing uploaded";
});

await check(
  "« Mes imports »: resume a question, dismiss it, six rows then « Tout voir »",
  async () => {
    const listed = () =>
      Math.min(
        20,
        Number(
          sql(
            `select count(*) from import_jobs j join auth.users u on u.id = j.user_id where u.email = 'lea@test.local' and j.status <> 'dismissed' and j.created_at > now() - interval '7 days'`,
          ),
        ),
      );
    await lea.goto(`${BASE}/recettes/importer`);
    const list = lea.getByRole("region", { name: "Mes imports" });
    await list.waitFor({ timeout: 10000 });
    const before = listed();
    await list.getByRole("button", { name: "Reprendre" }).first().click();
    await lea
      .getByRole("button", { name: "Importer autre chose" })
      .first()
      .waitFor({ timeout: 10000 });
    await lea.goto(`${BASE}/recettes/importer`);
    await list
      .getByRole("button", { name: /^Retirer/ })
      .first()
      .click();
    await lea.waitForTimeout(800);
    const after = listed();
    if (after !== before - 1) throw new Error(`jobs ${before} → ${after}`);
    await lea.goto(`${BASE}/recettes/importer`);
    await list.waitFor({ timeout: 10000 });
    const visible = await list.locator("li").count();
    if (visible !== Math.min(6, after))
      throw new Error(`${visible} rows shown for ${after} jobs`);
    if (after > 6) {
      await list.getByRole("button", { name: /^Tout voir/ }).click();
      const all = await list.locator("li").count();
      if (all !== after) throw new Error(`« Tout voir » shows ${all}/${after}`);
    }
    return `${before} → ${after} jobs, ${visible} rows then all`;
  },
);

await check("cover photo: private stays private, shared is shown", async () => {
  const slug = sql(
    `select slug from recipes r join auth.users u on u.id = r.author_id where u.email = 'lea@test.local' and r.creator_id is not null order by r.created_at limit 1`,
  );
  await lea.goto(`${BASE}/recettes/${slug}/modifier`);
  await lea
    .locator('input[type="file"]')
    .first()
    .setInputFiles(process.env.COVER_FILE ?? ".local-bench/cover.jpg");
  await lea
    .getByRole("button", { name: "Changer" })
    .waitFor({ timeout: 20000 });
  await lea
    .getByRole("button", { name: /enregistrer/i })
    .last()
    .click();
  await lea.waitForURL(new RegExp(`/recettes/${slug}$`), { timeout: 20000 });
  const path = sql(`select photo_paths[1] from recipes where slug = '${slug}'`);
  const src = `/api/photos/recettes/${path}`;
  const own = await lea.request.get(`${BASE}${src}`);
  const other = await sarah.request.get(`${BASE}${src}`);
  const anon = await (await browser.newContext()).request.get(`${BASE}${src}`);
  sql(`update recipes set visibility = 'community' where slug = '${slug}'`);
  const otherShared = await sarah.request.get(
    `${BASE}${src.replace(".jpg", "-thumb.jpg")}`,
  );
  const anonShared = await (
    await browser.newContext()
  ).request.get(`${BASE}${src}`);
  const statuses = [
    own.status(),
    other.status(),
    anon.status(),
    otherShared.status(),
    anonShared.status(),
  ].join(" ");
  if (statuses !== "200 404 404 200 200") throw new Error(statuses);
  return "owner 200 · others 404 while private · 200 once shared (thumb too), visitors too";
});

for (const path of [
  "/recettes",
  "/recettes?onglet=carnet",
  "/recettes?onglet=a-cuisiner",
  "/recettes/importer",
  "/recettes/journal",
  "/communaute",
  "/profil",
]) {
  await check(`page ${path} renders`, async () => {
    const response = await lea.goto(`${BASE}${path}`);
    if (!response || response.status() >= 400)
      throw new Error(`HTTP ${response?.status()}`);
    return `HTTP ${response.status()}`;
  });
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed`,
);
if (consoleErrors.length > 0)
  console.log("console errors:\n  " + consoleErrors.join("\n  "));
process.exit(failed.length > 0 ? 1 : 0);
