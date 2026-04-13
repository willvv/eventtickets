import { describe, it, expect, beforeAll } from "vitest";
import { signTicketQr, verifyTicketQr, QrPayload } from "@/lib/tickets/qr-signing";

beforeAll(() => {
  process.env.QR_SIGNING_SECRET = "test-qr-signing-secret-minimum-32-chars";
});

const samplePayload: QrPayload = {
  ticketId: "ticket123",
  eventId: "event456",
  orgId: "org789",
  issuedAt: 1700000000000,
  nonce: "abc123",
};

describe("QR Signing", () => {
  it("signs and verifies a payload successfully", () => {
    const qr = signTicketQr(samplePayload);
    const result = verifyTicketQr(qr);

    expect(result.valid).toBe(true);
    expect(result.payload).toMatchObject(samplePayload);
  });

  it("rejects a tampered payload", () => {
    const qr = signTicketQr(samplePayload);
    const tampered = qr.slice(0, -5) + "XXXXX";
    const result = verifyTicketQr(tampered);
    expect(result.valid).toBe(false);
  });

  it("rejects a missing dot separator", () => {
    const result = verifyTicketQr("nodotinstring");
    expect(result.valid).toBe(false);
  });

  it("rejects completely malformed input", () => {
    const result = verifyTicketQr("!!invalid!!");
    expect(result.valid).toBe(false);
  });

  it("produces different QR strings for different payloads", () => {
    const payload2 = { ...samplePayload, ticketId: "other" };
    expect(signTicketQr(samplePayload)).not.toBe(signTicketQr(payload2));
  });
});
