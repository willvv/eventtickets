const DEFAULT_TTL_MINUTES = parseInt(
  process.env.DEFAULT_RESERVATION_TTL_MINUTES ?? "360",
  10
);

export function isReservationExpired(
  reservedAt: Date,
  ttlMinutes: number = DEFAULT_TTL_MINUTES
): boolean {
  const expiresAt = new Date(reservedAt.getTime() + ttlMinutes * 60 * 1000);
  return new Date() > expiresAt;
}

export function getReservationExpiry(
  reservedAt: Date,
  ttlMinutes: number = DEFAULT_TTL_MINUTES
): Date {
  return new Date(reservedAt.getTime() + ttlMinutes * 60 * 1000);
}

export function getDefaultTtlMinutes(): number {
  return DEFAULT_TTL_MINUTES;
}
