import crypto from "crypto";

function getQrSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET;
  if (!secret) throw new Error("QR_SIGNING_SECRET env var is not set");
  return secret;
}

export interface QrPayload {
  ticketId: string;
  eventId: string;
  orgId: string;
  issuedAt: number; // Unix timestamp ms
  nonce: string;
}

export function signTicketQr(payload: QrPayload): string {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString("base64url");
  const hmac = crypto.createHmac("sha256", getQrSecret()).update(encoded).digest("hex");
  return `${encoded}.${hmac}`;
}

export function verifyTicketQr(qrString: string): {
  valid: boolean;
  payload?: QrPayload;
  error?: string;
} {
  try {
    const dotIndex = qrString.lastIndexOf(".");
    if (dotIndex === -1) return { valid: false, error: "Invalid format" };

    const encoded = qrString.substring(0, dotIndex);
    const providedHmac = qrString.substring(dotIndex + 1);

    const expectedHmac = crypto
      .createHmac("sha256", getQrSecret())
      .update(encoded)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedHmac, "hex");
    const providedBuf = Buffer.from(providedHmac, "hex");

    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      return { valid: false, error: "Invalid signature" };
    }

    const data = Buffer.from(encoded, "base64url").toString("utf-8");
    const payload = JSON.parse(data) as QrPayload;
    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Malformed QR data" };
  }
}
