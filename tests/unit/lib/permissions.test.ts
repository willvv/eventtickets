import { describe, it, expect } from "vitest";
import { hasPermission, assertPermission } from "@/lib/auth/permissions";
import { Role } from "@/types/roles";

describe("Permission Matrix", () => {
  describe("SUPERADMIN", () => {
    it("has manage on platform", () => {
      expect(hasPermission(Role.SUPERADMIN, "platform", "manage")).toBe(true);
    });
    it("can delete any organization", () => {
      expect(hasPermission(Role.SUPERADMIN, "organization", "delete")).toBe(true);
    });
    it("can manage tickets", () => {
      expect(hasPermission(Role.SUPERADMIN, "ticket", "manage")).toBe(true);
    });
  });

  describe("ORG_ADMIN", () => {
    it("can create events", () => {
      expect(hasPermission(Role.ORG_ADMIN, "event", "create")).toBe(true);
    });
    it("cannot access platform settings", () => {
      expect(hasPermission(Role.ORG_ADMIN, "platform", "manage")).toBe(false);
    });
    it("can invite members", () => {
      expect(hasPermission(Role.ORG_ADMIN, "member", "create")).toBe(true);
    });
    it("can read reports", () => {
      expect(hasPermission(Role.ORG_ADMIN, "report", "read")).toBe(true);
    });
  });

  describe("ORG_STAFF", () => {
    it("can create tickets (sell)", () => {
      expect(hasPermission(Role.ORG_STAFF, "ticket", "create")).toBe(true);
    });
    it("cannot create events", () => {
      expect(hasPermission(Role.ORG_STAFF, "event", "create")).toBe(false);
    });
    it("cannot manage members", () => {
      expect(hasPermission(Role.ORG_STAFF, "member", "create")).toBe(false);
    });
    it("can scan tickets", () => {
      expect(hasPermission(Role.ORG_STAFF, "scan", "create")).toBe(true);
    });
  });

  describe("CUSTOMER", () => {
    it("can read events", () => {
      expect(hasPermission(Role.CUSTOMER, "event", "read")).toBe(true);
    });
    it("cannot create events", () => {
      expect(hasPermission(Role.CUSTOMER, "event", "create")).toBe(false);
    });
    it("cannot scan", () => {
      expect(hasPermission(Role.CUSTOMER, "scan", "create")).toBe(false);
    });
    it("can create orders", () => {
      expect(hasPermission(Role.CUSTOMER, "order", "create")).toBe(true);
    });
  });

  describe("assertPermission", () => {
    it("does not throw when permission exists", () => {
      expect(() =>
        assertPermission(Role.ORG_ADMIN, "event", "create")
      ).not.toThrow();
    });

    it("throws when permission is denied", () => {
      expect(() =>
        assertPermission(Role.CUSTOMER, "platform", "manage")
      ).toThrow();
    });
  });
});
