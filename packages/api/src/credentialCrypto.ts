import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { TRPCError } from "@trpc/server";

const CREDENTIAL_PREFIX = "icpct-v1";
const KEY_ENV = "ICPC_TRAINER_CREDENTIAL_KEY";
const KEY_BYTE_LENGTH = 32;
const IV_BYTE_LENGTH = 12;
const AUTH_TAG_BYTE_LENGTH = 16;

const getCredentialKey = (): Buffer => {
  const encoded = process.env[KEY_ENV]?.trim();
  if (!encoded) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `${KEY_ENV} is not configured. Generate a base64 32-byte key before saving secrets.`
    });
  }

  const key = Buffer.from(encoded, "base64");
  if (key.byteLength !== KEY_BYTE_LENGTH) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `${KEY_ENV} must be a base64-encoded ${KEY_BYTE_LENGTH}-byte key.`
    });
  }

  return key;
};

export const encryptCredential = (plaintext: string): string => {
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getCredentialKey(), iv, {
    authTagLength: AUTH_TAG_BYTE_LENGTH
  });
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    CREDENTIAL_PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64")
  ].join(":");
};

export const decryptCredential = (storedValue: string): string => {
  const [prefix, iv, tag, ciphertext] = storedValue.split(":");
  if (prefix !== CREDENTIAL_PREFIX || !iv || !tag || !ciphertext) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stored credential payload is malformed." });
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", getCredentialKey(), Buffer.from(iv, "base64"), {
      authTagLength: AUTH_TAG_BYTE_LENGTH
    });
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64")),
      decipher.final()
    ]).toString("utf8");
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to decrypt credential.",
      cause: error
    });
  }
};
