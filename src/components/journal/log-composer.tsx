"use client";

import {
  Barcode,
  Camera,
  CloudOff,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  logFavorite,
  logMeal,
  lookupBarcode,
  parseFoodInput,
  repeatDay,
  type DraftItem,
  type MealType,
} from "@/app/(app)/journal/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { KashrutPill } from "@/components/ui/kashrut-pill";
import { fr } from "@/i18n/fr";
import type { KashrutClass } from "@/lib/kashrut/meal";
import { parseFreeTextInput } from "@/lib/nutrition/parse-input";
import { isNetworkError } from "@/lib/pwa/offline-queue";
import { queueMeal } from "@/lib/pwa/offline-store";
import { cn } from "@/lib/utils/cn";

const BarcodeScanner = dynamic(
  () => import("./barcode-dialog").then((m) => m.BarcodeScanner),
  { ssr: false },
);

const t = fr.journal;

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

async function fileToJpegBase64(
  file: File,
): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1024;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return { base64: dataUrl.split(",")[1]!, mediaType: "image/jpeg" };
}

function guessMealByHour(): MealType {
  const hour = parseInt(
    new Intl.DateTimeFormat("fr-FR", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Paris",
    }).format(new Date()),
    10,
  );
  if (hour < 11) return "petit_dej";
  if (hour < 15) return "dej";
  if (hour < 18) return "collation";
  if (hour < 23) return "diner";
  return "collation";
}

/**
 * Without network the base cannot be searched: the free-text parser still
 * splits the sentence into items (names + grams) so the meal can be queued
 * and re-resolved server side when the connection is back (brief §10.14).
 */
function offlineDraft(text: string): DraftItem[] {
  return parseFreeTextInput(text).map((part) => ({
    food_id: null,
    name: part.query,
    qty: part.qty,
    unit: part.unit,
    grams: part.grams,
    per_100g: {},
    kashrut_class: null,
    is_fish: false,
    kosher_hint: null,
    confidence: 0.3,
    candidates: [],
  }));
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function LogComposer({
  date,
  favorites,
  aiEnabled,
}: {
  date: string;
  favorites: string[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [draft, setDraft] = useState<DraftItem[] | null>(null);
  const [draftSource, setDraftSource] = useState<
    "text" | "photo" | "voice" | "barcode"
  >("text");
  const [meal, setMeal] = useState<MealType>(guessMealByHour());
  const [draftOffline, setDraftOffline] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawInputRef = useRef<string | null>(null);

  const speechSupported = getSpeechRecognition() !== null;

  async function runParse(
    input: Parameters<typeof parseFoodInput>[0],
    source: "text" | "photo" | "voice",
  ) {
    setBusy(true);
    try {
      const result = await parseFoodInput(input);
      if (result.items.length === 0) {
        toast(t.parseFailed);
        return;
      }
      if (result.mealGuess) setMeal(result.mealGuess);
      rawInputRef.current = input.text ?? null;
      setDraftSource(source);
      setDraftOffline(false);
      setDraft(result.items);
    } catch (error) {
      const fallback =
        input.text && isNetworkError(error) ? offlineDraft(input.text) : [];
      if (fallback.length === 0) {
        toast(t.parseFailed);
        return;
      }
      rawInputRef.current = input.text ?? null;
      setDraftSource(source);
      setDraftOffline(true);
      setDraft(fallback);
    } finally {
      setBusy(false);
    }
  }

  function queueDraft(items: DraftItem[]) {
    const entry = queueMeal({
      kind: "text",
      date,
      meal,
      items: items.map((item) => ({ name: item.name, grams: item.grams })),
      rawInput: rawInputRef.current,
      source: draftSource === "voice" ? "voice" : "text",
    });
    toast(entry ? t.offlineQueued : t.parseFailed);
    if (entry) {
      setDraft(null);
      setDraftOffline(false);
      setText("");
    }
  }

  async function submitText(event: React.FormEvent) {
    event.preventDefault();
    if (text.trim().length < 2) return;
    await runParse({ text: text.trim() }, "text");
  }

  function toggleVoice() {
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length },
        (_, i) => event.results[i]?.[0]?.transcript ?? "",
      ).join(" ");
      if (transcript.trim()) {
        setText(transcript.trim());
        void runParse({ text: transcript.trim() }, "voice");
      }
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    setRecording(true);
    recognition.start();
  }

  async function onPhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!aiEnabled) {
      toast(t.aiOff);
      return;
    }
    if (isOffline()) {
      toast(t.offlineOnly);
      return;
    }
    setBusy(true);
    try {
      const { base64, mediaType } = await fileToJpegBase64(file);
      await runParse(
        { imageBase64: base64, imageMediaType: mediaType },
        "photo",
      );
    } catch {
      toast(t.parseFailed);
      setBusy(false);
    }
  }

  async function onBarcode(code: string) {
    setScanning(false);
    if (isOffline()) {
      toast(t.offlineOnly);
      return;
    }
    setBusy(true);
    try {
      const item = await lookupBarcode(code);
      if (!item) {
        toast(t.parseFailed);
        return;
      }
      setDraftSource("text");
      setDraft((prev) => [...(prev ?? []), item]);
    } catch {
      toast(t.parseFailed);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDraft() {
    if (!draft || draft.length === 0) return;
    if (draftOffline || isOffline()) {
      queueDraft(draft);
      return;
    }
    setBusy(true);
    try {
      const result = await logMeal({
        date,
        meal,
        items: draft.map((draftItem) => {
          const { candidates, ...item } = draftItem;
          void candidates;
          return item;
        }),
        source: draftSource,
        rawInput: rawInputRef.current,
      });
      toast(result.conflict ? t.loggedConflict : t.logged);
      setDraft(null);
      setText("");
      router.refresh();
    } catch (error) {
      if (isNetworkError(error)) {
        queueDraft(draft);
        return;
      }
      toast(t.parseFailed);
    } finally {
      setBusy(false);
    }
  }

  async function onRepeatYesterday() {
    if (isOffline()) {
      toast(t.offlineOnly);
      return;
    }
    setBusy(true);
    try {
      const from = new Date(`${date}T12:00:00`);
      from.setDate(from.getDate() - 1);
      const result = await repeatDay(from.toISOString().slice(0, 10), date);
      toast(result.copied > 0 ? t.repeatDone : t.repeatEmpty);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function queueFavorite(label: string) {
    const entry = queueMeal({ kind: "favorite", date, meal, label });
    toast(entry ? t.offlineQueued : t.parseFailed);
  }

  async function onFavorite(label: string) {
    if (isOffline()) {
      queueFavorite(label);
      return;
    }
    setBusy(true);
    try {
      await logFavorite(label, date, meal);
      toast(t.logged);
      router.refresh();
    } catch (error) {
      if (isNetworkError(error)) {
        queueFavorite(label);
        return;
      }
      toast(t.parseFailed);
    } finally {
      setBusy(false);
    }
  }

  function updateDraftGrams(index: number, grams: number) {
    setDraft((prev) =>
      prev
        ? prev.map((item, i) =>
            i === index && grams > 0
              ? { ...item, grams, qty: grams, unit: "g" }
              : item,
          )
        : prev,
    );
  }

  function removeDraftItem(index: number) {
    setDraft((prev) => {
      const nextItems = prev ? prev.filter((_, i) => i !== index) : prev;
      return nextItems && nextItems.length > 0 ? nextItems : null;
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <form onSubmit={submitText} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.inputPlaceholder}
          disabled={busy}
        />
        <Button type="submit" size="icon" disabled={busy} aria-label={t.send}>
          <Plus />
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {speechSupported && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={toggleVoice}
            disabled={busy}
          >
            {recording ? <MicOff /> : <Mic />}
            {recording ? t.voiceStop : t.voice}
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          <Camera />
          {t.photo}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setScanning(true)}
          disabled={busy}
        >
          <Barcode />
          {t.barcode}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRepeatYesterday}
          disabled={busy}
        >
          <RotateCcw />
          {t.repeatYesterday}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhotoSelected}
          hidden
        />
      </div>

      {favorites.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {favorites.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => onFavorite(label)}
              disabled={busy}
              className="rounded-full border bg-boutargue-tint px-3 py-1 text-xs font-semibold text-[#0b0b0b]"
            >
              ★ {label}
            </button>
          ))}
        </div>
      )}

      {!aiEnabled && <p className="text-xs text-ink-50">{t.aiOff}</p>}
      {busy && !draft && <p className="text-sm text-ink-50">{t.parsing}</p>}

      {draft && (
        <div className="rounded-lg border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold">{t.confirmTitle}</h3>
            <select
              value={meal}
              onChange={(e) => setMeal(e.target.value as MealType)}
              aria-label={t.confirmMeal}
              className="rounded-full border bg-card px-3 py-1.5 text-sm font-semibold"
            >
              {Object.entries(t.meals).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {draftOffline && (
            <p className="mt-2 flex items-center gap-2 rounded-[10px] bg-warn-soft px-3 py-2 text-xs font-medium">
              <CloudOff size={14} strokeWidth={2} aria-hidden />
              {t.offlineDraft}
            </p>
          )}
          <ul className="mt-3 flex flex-col gap-2">
            {draft.map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="flex items-center gap-2 rounded-[10px] border p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.name}
                    {!item.food_id && (
                      <span className="ml-1 text-xs text-ink-50">
                        ({t.unknownFood})
                      </span>
                    )}
                  </p>
                  {item.kashrut_class && (
                    <KashrutPill
                      kind={item.kashrut_class as KashrutClass}
                      isFish={item.is_fish}
                      className="mt-1 scale-90"
                    />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    value={Math.round(item.grams)}
                    onChange={(e) =>
                      updateDraftGrams(index, parseFloat(e.target.value))
                    }
                    className="w-16 rounded-[10px] border bg-card px-2 py-1 text-right font-mono text-sm"
                    aria-label={`${item.name} (${t.grams})`}
                  />
                  <span className="text-xs text-ink-50">{t.grams}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeDraftItem(index)}
                  className={cn("text-xs font-medium text-ink-50 underline")}
                >
                  {t.itemRemove}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(null);
                setDraftOffline(false);
              }}
              disabled={busy}
            >
              {t.confirmCancel}
            </Button>
            <Button size="sm" onClick={confirmDraft} disabled={busy}>
              {t.confirmLog}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={scanning} onOpenChange={setScanning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.barcode}</DialogTitle>
          </DialogHeader>
          {scanning && <BarcodeScanner onDetected={onBarcode} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
