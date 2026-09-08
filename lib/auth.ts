import crypto from "crypto";
import { cookies } from "next/headers";

const NAME = "taxi_admin";

const secret =
  process.env.SESSION_SECRET ||
  "change-me-long-secret";

function sign(value: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("hex");
}

export function makeSession() {
  const value =
    `admin:${Date.now()}:` +
    crypto.randomBytes(32).toString("hex");

  return `${value}.${sign(value)}`;
}

export function validSession(token?: string) {
  if (!token) {
    return false;
  }

  const index = token.lastIndexOf(".");

  if (index < 1) {
    return false;
  }

  const value = token.slice(0, index);
  const signature = token.slice(index + 1);
  const expected = sign(value);

  if (
    signature.length !==
    expected.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export async function isAdmin() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get(NAME)?.value;

  return validSession(token);
}

export const sessionCookie = NAME;