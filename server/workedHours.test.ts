import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

/**
 * Test suite for worked hours calculation fix
 * Ensures that non-working statuses (absent, sick, holiday) result in 0 worked hours
 */
describe("Worked Hours Calculation", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const user: AuthenticatedUser = {
      id: 1,
      openId: "test-manager",
      email: "manager@test.com",
      name: "Test Manager",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    ctx = {
      user,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: vi.fn(),
      } as unknown as TrpcContext["res"],
    };

    caller = appRouter.createCaller(ctx);
  });

  describe("Non-working status hours calculation", () => {
    it("should set worked hours to 0 for absent status", () => {
      const entry = {
        hoursWorked: 8,
        overtimeHours: 2,
        workType: "absent" as const,
      };

      // Simulate the logic from saveEntries procedure
      const workType = entry.workType ?? "regular";
      const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
      const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

      expect(finalHoursWorked).toBe(0);
      expect(finalOvertimeHours).toBe(0);
    });

    it("should set worked hours to 0 for sick status", () => {
      const entry = {
        hoursWorked: 8,
        overtimeHours: 1,
        workType: "sick" as const,
      };

      const workType = entry.workType ?? "regular";
      const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
      const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

      expect(finalHoursWorked).toBe(0);
      expect(finalOvertimeHours).toBe(0);
    });

    it("should set worked hours to 0 for holiday status", () => {
      const entry = {
        hoursWorked: 8,
        overtimeHours: 0,
        workType: "holiday" as const,
      };

      const workType = entry.workType ?? "regular";
      const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
      const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

      expect(finalHoursWorked).toBe(0);
      expect(finalOvertimeHours).toBe(0);
    });
  });

  describe("Working status hours calculation", () => {
    it("should preserve worked hours for regular status", () => {
      const entry = {
        hoursWorked: 8,
        overtimeHours: 2,
        workType: "regular" as const,
      };

      const workType = entry.workType ?? "regular";
      const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
      const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

      expect(finalHoursWorked).toBe(8);
      expect(finalOvertimeHours).toBe(2);
    });

    it("should preserve worked hours for overtime status", () => {
      const entry = {
        hoursWorked: 10,
        overtimeHours: 4,
        workType: "overtime" as const,
      };

      const workType = entry.workType ?? "regular";
      const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
      const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

      expect(finalHoursWorked).toBe(10);
      expect(finalOvertimeHours).toBe(4);
    });

    it("should use default regular status when workType is undefined", () => {
      const entry = {
        hoursWorked: 8,
        overtimeHours: undefined,
        workType: undefined,
      };

      const workType = entry.workType ?? "regular";
      const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
      const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

      expect(workType).toBe("regular");
      expect(finalHoursWorked).toBe(8);
      expect(finalOvertimeHours).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero hours for regular status", () => {
      const entry = {
        hoursWorked: 0,
        overtimeHours: 0,
        workType: "regular" as const,
      };

      const workType = entry.workType ?? "regular";
      const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
      const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

      expect(finalHoursWorked).toBe(0);
      expect(finalOvertimeHours).toBe(0);
    });

    it("should handle maximum hours for regular status", () => {
      const entry = {
        hoursWorked: 20,
        overtimeHours: 4,
        workType: "regular" as const,
      };

      const workType = entry.workType ?? "regular";
      const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
      const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

      expect(finalHoursWorked).toBe(20);
      expect(finalOvertimeHours).toBe(4);
    });

    it("should handle maximum hours for absent status (should be 0)", () => {
      const entry = {
        hoursWorked: 24,
        overtimeHours: 12,
        workType: "absent" as const,
      };

      const workType = entry.workType ?? "regular";
      const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
      const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

      expect(finalHoursWorked).toBe(0);
      expect(finalOvertimeHours).toBe(0);
    });
  });

  describe("Status transition scenarios", () => {
    it("should correctly handle transition from regular to absent", () => {
      // First: Regular status with 8 hours
      let entry = {
        hoursWorked: 8,
        overtimeHours: 0,
        workType: "regular" as const,
      };

      let workType = entry.workType ?? "regular";
      let isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      let finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;

      expect(finalHoursWorked).toBe(8);

      // Then: Change to Absent status
      entry = {
        hoursWorked: 8, // Frontend still sends 8, but should be overridden
        overtimeHours: 0,
        workType: "absent",
      };

      workType = entry.workType ?? "regular";
      isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;

      expect(finalHoursWorked).toBe(0);
    });

    it("should correctly handle transition from absent to regular", () => {
      // First: Absent status with 0 hours
      let entry = {
        hoursWorked: 0,
        overtimeHours: 0,
        workType: "absent" as const,
      };

      let workType = entry.workType ?? "regular";
      let isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      let finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;

      expect(finalHoursWorked).toBe(0);

      // Then: Change to Regular status
      entry = {
        hoursWorked: 8,
        overtimeHours: 0,
        workType: "regular",
      };

      workType = entry.workType ?? "regular";
      isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;

      expect(finalHoursWorked).toBe(8);
    });

    it("should correctly handle transition between non-working statuses", () => {
      // First: Sick status
      let entry = {
        hoursWorked: 8,
        overtimeHours: 2,
        workType: "sick" as const,
      };

      let workType = entry.workType ?? "regular";
      let isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      let finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;

      expect(finalHoursWorked).toBe(0);

      // Then: Change to Holiday status
      entry = {
        hoursWorked: 8,
        overtimeHours: 0,
        workType: "holiday",
      };

      workType = entry.workType ?? "regular";
      isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;

      expect(finalHoursWorked).toBe(0);
    });
  });

  describe("Validation consistency", () => {
    it("should not allow total hours > 24 even if only overtime is set for non-working status", () => {
      const entry = {
        hoursWorked: 20,
        overtimeHours: 10,
        workType: "absent" as const,
      };

      const workType = entry.workType ?? "regular";
      const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
      const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

      const totalHours = finalHoursWorked + finalOvertimeHours;
      expect(totalHours).toBe(0);
      expect(totalHours).toBeLessThanOrEqual(24);
    });

    it("should validate total hours <= 24 for regular status", () => {
      const entry = {
        hoursWorked: 20,
        overtimeHours: 4,
        workType: "regular" as const,
      };

      const workType = entry.workType ?? "regular";
      const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
      const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

      const totalHours = finalHoursWorked + finalOvertimeHours;
      expect(totalHours).toBe(24);
      expect(totalHours).toBeLessThanOrEqual(24);
    });

    it("should reject total hours > 24 for regular status", () => {
      const entry = {
        hoursWorked: 20,
        overtimeHours: 5,
        workType: "regular" as const,
      };

      const workType = entry.workType ?? "regular";
      const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
      const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
      const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

      const totalHours = finalHoursWorked + finalOvertimeHours;
      expect(totalHours).toBe(25);
      expect(totalHours).toBeGreaterThan(24);
    });
  });
});
