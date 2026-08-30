"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { CoachBubble } from "@/components/coach/coach-bubble";
import { ILLUSTRATIONS } from "@/components/illustrations";
import {
  KemiaAvatar,
  type KemiaExpression,
} from "@/components/illustrations/kemia-avatar";
import { Logo } from "@/components/illustrations/logo";
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

const COLORS = [
  { name: "ink", cls: "bg-ink", hex: "#0B0B0B" },
  { name: "paper", cls: "bg-paper", hex: "#FBFAF6" },
  { name: "boutargue", cls: "bg-boutargue", hex: "#F26A1B" },
  { name: "boutargue-deep", cls: "bg-boutargue-deep", hex: "#C24F0E" },
  { name: "boutargue-soft", cls: "bg-boutargue-soft", hex: "#FFD9BF" },
  { name: "ink-70", cls: "bg-ink-70", hex: "#3D3D3D" },
  { name: "ink-50", cls: "bg-ink-50", hex: "#7A7A7A" },
  { name: "ink-30", cls: "bg-ink-30", hex: "#B8B8B8" },
  { name: "ink-10", cls: "bg-ink-10", hex: "#EBEAE5" },
  { name: "ok", cls: "bg-ok", hex: "#2E7D4F" },
  { name: "warn", cls: "bg-warn", hex: "#B54708" },
  { name: "halavi", cls: "bg-halavi", hex: "#5B7DB1" },
  { name: "bassari", cls: "bg-bassari", hex: "#A63D2F" },
  { name: "parve", cls: "bg-parve", hex: "#7A7A7A" },
];

const EXPRESSIONS: KemiaExpression[] = [
  "sourire",
  "clin",
  "surprise",
  "fiere",
  "douce",
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
      <h2 className="font-display text-2xl font-extrabold tracking-tight">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DesignShowcase() {
  const s = fr.design.sections;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 pb-24">
      <header className="flex flex-col gap-4">
        <Logo variant="ink" height={48} />
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          {fr.design.title}
        </h1>
        <p className="text-ink-70">{fr.design.subtitle}</p>
        <p className="font-display text-lg font-bold text-boutargue-deep">
          {fr.app.tagline}
        </p>
      </header>

      <Section title={s.colors}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLORS.map((c) => (
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

      <Section title={s.typography}>
        <div className="flex flex-col gap-3">
          <p className="font-display text-5xl font-extrabold tracking-tight">
            Bricolage Grotesque
          </p>
          <p className="text-lg">
            Inter pour le corps — les chiffres sont tabulaires : 1 234,5 kcal.
          </p>
          <p className="font-mono text-sm">
            JetBrains Mono · P 132 g · G 210 g · L 64 g
          </p>
        </div>
      </Section>

      <Section title={s.buttons}>
        <div className="flex flex-wrap items-center gap-4">
          <Button>Bsahtek, on y va</Button>
          <Button variant="secondary">Plus tard</Button>
          <Button variant="outline">Option</Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="link">Lien souligné</Button>
          <Button size="icon" aria-label="Ajouter">
            <Plus />
          </Button>
          <Button onClick={() => toast("Bsahtek ! C'est enregistré.")}>
            Toast
          </Button>
        </div>
      </Section>

      <Section title={s.cards}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Couscous boulettes</CardTitle>
              <CardDescription>
                Version Protéine · boulettes de dinde
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <KashrutPill kind="bassari" />
              <Badge>Protéine</Badge>
            </CardContent>
          </Card>
          <StickerCard interactive className="flex items-center justify-center">
            <p className="py-6 text-center text-sm text-ink-70">
              StickerCard interactive — survol et appui tout en douceur.
            </p>
          </StickerCard>
        </div>
      </Section>

      <Section title={s.forms}>
        <div className="flex max-w-sm flex-col gap-3">
          <Input placeholder="Dis-moi ce que tu as mangé…" />
          <Tabs defaultValue="proteine">
            <TabsList>
              <TabsTrigger value="proteine">Protéine</TabsTrigger>
              <TabsTrigger value="boutargue">Boutargue</TabsTrigger>
            </TabsList>
            <TabsContent value="proteine" className="pt-2 text-sm text-ink-70">
              Mode diète : cibles caloriques et protéines.
            </TabsContent>
            <TabsContent value="boutargue" className="pt-2 text-sm text-ink-70">
              Mode plaisir : tendance et équilibre, zéro culpabilité.
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
                  <DialogTitle>Un petit ajustement ?</DialogTitle>
                  <DialogDescription>
                    Journée généreuse (+320). On équilibre demain, tranquille.
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
                  <SheetTitle>Repas de chabbat</SheetTitle>
                  <SheetDescription>
                    Dîner de vendredi, déjeuner de samedi, seuda chlichit.
                  </SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </Section>

      <Section title={s.kashrut}>
        <div className="flex flex-wrap gap-3">
          <KashrutPill kind="bassari" />
          <KashrutPill kind="halavi" />
          <KashrutPill kind="parve" />
          <KashrutPill kind="parve" isFish />
        </div>
      </Section>

      <Section title={s.progress}>
        <div className="flex flex-wrap items-center gap-6">
          <MacroRing value={1450} max={1800} label="kcal" />
          <MacroRing value={96} max={130} label="Protéines" unit="g" />
          <div className="w-48">
            <Progress value={66} aria-label="Progression 66 %" />
          </div>
          <Badge variant="ok">−0,4 kg cette semaine</Badge>
          <Badge variant="warn">Belek au déficit</Badge>
        </div>
      </Section>

      <Section title={s.kemia}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-4">
            {EXPRESSIONS.map((e) => (
              <div key={e} className="flex flex-col items-center gap-1">
                <KemiaAvatar expression={e} size={72} />
                <span className="text-xs text-ink-50">{e}</span>
              </div>
            ))}
          </div>
          <CoachBubble expression="fiere">
            Trois séances cette semaine, mabrouk ma brik ! On vise la même chose
            la semaine prochaine ?
          </CoachBubble>
        </div>
      </Section>

      <Section title={s.illustrations}>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
          {ILLUSTRATIONS.map(({ name, Component }) => (
            <div
              key={name}
              className="flex flex-col items-center gap-1 rounded-lg border p-3"
            >
              <Component size={56} />
              <span className="text-center text-[11px] text-ink-50">
                {name}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={s.logos}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <Logo variant="ink" height={36} />
            <Logo variant="mark" height={36} />
          </div>
          <div className="flex flex-wrap items-center gap-6 rounded-lg bg-[#0B0B0B] p-4">
            <Logo variant="paper" height={36} />
            <Logo variant="boutargue" height={36} />
          </div>
        </div>
      </Section>

      <Section title={s.states}>
        <div className="flex flex-col gap-4">
          <EmptyState
            illustration={<KemiaAvatar expression="douce" size={64} />}
            title="Rien dans l'assiette ?"
            hint="Raconte-moi ton petit-déj, ça prend 10 secondes."
            action={<Button size="sm">Raconter mon petit-déj</Button>}
          />
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="size-5 animate-spin rounded-full border border-t-boutargue"
            />
            <span className="text-sm text-ink-50">
              Kémia est en cuisine, deux secondes…
            </span>
          </div>
        </div>
      </Section>

      <Section title={s.copy}>
        <ul className="flex list-none flex-col gap-2 text-sm">
          <li>
            ❌ « Objectif dépassé de 320 kcal » → ✅ « Journée généreuse (+320).
            On équilibre demain, tranquille. »
          </li>
          <li>
            ❌ « Série perdue » → ✅ « Petite pause. On reprend aujourd’hui, ya
            benti. »
          </li>
          <li>✅ « Chabbat approche : ta liste de courses est prête. »</li>
        </ul>
      </Section>
    </main>
  );
}
