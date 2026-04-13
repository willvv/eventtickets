import { describe, it, expect } from "vitest";
import {
  transitionTicket,
  canTransition,
  getAvailableActions,
} from "@/lib/tickets/state-machine";
import { TicketState, TicketAction } from "@/types/ticket";
import { Role } from "@/types/roles";

describe("Ticket State Machine", () => {
  describe("AVAILABLE transitions", () => {
    it("transitions AVAILABLE → RESERVED when capacity exists", () => {
      const result = transitionTicket(TicketState.AVAILABLE, TicketAction.RESERVE, {
        hasCapacity: true,
      });
      expect(result).toEqual({ success: true, nextState: TicketState.RESERVED });
    });

    it("rejects RESERVE when no capacity", () => {
      const result = transitionTicket(TicketState.AVAILABLE, TicketAction.RESERVE, {
        hasCapacity: false,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid action from AVAILABLE", () => {
      const result = transitionTicket(TicketState.AVAILABLE, TicketAction.SCAN, {});
      expect(result.success).toBe(false);
    });
  });

  describe("RESERVED transitions", () => {
    it("transitions RESERVED → ISSUED when payment confirmed", () => {
      const result = transitionTicket(TicketState.RESERVED, TicketAction.ISSUE, {
        paymentConfirmed: true,
      });
      expect(result).toEqual({ success: true, nextState: TicketState.ISSUED });
    });

    it("rejects ISSUE when payment not confirmed", () => {
      const result = transitionTicket(TicketState.RESERVED, TicketAction.ISSUE, {
        paymentConfirmed: false,
      });
      expect(result.success).toBe(false);
    });

    it("transitions RESERVED → AVAILABLE on RELEASE", () => {
      const result = transitionTicket(TicketState.RESERVED, TicketAction.RELEASE, {});
      expect(result).toEqual({ success: true, nextState: TicketState.AVAILABLE });
    });

    it("transitions RESERVED → CANCELLED on CANCEL", () => {
      const result = transitionTicket(TicketState.RESERVED, TicketAction.CANCEL, {});
      expect(result).toEqual({ success: true, nextState: TicketState.CANCELLED });
    });
  });

  describe("ISSUED transitions", () => {
    it("transitions ISSUED → CLAIMED with valid claim token", () => {
      const result = transitionTicket(TicketState.ISSUED, TicketAction.CLAIM, {
        validClaimToken: true,
      });
      expect(result).toEqual({ success: true, nextState: TicketState.CLAIMED });
    });

    it("transitions ISSUED → SCANNED with valid QR", () => {
      const result = transitionTicket(TicketState.ISSUED, TicketAction.SCAN, {
        validQr: true,
      });
      expect(result).toEqual({ success: true, nextState: TicketState.SCANNED });
    });

    it("allows CANCEL by ORG_ADMIN", () => {
      const result = transitionTicket(TicketState.ISSUED, TicketAction.CANCEL, {
        role: Role.ORG_ADMIN,
      });
      expect(result).toEqual({ success: true, nextState: TicketState.CANCELLED });
    });

    it("rejects CANCEL by CUSTOMER", () => {
      const result = transitionTicket(TicketState.ISSUED, TicketAction.CANCEL, {
        role: Role.CUSTOMER,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CLAIMED transitions", () => {
    it("transitions CLAIMED → SCANNED with valid QR", () => {
      const result = transitionTicket(TicketState.CLAIMED, TicketAction.SCAN, {
        validQr: true,
      });
      expect(result).toEqual({ success: true, nextState: TicketState.SCANNED });
    });

    it("rejects SCAN without valid QR", () => {
      const result = transitionTicket(TicketState.CLAIMED, TicketAction.SCAN, {
        validQr: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CANCELLED transitions", () => {
    it("allows RELEASE to AVAILABLE by SUPERADMIN", () => {
      const result = transitionTicket(TicketState.CANCELLED, TicketAction.RELEASE, {
        role: Role.SUPERADMIN,
      });
      expect(result).toEqual({ success: true, nextState: TicketState.AVAILABLE });
    });

    it("rejects RELEASE by ORG_ADMIN", () => {
      const result = transitionTicket(TicketState.CANCELLED, TicketAction.RELEASE, {
        role: Role.ORG_ADMIN,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("SCANNED transitions", () => {
    it("has no transitions from SCANNED (terminal state)", () => {
      const actions = getAvailableActions(TicketState.SCANNED);
      expect(actions).toHaveLength(0);
    });
  });

  describe("canTransition helper", () => {
    it("returns true for valid transition", () => {
      expect(
        canTransition(TicketState.AVAILABLE, TicketAction.RESERVE, { hasCapacity: true })
      ).toBe(true);
    });

    it("returns false for invalid transition", () => {
      expect(canTransition(TicketState.SCANNED, TicketAction.ISSUE, {})).toBe(false);
    });
  });
});
