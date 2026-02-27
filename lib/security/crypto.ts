import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function getMasterKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_MASTER_KEY_HEX ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("ENCRYPTION_MASTER_KEY_HEX must be a 64-char hex key");
  }
  return Buffer.from(keyHex, "hex");
}

export function encryptField(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getMasterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptField(payload: string): string {
  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const body = data.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getMasterKey(), iv);
  decipher.setAuthTag(tag);
  const output = Buffer.concat([decipher.update(body), decipher.final()]);
  return output.toString("utf8");
}
