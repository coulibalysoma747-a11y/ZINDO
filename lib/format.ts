export function formatMoney(amount: number, currency = "XOF") {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat("fr-FR").format(rounded);
  return `${formatted} ${currency === "XOF" ? "FCFA" : currency}`;
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // lundi = début de semaine
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfYesterday() {
  const d = startOfToday();
  d.setDate(d.getDate() - 1);
  return d;
}
