"use client";

import { BookOpen, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { CoachBubble } from "@/components/coach/coach-bubble";
import { ILLUSTRATIONS } from "@/components/illustrations";
import { CopineAvatar } from "@/components/illustrations/copine-avatar";
import { Logo } from "@/components/illustrations/logo";
import {
  RecipeCard,
  type RecipeCardData,
} from "@/components/recipes/recipe-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { KashrutPill } from "@/components/ui/kashrut-pill";
import { MacroRing } from "@/components/ui/macro-ring";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { StickerCard } from "@/components/ui/sticker-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fr } from "@/i18n/fr";
import {
  COLLECTION_COLOR_CLASSES,
  type CollectionColor,
} from "@/lib/collections/colors";
import { cn } from "@/lib/utils/cn";
import { PASTEL_BG, PASTELS, type Pastel, pastelAt } from "@/lib/utils/pastel";

const d = fr.design;

const BRAND = [
  { name: "encre", cls: "bg-encre", hex: "#2B2230" },
  { name: "framboise", cls: "bg-framboise", hex: "#C0265E" },
  { name: "framboise-deep", cls: "bg-framboise-deep", hex: "#9A1C4A" },
  { name: "nacre", cls: "bg-nacre", hex: "#F7F3F5" },
  { name: "ink-50", cls: "bg-ink-50", hex: "#6F6272" },
  { name: "ok", cls: "bg-ok", hex: "#2F6B4B" },
  { name: "warn", cls: "bg-warn", hex: "#8A5300" },
  { name: "neutral", cls: "bg-neutral", hex: "#5C5160" },
];

const PASTEL_HEX: Record<Pastel, string> = {
  rose: "#FDE7EF",
  lilas: "#F1EBFD",
  menthe: "#DDF3E7",
  beurre: "#FFEFC2",
  peche: "#FFE3D6",
  ciel: "#E4EFFB",
};

const SAMPLE_RECIPES: RecipeCardData[] = [
  {
    slug: "tarte-fine-abricots",
    title: "Tarte fine aux abricots",
    icon: null,
    kashrut_class: null,
    is_fish: false,
    origin: null,
    version_kind: "boutargue",
    prep_min: 15,
    cook_min: 20,
  },
  {
    slug: "dal-lentilles-corail",
    title: "Dal de lentilles corail",
    icon: null,
    kashrut_class: null,
    is_fish: false,
    origin: null,
    version_kind: "boutargue",
    prep_min: 10,
    cook_min: 25,
  },
];

const SAMPLE_COLLECTIONS: {
  name: string;
  count: number;
  color: CollectionColor;
}[] = [
  { name: "Dîners de semaine", count: 32, color: "boutargue" },
  { name: "Desserts d'enfance", count: 18, color: "parve" },
  { name: "Batch cooking", count: 24, color: "ok" },
];

const COPY = [
  {
    avoid: "« Aucune recette »",
    prefer: "« Ton carnet attend ses premières recettes. »",
  },
  {
    avoid: "« Erreur d'import »",
    prefer:
      "« Je n'ai pas trouvé la recette : colle la légende ou une capture. »",
  },
  { avoid: null, prefer: "« Ta liste de courses est prête. »" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DesignShowcase() {
  const s = d.sections;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 pb-24">
      <header className="flex flex-col gap-4">
        <Logo variant="ink" height={48} />
        <div aria-hidden className="vichy h-1.5 w-24 rounded-full" />
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {d.title}
        </h1>
        <p className="text-ink-70">{d.subtitle}</p>
        <p className="font-display text-lg font-medium text-framboise-deep italic">
          {fr.app.tagline}
        </p>
      </header>

      <Section title={s.colors}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BRAND.map((c) => (
            <div key={c.name} className="flex items-center gap-2">
              <span
                className={`size-10 shrink-0 rounded-[10px] border ${c.cls}`}
              />
              <span className="flex flex-col text-xs">
                <span className="font-semibold">{c.name}</span>
                <span className="font-mono text-ink-50">{c.hex}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={s.pastels}>
        <p className="text-sm text-ink-70">{d.pastelsHint}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PASTELS.map((p) => (
            <div
              key={p}
              className={cn(
                "flex min-h-28 flex-col justify-between gap-3 rounded-lg p-4",
                PASTEL_BG[p],
              )}
            >
              <span className="font-display text-xl font-semibold">
                {d.pastelNames[p]}
              </span>
              <span className="flex flex-col gap-0.5 text-xs">
                <span className="text-ink-70">{d.pastelUses[p]}</span>
                <span className="font-mono text-ink-50">
                  bg-{p} · {PASTEL_HEX[p]}
                </span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={s.typography}>
        <div className="flex flex-col gap-4">
          <p className="font-display text-5xl font-medium tracking-tight">
            Dîner de samedi
          </p>
          <p className="font-display text-4xl font-semibold tracking-tight">
            Tarte fine aux abricots
          </p>
          <p className="font-display text-3xl font-semibold">
            Mes carnets <span className="font-medium italic">partagés</span>
          </p>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-50 uppercase">
            Plat · 45 min · 4 personnes
          </p>
          <p className="text-lg">
            Inter pour le texte — les chiffres sont tabulaires : 1 234,5 g.
          </p>
          <p className="text-sm text-ink-70">
            Recette de @maya.cuisine · Voir l&apos;original
          </p>
          <p className="font-mono text-sm">
            JetBrains Mono · farine 250 g · 12:00 · 4 pers.
          </p>
        </div>
      </Section>

      <Section title={s.buttons}>
        <div className="flex flex-wrap items-center gap-4">
          <Button>Mode cuisine</Button>
          <Button variant="secondary">Ajouter au planning</Button>
          <Button variant="outline">Partager</Button>
          <Button variant="ghost">Plus tard</Button>
          <Button variant="link">Voir l&apos;original</Button>
          <Button size="icon" aria-label="Ajouter">
            <Plus />
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast("Ajoutée à Dîners de semaine.")}
          >
            Toast
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {PASTELS.map((p) => (
            <Badge key={p} variant={p}>
              {d.pastelNames[p]}
            </Badge>
          ))}
          <Badge variant="ok">Compatible</Badge>
          <Badge variant="warn">Adaptable</Badge>
        </div>
      </Section>

      <Section title={s.cards}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {SAMPLE_RECIPES.map((recipe, i) => (
              <RecipeCard
                key={recipe.slug}
                recipe={recipe}
                likes={i === 0 ? 24 : 8}
                author={i === 0 ? "@maya.cuisine" : "@jade.cuisine"}
              />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SAMPLE_COLLECTIONS.map((c) => (
              <li
                key={c.name}
                className={cn(
                  "flex flex-col gap-2 rounded-lg p-4",
                  COLLECTION_COLOR_CLASSES[c.color],
                )}
              >
                <BookOpen size={24} strokeWidth={1.5} aria-hidden />
                <span className="font-display text-base leading-tight font-semibold">
                  {c.name}
                </span>
                <span className="text-xs text-ink-70">
                  {c.count} {fr.recettes.collections.recipesLabel}
                </span>
              </li>
            ))}
          </ul>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Poulet au citron confit</CardTitle>
                <CardDescription>
                  Plat · 45 min · variante végétarienne
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Badge variant="ok">OK pour toi et Léa</Badge>
                <Badge variant="warn">Adaptable pour Sami</Badge>
              </CardContent>
            </Card>
            <StickerCard
              interactive
              className="flex items-center justify-center"
            >
              <p className="py-6 text-center text-sm text-ink-70">
                Carte interactive : survol et appui tout en douceur.
              </p>
            </StickerCard>
          </div>
        </div>
      </Section>

      <Section title={s.forms}>
        <div className="flex max-w-sm flex-col gap-3">
          <Input
            aria-label="Rechercher"
            placeholder="Une recette, un ingrédient…"
          />
          <Tabs defaultValue="ingredients">
            <TabsList>
              <TabsTrigger value="ingredients">Ingrédients</TabsTrigger>
              <TabsTrigger value="etapes">Étapes</TabsTrigger>
            </TabsList>
            <TabsContent
              value="ingredients"
              className="pt-2 text-sm text-ink-70"
            >
              6 ingrédients, dont 2 déjà cochés.
            </TabsContent>
            <TabsContent value="etapes" className="pt-2 text-sm text-ink-70">
              6 étapes, 45 minutes en tout.
            </TabsContent>
          </Tabs>
          <div className="flex gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                  Dialog
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter à un carnet ?</DialogTitle>
                  <DialogDescription>
                    Choisis où ranger cette recette ; tu pourras la déplacer
                    ensuite.
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary" size="sm">
                  Sheet
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>Qui apporte quoi ?</SheetTitle>
                  <SheetDescription>
                    Pain, jus pétillants, fromages : chacun choisit ce
                    qu&apos;il apporte au dîner.
                  </SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </Section>

      <Section title={s.kashrut}>
        <p className="text-sm text-ink-70">{d.kashrutHint}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <KashrutPill kind="bassari" />
          <KashrutPill kind="halavi" />
          <KashrutPill kind="parve" />
          <KashrutPill kind="parve" isFish />
        </div>
      </Section>

      <Section title={s.progress}>
        <div className="flex flex-wrap items-center gap-6">
          <MacroRing value={3} max={4} label="portions" unit="" />
          <MacroRing value={4} max={6} label="Étapes" unit="" />
          <div className="w-48">
            <Progress value={66} aria-label="Progression 66 %" />
          </div>
        </div>
      </Section>

      <Section title={s.kemia}>
        <div className="flex flex-col gap-4">
          <CopineAvatar size={72} />
          <p className="ml-auto max-w-[80%] rounded-lg rounded-br-[4px] bg-rose px-4 py-3 text-[15px]">
            On est six samedi, avec Sami végétarien et Léa sans gluten. Une idée
            de menu ?
          </p>
          <CoachBubble>
            Avec plaisir. Velouté de potimarron, poulet au citron confit avec
            une version pois chiches pour Sami, puis un fondant à la farine de
            riz.
          </CoachBubble>
        </div>
      </Section>

      <Section title={s.illustrations}>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
          {ILLUSTRATIONS.map(({ name, Component }, i) => (
            <div
              key={name}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg p-3",
                PASTEL_BG[pastelAt(i)],
              )}
            >
              <Component size={56} />
              <span className="text-center text-[11px] text-ink-70">
                {name}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={s.logos}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <Logo variant="ink" height={40} />
            <Logo variant="mark" height={40} />
          </div>
          <div className="flex flex-wrap items-center gap-6 rounded-lg bg-encre p-4">
            <Logo variant="paper" height={36} />
          </div>
          <div className="flex flex-col gap-2">
            <div aria-hidden className="vichy h-1.5 rounded-full" />
            <p className="text-sm text-ink-70">{d.signature}</p>
          </div>
        </div>
      </Section>

      <Section title={s.states}>
        <div className="flex flex-col gap-4">
          <EmptyState
            illustration={<CopineAvatar size={64} />}
            title="Ton carnet t'attend"
            hint="Importe ta première recette depuis Instagram, TikTok ou un site."
            action={<Button size="sm">Importer une recette</Button>}
          />
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="size-5 animate-spin rounded-full border border-t-framboise"
            />
            <span className="text-sm text-ink-50">
              Copine réfléchit, deux secondes…
            </span>
          </div>
        </div>
      </Section>

      <Section title={s.copy}>
        <ul className="flex list-none flex-col gap-3 text-sm">
          {COPY.map((line) => (
            <li key={line.prefer} className="flex flex-wrap items-center gap-2">
              {line.avoid && (
                <span className="inline-flex items-center gap-1.5 text-ink-50">
                  <X size={14} strokeWidth={2} aria-hidden />
                  <span className="sr-only">{d.copyAvoid} :</span>
                  {line.avoid}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Check
                  size={14}
                  strokeWidth={2}
                  className="text-ok"
                  aria-hidden
                />
                <span className="sr-only">{d.copyPrefer} :</span>
                {line.prefer}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
