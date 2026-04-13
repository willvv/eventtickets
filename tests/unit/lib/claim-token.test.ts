import { describe, it, expect, beforeAll } from "vitest";
import {
  generateClaimToken,
  hashToken,
  isTokenExpired,
  getTokenExpiryDate,
} from "@/lib/tickets/claim-token";

beforeAll(() => {
  process.env.CLAIM_TOKEN_SECRET = "test-claim-secret-minimum-32-chars-long";
});

describe("Claim Token", () => {
  it("generates a raw token and its hash", () => {
    const { raw, hashed } = generateClaimToken();
    expect(raw).toBeTruthy();
    expect(hashed).toBeTruthy();
    expect(raw).not.toBe(hashed);
  });

  it("hashing the same raw token twice gives the same hash", () => {
    const { raw } = generateClaimToken();
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  it("different raw tokens produce different hashes", () => {
    const a = generateClaimToken();
    const b = generateClaimToken();
    expect(a.hashed).not.toBe(b.hashed);
  });

  it("expiry date is in the future", () => {
    const expiry = getTokenExpiryDate();
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });

  it("isTokenExpired returns false for future date", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    expect(isTokenExpired(future)).toBe(false);
  });

  it("isTokenExpired returns true for past date", () => {
    const past = new Date(Date.now() - 1000);
    expect(isTokenExpired(past)).toBe(true);
  });
});
