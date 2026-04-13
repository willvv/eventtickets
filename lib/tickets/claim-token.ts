import crypto from "crypto";

const CLAIM_SECRET = process.env.CLAIM_TOKEN_SECRET ?? "dev-claim-secret";
const TOKEN_EXPIRY_HOURS = 72;

export function generateClaimToken(): { raw: string; hashed: string } {
  const raw = crypto.randomBytes(32).toString("base64url");
  const hashed = hashToken(raw);
  return { raw, hashed };
}

export function hashToken(raw: string): string {
  return crypto.createHmac("sha256", CLAIM_SECRET).update(raw).digest("hex");
}

export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

export function getTokenExpiryDate(): Date {
  const d = new Date();
  d.setHours(d.getHours() + TOKEN_EXPIRY_HOURS);
  return d;
}
