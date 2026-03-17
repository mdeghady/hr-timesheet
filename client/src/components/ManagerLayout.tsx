import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  HardHat,
  History,
  Home,
  LogOut,
  WifiOff,
  X,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const navItems = [
  { href: "/manager", label: "Home", icon: Home },
  { href: "/manager/timesheet", label: "Submit", icon: ClipboardList },
  { href: "/manager/history", label: "History", icon: History },
];

export function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const { isOnline, pendingCount } = useOfflineSync();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-xs w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
            <HardHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">ConstructHR</h1>
          <p className="text-muted-foreground mb-8 text-sm">Manager Portal — Sign in to submit timesheets.</p>
          <a
            href={getLoginUrl()}
            className="block w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-center hover:bg-primary/90 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const role = user?.role as string | undefined;
  if (role !== "manager" && role !== "hr_admin" && role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6 text-sm">This portal is for Team Managers only.</p>
          {(role === "hr_admin" || role === "admin") && (
            <Link href="/hr" className="text-primary text-sm hover:underline">
              Go to HR Portal →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-sidebar border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <HardHat className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <p className="text-sidebar-foreground font-bold text-sm leading-tight">ConstructHR</p>
              <p className="text-sidebar-foreground/50 text-xs">Manager Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg text-xs font-medium">
                <WifiOff className="w-3 h-3" />
                Offline
              </div>
            )}
            {pendingCount > 0 && isOnline && (
              <div className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-xs font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                {pendingCount} pending
              </div>
            )}
            <button
              onClick={logout}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            You're offline. Timesheet entries will be saved locally and synced when connection is restored.
          </p>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-40 bg-sidebar border-t border-sidebar-border">
        <div className="flex items-stretch">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/manager" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
        {/* Safe area for iOS */}
        <div className="h-safe-area-inset-bottom" />
      </nav>
    </div>
  );
}
