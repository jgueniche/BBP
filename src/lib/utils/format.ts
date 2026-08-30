const numberFormatFr = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});

export function formatNumberFr(value: number): string {
  return numberFormatFr.format(value);
}
