// Web Share Target (brief §10.14): the manifest sends shared content to
// /recettes/importer?url=&text=&title=. Apps are inconsistent about which
// field carries the link (TikTok and Instagram put it in `text`), so the
// first http(s) URL found anywhere wins; otherwise the text is imported.

const URL_PATTERN = /https?:\/\/[^\s<>"']+/i;

export type SharedPayload = {
  url?: string | string[];
  text?: string | string[];
  title?: string | string[];
};

export type SharedImport =
  { mode: "url"; url: string } | { mode: "text"; text: string };

function first(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

export function extractUrl(text: string): string | null {
  const match = URL_PATTERN.exec(text);
  if (!match) return null;
  const candidate = match[0].replace(/[).,;!?]+$/, "");
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

export function parseSharedImport(payload: SharedPayload): SharedImport | null {
  const url = first(payload.url);
  const text = first(payload.text);
  const title = first(payload.title);

  for (const field of [url, text, title]) {
    const found = field ? extractUrl(field) : null;
    if (found) return { mode: "url", url: found };
  }

  const body = [title, text].filter((part) => part.length > 0).join("\n\n");
  return body.length >= 20 ? { mode: "text", text: body } : null;
}
