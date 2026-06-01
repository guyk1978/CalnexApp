const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currencyCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatMoney(n: number, cents = false): string {
  const safe = Number.isFinite(n) ? n : 0;
  return (cents ? currencyCents : currency).format(safe);
}

export function formatPercent(n: number, digits = 1): string {
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe.toFixed(digits)}%`;
}
