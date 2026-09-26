import { test } from "node:test";
import assert from "node:assert/strict";
import { cashedInAmount, cashedInMixedPortions, computeSaleTotals, saleLineTotal, saleStatus } from "./sale-totals";

test("ligne : prix × quantité moins la remise de la ligne", () => {
  assert.equal(saleLineTotal({ unitPrice: 5000, quantity: 2, discount: 0 }), 10000);
  assert.equal(saleLineTotal({ unitPrice: 4500, quantity: 3, discount: 500 }), 13000);
});

test("exemple du cahier des charges : 2 × 5 000 + 1 × 3 500 = 13 500", () => {
  const { subtotal, total } = computeSaleTotals(
    [
      { unitPrice: 5000, quantity: 2, discount: 0 },
      { unitPrice: 3500, quantity: 1, discount: 0 },
    ],
    0,
    13500
  );
  assert.equal(subtotal, 13500);
  assert.equal(total, 13500);
});

test("la remise globale s'applique après les remises de ligne", () => {
  const { subtotal, total } = computeSaleTotals(
    [
      { unitPrice: 10000, quantity: 1, discount: 1000 },
      { unitPrice: 2000, quantity: 2, discount: 0 },
    ],
    500,
    0
  );
  assert.equal(subtotal, 13000);
  assert.equal(total, 12500);
});

test("une remise plus grande que la vente ne donne jamais un total négatif", () => {
  const { total } = computeSaleTotals([{ unitPrice: 1000, quantity: 1, discount: 0 }], 5000, 0);
  assert.equal(total, 0);
});

test("un montant reçu négatif est ramené à zéro", () => {
  assert.equal(computeSaleTotals([{ unitPrice: 1000, quantity: 1, discount: 0 }], 0, -200).amountPaid, 0);
});

test("statut : payée, partielle ou crédit", () => {
  assert.equal(saleStatus(13500, 13500), "PAYEE");
  assert.equal(saleStatus(13500, 20000), "PAYEE"); // monnaie à rendre
  assert.equal(saleStatus(13500, 5000), "PARTIELLE");
  assert.equal(saleStatus(13500, 0), "CREDIT");
  assert.equal(saleStatus(0, 0), "PAYEE"); // vente offerte (remise totale)
});

test("dette restante d'une vente partielle", () => {
  const { total, amountPaid } = computeSaleTotals([{ unitPrice: 15000, quantity: 50, discount: 0 }], 0, 500000);
  assert.equal(total, 750000);
  assert.equal(total - amountPaid, 250000);
});

test("encaissé : la monnaie rendue n'est pas comptée", () => {
  assert.equal(cashedInAmount(390, 1000), 390);
  assert.equal(cashedInAmount(910, 910), 910);
  assert.equal(cashedInAmount(520, 200), 200);
  assert.equal(cashedInAmount(520, 0), 0);
});

test("encaissé : un bon de retour garde son montant négatif", () => {
  assert.equal(cashedInAmount(-4290, -4290), -4290);
  assert.equal(cashedInAmount(-4290, 0), 0);
});

test("paiement mixte : la monnaie sort de la part espèces", () => {
  assert.deepEqual(cashedInMixedPortions(7000, 5000, 3000), { cash: 4000, mobile: 3000 });
  assert.deepEqual(cashedInMixedPortions(8000, 5000, 3000), { cash: 5000, mobile: 3000 });
  assert.deepEqual(cashedInMixedPortions(2000, 1000, 3000), { cash: 0, mobile: 2000 });
});
