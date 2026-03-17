import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageToggle } from "./LanguageToggle";
import {
  BarChart3,
  Building2,
  ChevronRight,
  ClipboardList,
  Download,
  HardHat,
  LogOut,
  Menu,
  ScrollText,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

// Navigation items will be translated dynamically

export function HRLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { t, language } = useTranslation();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/hr", label: t('dashboard'), icon: BarChart3 },
    { href: "/hr/teams", label: t('teams'), icon: Building2 },
    { href: "/hr/employees", label: t('employeesSection'), icon: Users },
    { href: "/hr/managers", label: t('managersSection'), icon: HardHat },
    { href: "/hr/timesheets", label: t('timesheetsSection'), icon: ClipboardList },
    { href: "/hr/export", label: t('exportReportsSection'), icon: Download },
    { href: "/hr/audit", label: t('auditTrailSection'), icon: ScrollText },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading ConstructHR…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
            <HardHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">ConstructHR</h1>
          <p className="text-muted-foreground mb-8 text-sm">{t('accessDeniedDesc')}</p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {t('signIn')}
          </a>
        </div>
      </div>
    );
  }

  const userRole = user?.role as string | undefined;
  if (userRole !== "hr_admin" && userRole !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">{t('accessDenied')}</h1>
          <p className="text-muted-foreground mb-6 text-sm">{t('accessDeniedDesc')}</p>
          {user?.role === "manager" && (
            <Link href="/manager" className="text-primary text-sm hover:underline">
              {t('goToManagerPortal')} →
            </Link>
          )}
        </div>
      </div>
    );
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar",
        mobile ? "w-full" : "w-64"
      )}
    >
      {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <HardHat className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="text-sidebar-foreground font-bold text-sm leading-tight">ConstructHR</p>
          <p className="text-sidebar-foreground/50 text-xs">{t('hrAdminPortal')}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/hr" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
        <LanguageToggle />
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sidebar-primary text-xs font-bold">
              {(user?.name ?? "HR").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground text-xs font-medium truncate">{user?.name ?? "HR Admin"}</p>
            <p className="text-sidebar-foreground/50 text-xs truncate">{user?.email ?? ""}</p>
          </div>
          <button
            onClick={logout}
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            title={t('signOut')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 flex-shrink-0">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between gap-3 px-4 py-3 bg-sidebar border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-sidebar-foreground p-1 rounded"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <HardHat className="w-5 h-5 text-sidebar-primary" />
              <span className="text-sidebar-foreground font-bold text-sm">ConstructHR</span>
            </div>
          </div>
          <LanguageToggle />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
