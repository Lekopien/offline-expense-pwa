import { createStore } from "./db.js";
import { CATEGORIES, donut, formatKES, fromCSV, summarize, toCSV, validate } from "./logic.js";

const $ = (s) => document.querySelector(s);
const today = () => new Date().toISOString().slice(0, 10);
let store, expenses = [], month = today().slice(0, 7);
const budgetKey = "expense-budget";
const getBudget = () => { try { return Number(localStorage.getItem(budgetKey)) || 0; } catch { return 0; } };

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) k.startsWith("on") ? n.addEventListener(k.slice(2), v) : n.setAttribute(k, v);
  n.append(...kids);
  return n;
}

function render() {
  const s = summarize(expenses, month, getBudget());
  $("#month").value = month;
  $("#total").textContent = formatKES(s.total);
  $("#avg").textContent = `${formatKES(s.dailyAverage)} / day · ${s.count} expenses`;
  const pct = s.budget ? Math.min(100, (s.total / s.budget) * 100) : 0;
  $("#budgetBar").style.width = pct + "%";
  $("#budgetBar").classList.toggle("over", s.overBudget);
  $("#budgetText").textContent = s.budget
    ? (s.overBudget ? `${formatKES(-s.remaining)} over budget` : `${formatKES(s.remaining)} left of ${formatKES(s.budget)}`)
    : "Set a monthly budget";

  const ns = "http://www.w3.org/2000/svg";
  const svg = $("#donut");
  svg.replaceChildren();
  for (const seg of donut(s.byCategory)) {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", seg.d);
    path.setAttribute("stroke", seg.color);
    svg.append(path);
  }
  $("#legend").replaceChildren(...s.byCategory.map(([c, v]) =>
    el("li", {}, el("i", { style: `background:${CATEGORIES[c].color}` }), `${CATEGORIES[c].label} `, el("b", {}, formatKES(v)))));

  const list = expenses.filter((e) => e.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);
  $("#list").replaceChildren(...(list.length ? list.map((e) =>
    el("li", {},
      el("i", { style: `background:${CATEGORIES[e.category].color}` }),
      el("div", {}, el("b", {}, e.note || CATEGORIES[e.category].label), el("small", {}, `${CATEGORIES[e.category].label} · ${e.date}`)),
      el("span", {}, formatKES(e.amount)),
      el("button", { class: "del", "aria-label": "Delete", onclick: async () => { await store.remove(e.id); await reload(); } }, "×"),
    )) : [el("li", { class: "empty" }, "No expenses this month yet.")]));
}

async function reload() {
  expenses = await store.all();
  render();
}

async function init() {
  store = await createStore();
  if (!store.persistent) $("#status").textContent = "Storage unavailable: data lasts until you close the tab.";
  $("#cat").append(...Object.entries(CATEGORIES).map(([k, v]) => el("option", { value: k }, v.label)));
  $("#date").value = today();
  $("#budget").value = getBudget() || "";

  $("#add").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const e = { amount: Number($("#amount").value), category: $("#cat").value, date: $("#date").value, note: $("#note").value.trim() };
    const errors = validate(e);
    $("#err").textContent = errors.join(", ");
    if (errors.length) return;
    await store.put({ ...e, id: crypto.randomUUID(), created: Date.now() });
    month = e.date.slice(0, 7);
    $("#amount").value = ""; $("#note").value = "";
    await reload();
  });
  $("#month").addEventListener("change", (e) => { month = e.target.value || month; render(); });
  $("#budget").addEventListener("change", (e) => { try { localStorage.setItem(budgetKey, e.target.value); } catch {} render(); });
  $("#export").addEventListener("click", () => {
    const a = el("a", { href: URL.createObjectURL(new Blob([toCSV(expenses)], { type: "text/csv" })), download: "expenses.csv" });
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $("#import").addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const { expenses: rows, errors } = fromCSV(await file.text());
    for (const r of rows) await store.put({ ...r, id: crypto.randomUUID(), created: Date.now() });
    $("#status").textContent = `Imported ${rows.length} expenses${errors.length ? `, skipped ${errors.length} bad rows` : ""}.`;
    ev.target.value = "";
    await reload();
  });
  $("#demo").addEventListener("click", async () => {
    const samples = [["food", 850, "Lunch"], ["transport", 300, "Matatu"], ["bills", 4500, "Electricity"], ["shopping", 2200, "Shoes"], ["fun", 1200, "Cinema"], ["food", 3400, "Groceries"], ["health", 1500, "Pharmacy"], ["bills", 2999, "Internet"]];
    const base = new Date();
    for (const [i, [category, amount, note]] of samples.entries()) {
      const d = new Date(base.getFullYear(), base.getMonth(), Math.max(1, base.getDate() - i * 3));
      await store.put({ category, amount, note, date: d.toISOString().slice(0, 10), id: crypto.randomUUID(), created: Date.now() + i });
    }
    month = today().slice(0, 7);
    await reload();
  });
  await reload();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  let deferred;
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; $("#install").hidden = false; });
  $("#install").addEventListener("click", () => deferred?.prompt());
  const net = () => ($("#net").textContent = navigator.onLine ? "online" : "offline: still works");
  addEventListener("online", net); addEventListener("offline", net); net();
}

init();
