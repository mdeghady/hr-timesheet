import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";

// HR Admin Pages
import HRDashboard from "./pages/hr/HRDashboard";
import TeamsPage from "./pages/hr/TeamsPage";
import EmployeesPage from "./pages/hr/EmployeesPage";
import ManagersPage from "./pages/hr/ManagersPage";
import TimesheetsPage from "./pages/hr/TimesheetsPage";
import TimesheetDetailPage from "./pages/hr/TimesheetDetailPage";
import ExportPage from "./pages/hr/ExportPage";
import AuditPage from "./pages/hr/AuditPage";

// Manager Pages
import ManagerHome from "./pages/manager/ManagerHome";
import TimesheetSubmitPage from "./pages/manager/TimesheetSubmitPage";
import ManagerHistory from "./pages/manager/ManagerHistory";
import ManagerTimesheetDetail from "./pages/manager/ManagerTimesheetDetail";

function Router() {
  return (
    <Switch>
      {/* Landing */}
      <Route path="/" component={Home} />

      {/* HR Admin Portal */}
      <Route path="/hr" component={HRDashboard} />
      <Route path="/hr/teams" component={TeamsPage} />
      <Route path="/hr/employees" component={EmployeesPage} />
      <Route path="/hr/managers" component={ManagersPage} />
      <Route path="/hr/timesheets" component={TimesheetsPage} />
      <Route path="/hr/timesheets/:id" component={TimesheetDetailPage} />
      <Route path="/hr/export" component={ExportPage} />
      <Route path="/hr/audit" component={AuditPage} />

      {/* Manager Portal */}
      <Route path="/manager" component={ManagerHome} />
      <Route path="/manager/timesheet" component={TimesheetSubmitPage} />
      <Route path="/manager/history" component={ManagerHistory} />
      <Route path="/manager/history/:id" component={ManagerTimesheetDetail} />

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster position="top-right" richColors />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
