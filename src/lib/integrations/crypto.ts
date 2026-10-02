/**
 * AES-256-GCM helpers for encrypting IntegrationConfig secrets at rest.
 * CONFIG_ENCRYPTION_KEY must be a 32-byte key, base64-encoded.
 */
import crypto from "crypto";

function getKey(): Buffer {
  const key = process.env.CONFIG_ENCRYPTION_KEY;
  if (!key) throw new Error("CONFIG_ENCRYPTION_KEY is not set.");
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error("CONFIG_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return buf;
}

export function encryptConfig(plaintextJson: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintextJson, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptConfig(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
