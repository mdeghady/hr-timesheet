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
