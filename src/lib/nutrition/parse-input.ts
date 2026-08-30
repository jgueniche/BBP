export type ParsedPart = {
  query: string;
  qty: number;
  unit: "g" | "ml" | "piece" | "portion";
  grams: number;
};

const QTY_PATTERN =
  /^(?:(\d+(?:[.,]\d+)?)\s*(g|gr|grammes?|kg|ml|cl|l)?\s+)?(?:de\s+|d'|du\s+|des\s+|une?\s+|)(.+)$/i;

const DEFAULT_PORTION_G = 100;

export function parseFreeTextInput(raw: string): ParsedPart[] {
  // Keep decimal commas ("62,5g") intact before splitting on separators.
  return raw
    .replace(/(\d),(\d)/g, "$1.$2")
    .split(/\s*(?:,|\+|\bet\b|\bavec\b)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1)
    .map((part) => {
      const match = QTY_PATTERN.exec(part);
      if (!match) {
        return {
          query: part,
          qty: 1,
          unit: "portion" as const,
          grams: DEFAULT_PORTION_G,
        };
      }
      const [, rawQty, rawUnit, query] = match;
      if (!rawQty) {
        return {
          query: query!.trim(),
          qty: 1,
          unit: "portion" as const,
          grams: DEFAULT_PORTION_G,
        };
      }
      const qty = parseFloat(rawQty.replace(",", "."));
      const unit = (rawUnit ?? "").toLowerCase();
      if (unit.startsWith("g") && unit !== "gr" && unit.length > 2) {
        return { query: query!.trim(), qty, unit: "g" as const, grams: qty };
      }
      switch (unit) {
        case "g":
        case "gr":
          return { query: query!.trim(), qty, unit: "g" as const, grams: qty };
        case "kg":
          return {
            query: query!.trim(),
            qty,
            unit: "g" as const,
            grams: qty * 1000,
          };
        case "ml":
          return { query: query!.trim(), qty, unit: "ml" as const, grams: qty };
        case "cl":
          return {
            query: query!.trim(),
            qty,
            unit: "ml" as const,
            grams: qty * 10,
          };
        case "l":
          return {
            query: query!.trim(),
            qty,
            unit: "ml" as const,
            grams: qty * 1000,
          };
        default:
          return {
            query: query!.trim(),
            qty,
            unit: "piece" as const,
            grams: qty * DEFAULT_PORTION_G,
          };
      }
    });
}
