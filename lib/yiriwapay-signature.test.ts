import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyYiriwapaySignature } from "./yiriwapay-signature";

const secret = "whsec_essai";
const body = '{"id":"evt_1","type":"payment.succeeded"}';
const now = 1_800_000_000;
const sign = (t: number, payload = body, key = secret) => `t=${t},v1=${createHmac("sha256", key).update(`${t}.${payload}`).digest("hex")}`;

test("accepte une signature valide et récente", () => {
  assert.equal(verifyYiriwapaySignature({ rawBody: body, header: sign(now), secret, nowSeconds: now + 10 }), true);
});

test("refuse un corps modifié", () => {
  assert.equal(verifyYiriwapaySignature({ rawBody: body + " ", header: sign(now), secret, nowSeconds: now }), false);
});

test("refuse un mauvais secret", () => {
  assert.equal(verifyYiriwapaySignature({ rawBody: body, header: sign(now, body, "whsec_autre"), secret, nowSeconds: now }), false);
});

test("refuse un horodatage trop ancien (rejeu)", () => {
  assert.equal(verifyYiriwapaySignature({ rawBody: body, header: sign(now), secret, nowSeconds: now + 301 }), false);
});

test("refuse un en-tête absent, mal formé ou un secret manquant", () => {
  assert.equal(verifyYiriwapaySignature({ rawBody: body, header: null, secret, nowSeconds: now }), false);
  assert.equal(verifyYiriwapaySignature({ rawBody: body, header: "n'importe quoi", secret, nowSeconds: now }), false);
  assert.equal(verifyYiriwapaySignature({ rawBody: body, header: sign(now), secret: undefined, nowSeconds: now }), false);
});
