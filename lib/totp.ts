import "server-only";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// TOTP (RFC 6238) et HOTP (RFC 4226) implémentés à la main sur `crypto` — pas
// de dépendance externe (otplib/speakeasy) pour un algorithme aussi court,
// compatible avec Google Authenticator / Authy / toute app TOTP standard.
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function totpAuthUri(secret: string, accountName: string, issuer = "ZINDO"): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** Vérifie un code à 6 chiffres, avec une tolérance d'une période avant/après pour l'horloge du téléphone. */
export function verifyTotp(secret: string, token: string, windowSteps = 1): boolean {
  const clean = token.replace(/\D/g, "");
  if (clean.length !== DIGITS) return false;
  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (let drift = -windowSteps; drift <= windowSteps; drift++) {
    if (hotp(secret, counter + drift) === clean) return true;
  }
  return false;
}

/** Codes de secours à usage unique, si le téléphone avec l'app d'authentification est perdu. */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}

export async function hashBackupCodes(codes: string[]): Promise<string> {
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
  return JSON.stringify(hashes);
}

/** Consomme (retire) un code de secours s'il correspond, sans jamais pouvoir être réutilisé. */
export async function consumeBackupCode(
  storedJson: string | null,
  code: string
): Promise<{ ok: boolean; remaining: string | null }> {
  if (!storedJson) return { ok: false, remaining: storedJson };
  let hashes: string[];
  try {
    hashes = JSON.parse(storedJson);
  } catch {
    return { ok: false, remaining: storedJson };
  }
  const normalized = code.trim().toUpperCase();
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(normalized, hashes[i])) {
      const remaining = [...hashes.slice(0, i), ...hashes.slice(i + 1)];
      return { ok: true, remaining: JSON.stringify(remaining) };
    }
  }
  return { ok: false, remaining: storedJson };
}
