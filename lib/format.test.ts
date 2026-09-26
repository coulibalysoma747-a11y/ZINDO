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

test("autre devise : le code s'affiche tel quel", () => {
  assert.equal(plain(formatMoney(10, "EUR")), "10 EUR");
});

test("montants en lettres pour les factures", () => {
  const cases: [number, string][] = [
    [0, "Zéro"],
    [1, "Un"],
    [17, "Dix Sept"],
    [21, "Vingt Et Un"],
    [71, "Soixante Et Onze"],
    [80, "Quatre Vingt"],
    [81, "Quatre Vingt Un"],
    [99, "Quatre Vingt Dix Neuf"],
    [100, "Cent"],
    [200, "Deux Cent"],
    [1000, "Mille"],
    [1001, "Mille Un"],
    [13500, "Treize Mille Cinq Cent"],
    [750000, "Sept Cent Cinquante Mille"],
    [1000000, "Un Million"],
    [2500000, "Deux Million Cinq Cent Mille"],
  ];
  for (const [n, words] of cases) assert.equal(numberToFrenchWords(n), words, `${n}`);
});
