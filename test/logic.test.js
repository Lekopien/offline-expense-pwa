import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { donut, fromCSV, summarize, toCSV, validate } from "../app/logic.js";

const data = [
  { date: "2026-10-01", amount: 1000, category: "food", note: "Lunch" },
  { date: "2026-10-15", amount: 3000, category: "bills", note: "Power, \"October\"" },
  { date: "2026-10-20", amount: 500, category: "food", note: "" },
  { date: "2026-09-30", amount: 9999, category: "fun", note: "" },
];

describe("logic", () => {
  it("validates input", () => {
    assert.deepEqual(validate(data[0]), []);
    assert.equal(validate({ amount: -1, category: "x", date: "2026-13-45" }).length, 3);
  });

  it("summarizes a month with budget", () => {
    const s = summarize(data, "2026-10", 4000);
    assert.equal(s.total, 4500);
    assert.equal(s.count, 3);
    assert.deepEqual(s.byCategory, [["bills", 3000], ["food", 1500]]);
    assert.equal(s.remaining, -500);
    assert.equal(s.overBudget, true);
    assert.ok(Math.abs(s.dailyAverage - 4500 / 31) < 1e-9);
  });

  it("builds donut segments that cover the circle", () => {
    const segs = donut([["bills", 3000], ["food", 1000]]);
    assert.equal(segs.length, 2);
    assert.equal(segs[0].pct, 0.75);
    assert.match(segs[0].d, /^M .* A 60 60 0 1 1 /); // >180° uses the large-arc flag
    assert.deepEqual(donut([]), []);
  });

  it("round-trips CSV, including quotes and commas", () => {
    const { expenses, errors } = fromCSV(toCSV(data));
    assert.deepEqual(errors, []);
    assert.deepEqual(expenses, data);
  });

  it("reports bad CSV rows without failing the import", () => {
    const { expenses, errors } = fromCSV("date,amount,category,note\r\n2026-10-01,100,food,ok\r\nbad,abc,food,\r\n");
    assert.equal(expenses.length, 1);
    assert.match(errors[0], /^row 3:/);
  });
});
