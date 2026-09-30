import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, numberToFrenchWords } from "./format";

// Intl sépare les milliers par une espace insécable : on la normalise.
const plain = (s: string) => s.replace(/\s/g, " ");

test("montants en FCFA, arrondis, milliers séparés", () => {
  assert.equal(plain(formatMoney(125000)), "125 000 FCFA");
  assert.equal(plain(formatMoney(4850000)), "4 850 000 FCFA");
  assert.equal(plain(formatMoney(1499.6)), "1 500 FCFA");
  assert.equal(plain(formatMoney(0)), "0 FCFA");
});

test("autre devise : son symbole s'affiche", () => {
  assert.equal(plain(formatMoney(10, "EUR")), "10 €");
});

test("montants en lettres pour les factures", () => {
  const cases: [number, string][] = [
    [0, "zéro"],
    [1, "un"],
    [17, "dix-sept"],
    [21, "vingt et un"],
    [71, "soixante et onze"],
    [80, "quatre-vingts"],
    [81, "quatre-vingt-un"],
    [99, "quatre-vingt-dix-neuf"],
    [100, "cent"],
    [200, "deux cents"],
    [280, "deux cent quatre-vingts"],
    [1000, "mille"],
    [1001, "mille un"],
    [1690, "mille six cent quatre-vingt-dix"],
    [13500, "treize mille cinq cents"],
    [80000, "quatre-vingt mille"],
    [200000, "deux cent mille"],
    [750000, "sept cent cinquante mille"],
    [1000000, "un million"],
    [2500000, "deux millions cinq cent mille"],
  ];
  for (const [n, words] of cases) assert.equal(numberToFrenchWords(n), words, `${n}`);
});

test("autres monnaies : symbole, décimales seulement si utiles", () => {
  assert.equal(plain(formatMoney(5000, "XAF")), "5 000 FCFA");
  assert.equal(plain(formatMoney(12.5, "EUR")), "12,50 €");
  assert.equal(plain(formatMoney(1250, "NGN")), "1 250 ₦");
  assert.equal(plain(formatMoney(40, "GHS")), "40 GH₵");
});
