import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveTieredPrice } from "./pricing";

const tiers = [
  { id: "a", minQuantity: 10, unitPrice: 900 },
  { id: "b", minQuantity: 50, unitPrice: 800 },
];

test("sans palier, le prix de base s'applique", () => {
  assert.equal(resolveTieredPrice(1000, 100, null), 1000);
  assert.equal(resolveTieredPrice(1000, 100, []), 1000);
});

test("sous le premier seuil, le prix de base s'applique", () => {
  assert.equal(resolveTieredPrice(1000, 9, tiers), 1000);
});

test("le seuil est atteint dès la quantité minimale", () => {
  assert.equal(resolveTieredPrice(1000, 10, tiers), 900);
  assert.equal(resolveTieredPrice(1000, 49, tiers), 900);
  assert.equal(resolveTieredPrice(1000, 50, tiers), 800);
});

test("l'ordre des paliers n'a pas d'importance", () => {
  assert.equal(resolveTieredPrice(1000, 60, [...tiers].reverse()), 800);
});
