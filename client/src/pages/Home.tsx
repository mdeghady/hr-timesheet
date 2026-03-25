import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { getLoginUrl } from "@/const";
import { HardHat, ClipboardList, Users, BarChart3, Shield, WifiOff, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { t } = useTranslation();
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const role = user.role as string;
      if (role === "hr_admin" || role === "admin") {
        navigate("/hr");
      } else if (role === "manager") {
        navigate("/manager");
      }
    }
  }, [loading, isAuthenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-sidebar">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-sidebar-primary translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-sidebar-primary -translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-sidebar-primary flex items-center justify-center mx-auto mb-6">
            <HardHat className="w-8 h-8 text-sidebar-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-sidebar-foreground mb-3">ConstructHR</h1>
          <p className="text-sidebar-foreground/70 text-lg mb-2">Timesheet Management for Construction Teams</p>
          <p className="text-sidebar-foreground/50 text-sm mb-10 max-w-xl mx-auto">
            Streamline daily timesheet submission, HR review, and payroll reporting — built for the field and the office.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={getLoginUrl()}
              className="inline-flex items-center gap-2 bg-sidebar-primary text-sidebar-primary-foreground px-8 py-3.5 rounded-xl font-semibold hover:bg-sidebar-primary/90 transition-colors text-sm"
            >
              Sign In to Get Started
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-12 bg-border" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Features</span>
            <div className="h-px w-12 bg-border" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Everything you need</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: ClipboardList,
              title: "Daily Timesheet Entry",
              desc: "Managers submit hours for each team member from their mobile device in seconds.",
              color: "bg-primary/10 text-primary",
            },
            {
              icon: BarChart3,
              title: "HR Review & Approval",
              desc: "HR admins review, approve, or flag timesheets with notes from a clean desktop dashboard.",
              color: "bg-emerald-100 text-emerald-700",
            },
            {
              icon: Users,
              title: "Team Management",
              desc: "Create teams, assign managers and employees, and reorganize at any time.",
              color: "bg-blue-100 text-blue-700",
            },
            {
              icon: Shield,
              title: "Role-Based Access",
              desc: "HR Admins and Team Managers each see only what they need — secure by design.",
              color: "bg-purple-100 text-purple-700",
            },
            {
              icon: WifiOff,
              title: "Offline Support",
              desc: "Managers on construction sites can log hours offline — data syncs automatically when connected.",
              color: "bg-amber-100 text-amber-700",
            },
            {
              icon: HardHat,
              title: "Excel Export",
              desc: "Download daily, weekly, or monthly reports as formatted Excel spreadsheets for payroll.",
              color: "bg-slate-100 text-slate-700",
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="bg-card rounded-xl border border-border p-5">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Portals */}
      <div className="bg-muted/50 border-t border-border">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-1">HR Admin Portal</h3>
              <p className="text-sm text-muted-foreground mb-4">Desktop-optimized dashboard for managing teams, reviewing timesheets, and exporting reports.</p>
              <Link href="/hr" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                Go to HR Portal <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <ClipboardList className="w-5 h-5 text-blue-700" />
              </div>
              <h3 className="font-bold text-foreground mb-1">Manager Portal</h3>
              <p className="text-sm text-muted-foreground mb-4">Mobile-first interface for submitting daily timesheets for your team — even offline.</p>
              <Link href="/manager" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                Go to Manager Portal <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">
          ConstructHR — Built for construction teams
        </p>
      </footer>
    </div>
  );
}
