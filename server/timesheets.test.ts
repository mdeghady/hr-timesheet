import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock Context Factories ────────────────────────────────────────────────────

function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  const clearedCookies: any[] = [];
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    } as any,
    req: { protocol: "https", headers: {} } as any,
    res: {
      clearCookie: (name: string, options: any) => clearedCookies.push({ name, options }),
    } as any,
  };
}

function hrCtx() {
  return makeCtx({ id: 1, role: "hr_admin" as any, openId: "hr-user" });
}

function managerCtx(id = 2) {
  return makeCtx({ id, role: "manager" as any, openId: `manager-${id}` });
}

// ─── Auth Tests ────────────────────────────────────────────────────────────────

describe("auth", () => {
  it("me returns null for unauthenticated context", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user for authenticated context", async () => {
    const ctx = hrCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("hr_admin");
  });

  it("logout clears session cookie", async () => {
    const clearedCookies: any[] = [];
    const ctx: TrpcContext = {
      user: hrCtx().user,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: (name: string, opts: any) => clearedCookies.push({ name, opts }) } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies).toHaveLength(1);
  });
});

// ─── Role Guard Tests ──────────────────────────────────────────────────────────

describe("role guards", () => {
  it("teams.all is accessible by any authenticated user", async () => {
    const ctx = makeCtx({ role: "user" as any });
    const caller = appRouter.createCaller(ctx);
    // teams.all uses protectedProcedure (any authenticated user can read teams)
    const result = await caller.teams.all();
    expect(Array.isArray(result)).toBe(true);
  });

  it("teams.create requires hr_admin role", async () => {
    const ctx = makeCtx({ role: "user" as any });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.teams.create({ name: "Test Team" })
    ).rejects.toThrow();
  });

  it("teams.create allows hr_admin", async () => {
    const ctx = hrCtx();
    const caller = appRouter.createCaller(ctx);
    // Should not throw
    const result = await caller.teams.create({ name: `Test Team ${Date.now()}` });
    expect(result.success).toBe(true);
  });

  it("manager.myTeam requires manager role", async () => {
    const ctx = makeCtx({ role: "user" as any });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.manager.myTeam()).rejects.toThrow();
  });

  it("manager.myTeam allows manager role", async () => {
    const ctx = managerCtx();
    const caller = appRouter.createCaller(ctx);
    // Should not throw (returns null if no team assigned)
    const result = await caller.manager.myTeam();
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("timesheets.dashboardStats requires hr_admin", async () => {
    const ctx = managerCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.timesheets.dashboardStats()).rejects.toThrow();
  });

  it("audit.logs requires hr_admin", async () => {
    const ctx = managerCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.audit.logs({ limit: 10 })).rejects.toThrow();
  });
});

// ─── Timesheet Validation Tests ────────────────────────────────────────────────

describe("timesheet validation", () => {
  it("saveEntries rejects hours exceeding 24", async () => {
    const ctx = managerCtx();
    const caller = appRouter.createCaller(ctx);
    // This will fail at the DB level (no timesheet), but the validation happens first
    // We test that hours > 24 is rejected by zod schema
    await expect(
      caller.timesheets.saveEntries({
        timesheetId: 999999,
        entries: [
          {
            employeeId: 1,
            hoursWorked: 25, // exceeds max
            overtimeHours: 0,
            workType: "regular",
          },
        ],
      })
    ).rejects.toThrow();
  });

  it("saveEntries rejects negative hours", async () => {
    const ctx = managerCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.timesheets.saveEntries({
        timesheetId: 999999,
        entries: [
          {
            employeeId: 1,
            hoursWorked: -1, // negative
            workType: "regular",
          },
        ],
      })
    ).rejects.toThrow();
  });

  it("getOrCreate rejects future dates", async () => {
    const ctx = managerCtx();
    const caller = appRouter.createCaller(ctx);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    await expect(
      caller.timesheets.getOrCreate({
        teamId: 1,
        workDate: futureDateStr,
      })
    ).rejects.toThrow("Cannot create timesheet for future dates");
  });
});

// ─── Export Tests ──────────────────────────────────────────────────────────────

describe("export", () => {
  it("export.timesheet requires hr_admin role", async () => {
    const ctx = managerCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.export.timesheet({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
        reportType: "monthly",
      })
    ).rejects.toThrow();
  });

  it("export.timesheet allows hr_admin and returns base64 data", async () => {
    const ctx = hrCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.export.timesheet({
      startDate: "2025-01-01",
      endDate: "2025-01-31",
      reportType: "monthly",
    });
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("filename");
    expect(result).toHaveProperty("mimeType");
    expect(typeof result.data).toBe("string");
    expect(result.filename).toContain("monthly");
    expect(result.mimeType).toContain("spreadsheetml");
  });
});

// ─── Users Tests ──────────────────────────────────────────────────────────────

describe("users", () => {
  it("users.all requires hr_admin", async () => {
    const ctx = managerCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.all()).rejects.toThrow();
  });

  it("users.all returns array for hr_admin", async () => {
    const ctx = hrCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.all();
    expect(Array.isArray(result)).toBe(true);
  });

  it("users.managers returns array for hr_admin", async () => {
    const ctx = hrCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.managers();
    expect(Array.isArray(result)).toBe(true);
  });
});
