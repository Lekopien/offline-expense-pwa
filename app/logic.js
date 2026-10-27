// Pure functions: no DOM, no storage. Shared by the app and the Node tests.

export const CATEGORIES = {
  food: { label: "Food", color: "#f59e0b" },
  transport: { label: "Transport", color: "#22d3ee" },
  bills: { label: "Bills", color: "#7c5cff" },
  shopping: { label: "Shopping", color: "#f472b6" },
  health: { label: "Health", color: "#34d399" },
  fun: { label: "Fun", color: "#fb7185" },
  other: { label: "Other", color: "#94a3b8" },
};

export const monthKey = (iso) => iso.slice(0, 7);

export function validate({ amount, category, date, note = "" }) {
  const errors = [];
  if (!(Number.isFinite(amount) && amount > 0 && amount < 1e9)) errors.push("amount must be a positive number");
  if (!CATEGORIES[category]) errors.push("pick a category");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.push("date must be YYYY-MM-DD");
  if (note.length > 120) errors.push("note is too long");
  return errors;
}

export function summarize(expenses, month, budget = 0) {
  const inMonth = expenses.filter((e) => monthKey(e.date) === month);
  const total = inMonth.reduce((s, e) => s + e.amount, 0);
  const byCategory = {};
  for (const e of inMonth) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  return {
    total,
    count: inMonth.length,
    byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
    dailyAverage: total / days,
    budget,
    remaining: budget ? budget - total : null,
    overBudget: budget > 0 && total > budget,
  };
}

export function formatKES(n) {
  return "KES " + Math.round(n).toLocaleString("en-KE");
}

/** Donut chart segments as SVG arc paths. */
export function donut(byCategory, r = 60, stroke = 22) {
  const total = byCategory.reduce((s, [, v]) => s + v, 0);
  if (!total) return [];
  let angle = -Math.PI / 2;
  return byCategory.map(([cat, value]) => {
    const sweep = (value / total) * Math.PI * 2;
    const end = angle + Math.min(sweep, Math.PI * 2 - 1e-6);
    const p = (a) => `${(r + stroke + r * Math.cos(a)).toFixed(2)} ${(r + stroke + r * Math.sin(a)).toFixed(2)}`;
    const d = `M ${p(angle)} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${p(end)}`;
    angle += sweep;
    return { cat, d, color: CATEGORIES[cat]?.color ?? "#999", pct: value / total };
  });
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v));

export function toCSV(expenses) {
  const rows = [["date", "amount", "category", "note"], ...expenses.map((e) => [e.date, e.amount, e.category, e.note ?? ""])];
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

/** Parses CSV with quoted fields; returns { expenses, errors }. */
export function fromCSV(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }

  const [header, ...data] = rows.filter((r) => r.some((c) => c.trim()));
  const idx = Object.fromEntries((header ?? []).map((h, i) => [h.trim().toLowerCase(), i]));
  const expenses = [], errors = [];
  data.forEach((r, n) => {
    const e = { date: r[idx.date]?.trim(), amount: Number(r[idx.amount]), category: r[idx.category]?.trim().toLowerCase(), note: r[idx.note] ?? "" };
    const problems = validate(e);
    if (problems.length) errors.push(`row ${n + 2}: ${problems.join(", ")}`);
    else expenses.push(e);
  });
  return { expenses, errors };
}
