export enum TicketState {
  AVAILABLE = "available",
  RESERVED = "reserved",
  ISSUED = "issued",
  CLAIMED = "claimed",
  SCANNED = "scanned",
  CANCELLED = "cancelled",
  RELEASED = "released",
}

export enum TicketAction {
  RESERVE = "reserve",
  ISSUE = "issue",
  RELEASE = "release",
  CLAIM = "claim",
  SCAN = "scan",
  CANCEL = "cancel",
}

export interface TransitionContext {
  role?: string;
  hasCapacity?: boolean;
  isExpired?: boolean;
  paymentConfirmed?: boolean;
  validClaimToken?: boolean;
  validQr?: boolean;
}

export type TransitionMap = {
  [state in TicketState]?: {
    [action in TicketAction]?: {
      to: TicketState;
      guard?: (ctx: TransitionContext) => boolean;
    };
  };
};
