# ConstructHR — Timesheet Management System TODO

## Phase 1: Database Schema
- [x] Design and apply full relational schema (users, employees, teams, assignments, timesheets, entries, audit_logs)
- [x] Add role enum: hr_admin, manager (extend existing user.role)
- [x] Add teams table with manager assignment
- [x] Add employees table linked to teams
- [x] Add team_assignments table for dynamic membership history
- [x] Add timesheets table (per manager per day)
- [x] Add timesheet_entries table (per employee per timesheet)
- [x] Add audit_logs table for all mutations

## Phase 2: Backend API
- [x] Role-based middleware (hr_admin, manager procedures)
- [x] Teams CRUD (HR only)
- [x] Employees CRUD (HR only)
- [x] Manager assignment to teams (HR only)
- [x] Employee-team assignment management (HR only)
- [x] Timesheet submission (manager)
- [x] Timesheet entry validation (max hours, date restrictions)
- [x] Timesheet review/status update (HR)
- [x] Timesheet history queries
- [x] Audit log recording for all mutations
- [x] Email notification: HR notified on submission
- [x] Email notification: Manager notified on review/correction

## Phase 3: HR Admin Dashboard
- [x] HR Admin layout with sidebar navigation
- [x] Dashboard overview (stats: teams, employees, pending timesheets)
- [x] Teams management page (create, edit, delete)
- [x] Employees management page (create, edit, delete, assign to team)
- [x] Managers management page (create, assign to team)
- [x] Timesheet review page (list all submissions, filter by date/team)
- [x] Timesheet detail view (entries per employee)
- [x] Status management (approve/flag for correction)

## Phase 4: Manager Mobile Interface
- [x] Manager mobile-first layout
- [x] Team overview page (assigned employees list)
- [x] Daily timesheet submission form (per employee hours entry)
- [x] Timesheet history page (past submissions)
- [x] Offline mode: localStorage queue for pending submissions
- [x] Background sync when connectivity restored (online event listener)
- [x] Offline indicator UI

## Phase 5: Excel Export & Audit Trail
- [x] Install exceljs for server-side Excel generation
- [x] Daily export endpoint (single day, all teams or specific team)
- [x] Weekly export endpoint
- [x] Monthly export endpoint
- [x] Audit trail page (HR only) showing all system events
- [x] Export download UI in HR dashboard

## Phase 6: Polish & Tests
- [x] Global design system: colors, typography, spacing (elegant navy & gold construction theme)
- [x] Responsive breakpoints verified
- [x] Loading skeletons and empty states
- [x] Error boundaries and toast notifications
- [x] Vitest unit tests for key procedures (19 tests passing)
- [x] Google Fonts: Inter + Plus Jakarta Sans

## Phase 7: Delivery
- [x] Final checkpoint saved
- [x] Documentation delivered to user


## Phase 8: Arabic Translation & RTL Support
- [x] Create i18n infrastructure with English and Arabic translation files
- [x] Build LanguageContext and useLanguage hook
- [x] Add language toggle button to all layouts
- [x] Translate all HR Admin pages to Arabic
- [x] Translate all Manager pages to Arabic
- [x] Implement RTL layout: flip sidebar, adjust spacing, mirror icons where needed
- [x] Update CSS for RTL: text-align, margin/padding directions
- [x] Test both languages on mobile and desktop
- [x] Verify all forms, buttons, and labels work in RTL


## Phase 9: Complete Website Translation (All Pages)
- [x] Translate HRDashboard page completely
- [x] Translate TeamsPage with all CRUD dialogs
- [x] Translate EmployeesPage with all forms
- [x] Translate ManagersPage with all management UI
- [x] Translate TimesheetsPage with review interface
- [x] Translate TimesheetDetailPage
- [x] Translate ExportPage with report options
- [x] Translate AuditPage with log display
- [x] Translate ManagerHome page
- [x] Translate TimesheetSubmitPage with form
- [x] Translate ManagerHistory page
- [x] Translate ManagerTimesheetDetail page
- [x] Translate all error messages and validation text
- [x] Translate all toast notifications
- [x] Translate all modal/dialog titles and buttons
- [x] Test all pages in Arabic mode
- [x] Verify RTL layout on all pages


## Phase 10: Manager Portal Translations & Work Types
- [x] Add work types translations (Regular, Overtime, Holiday, Sick Leave, Absent)
- [x] Translate Manager Home dashboard with team stats
- [x] Translate Manager Submit Timesheet page with all form fields
- [x] Translate Manager History page with filtering
- [x] Translate all work type labels in both English and Arabic
- [x] Add manager portal data labels (submission date, review status, etc)
- [x] Test all Manager pages in both languages
- [x] Verify work types display correctly in Arabic
- [x] Test offline sync messages in both languages
- [x] All tests passing (19 tests)


## Phase 11: Bug Fixes
- [x] Fix missing "Submit for Review" button on mobile devices
- [x] Verify button visibility across all screen sizes (mobile, tablet, desktop)
- [x] Test responsive layout on TimesheetSubmitPage
