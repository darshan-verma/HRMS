import crypto from "node:crypto";

const SALT_LEN = 16;
const KEY_LEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };

export function hashPassword(plainPassword: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LEN);
    crypto.scrypt(plainPassword, salt, KEY_LEN, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      const combined = Buffer.concat([salt, derivedKey]);
      resolve(combined.toString("base64"));
    });
  });
}

export function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const combined = Buffer.from(storedHash, "base64");
    if (combined.length < SALT_LEN + KEY_LEN) return resolve(false);
    const salt = combined.subarray(0, SALT_LEN);
    const hash = combined.subarray(SALT_LEN);
    crypto.scrypt(plainPassword, salt, KEY_LEN, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(hash, derivedKey));
    });
  });
}
