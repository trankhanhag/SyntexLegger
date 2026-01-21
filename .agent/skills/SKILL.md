---
name: accounting-fullstack
description: Build a fullstack accounting web app with clean data model, strict double-entry rules, auditability, and production-grade engineering practices (API, UI, tests, security).
---

# Accounting Fullstack Skill

You are the dedicated builder for an accounting software project (fullstack web app).  
Your job: deliver correct accounting logic + clean architecture + tests + safe migrations.

## When to use this skill
Use this skill whenever the user asks for:
- Designing accounting modules (GL, AR/AP, Cash/Bank, Inventory, Fixed Assets, Payroll, Tax/VAT, Reports)
- Database schema for accounting
- API endpoints + validations
- UI table-heavy flows (double-click edit, filters, exports)
- Report generation (trial balance, ledger, financial statements, VAT reports)
- Refactors that may impact correctness/audit trail

## Non-negotiable principles (must follow)
1) Double-entry must balance: sum(debit) == sum(credit) per journal entry.
2) Immutable audit trail: never “edit history away”.
   - Prefer: append-only journal lines + correction entries + explicit versioning.
3) Idempotency for imports/automation: same external invoice should not duplicate.
4) Every business document has: status lifecycle (draft/posted/void), posted_at, posted_by, source_ref.
5) Database must avoid data duplication; normalize master data, keep transactional lines lean.
6) All money amounts: use DECIMAL (not float). Store currency + fx_rate + base_amount.
7) Every change is traceable: created_at/by, updated_at/by, and (where needed) audit log with diff.
8) Never run destructive commands automatically; ask before mass delete / migration rollback.

## Default stack (can adapt if user specifies)
- Backend: Node.js (NestJS/Fastify) or Python (FastAPI) with layered architecture
- DB: PostgreSQL
- Frontend: React + TanStack Table (table-first UX), React Query
- Auth: JWT + refresh tokens, RBAC/ABAC
- Infra: Docker + migrations

If the repo already has a stack, follow it.

---

# Execution Playbook (how you will work)

## Step 0 — Discover & lock constraints
Before coding, infer or ask *minimally* (only if required) these constraints:
- Countries/tax regime scope (VN or multi-country)
- Multi-company? Multi-branch? Multi-currency?
- Accounting basis: accrual/cash; inventory method (FIFO/WA)
If not specified: assume VN, accrual, multi-currency optional, multi-company supported.

## Step 1 — Establish module boundaries
Use these bounded contexts:
- Identity & Access (users, roles, permissions)
- Master Data (chart of accounts, partners, items, warehouses, banks, cost centers)
- Documents (sales invoices, purchase invoices, receipts, payments, stock moves)
- General Ledger (journal entry, journal lines, posting engine)
- Reporting (ledger, trial balance, FS, tax reports)
- Integrations (e-invoice, bank statement import)

## Step 2 — Data model blueprint (DB-first correctness)
Always design:
- Master tables: accounts, partners, items, warehouses, currencies, tax_codes
- Transaction tables:
  - documents (header) + document_lines
  - journal_entries (header) + journal_lines (append-only)
  - postings: doc_id -> journal_entry_id mapping

Hard rules:
- journal_lines has (account_id, debit, credit, currency, amount, base_amount, fx_rate, dims...)
- enforce constraints:
  - CHECK (debit >= 0 AND credit >= 0)
  - CHECK (NOT (debit > 0 AND credit > 0))
- posting is a one-way transition: draft -> posted with locking semantics.

## Step 3 — API conventions
- REST-ish endpoints:
  - POST /documents (draft)
  - POST /documents/{id}/post  (creates journal entry)
  - POST /documents/{id}/void  (creates reversal/correction)
- Idempotency key for integrations: header.external_ref unique per source.
- Validation must be server-side; UI validation is bonus.

## Step 4 — UI conventions (table-heavy accounting UX)
- Default pattern: list view with filters + quick search + column chooser
- Inline edit (double-click) for draft-only states
- Posting action requires confirmation modal + preview of accounting entries
- Export: CSV/XLSX for reports & lists
- Performance:
  - server-side pagination, sorting, filtering
  - avoid “load all journal lines” on big ledgers

## Step 5 — Testing strategy (must ship with tests)
Minimum tests to add for every accounting feature:
- Posting produces balanced journal entry
- Totals are correct (tax, discount, rounding)
- Status transitions enforced (cannot edit posted)
- Idempotency works for external imports
- Permissions: unauthorized cannot post/void
Add:
- unit tests for posting engine
- integration tests for API endpoints
- snapshot/golden tests for reports where feasible

## Step 6 — Safe migrations
- Always write forward-only migrations.
- Never drop columns/tables without explicit user instruction and backup plan.
- Provide rollback notes even if you don’t implement rollback SQL.

---

# Quality Gate (definition of done)
A feature is done only if:
- Schema + migration included
- API endpoints implemented with validations
- UI flow implemented
- Tests added and passing
- Auditability preserved (no silent overwrites)
- Clear README/update notes for how to use

---

# How to use the references
When needed, read from:
- references/ACCOUNTING_RULES.md for domain constraints
- references/DATA_MODEL_BLUEPRINT.md for schema patterns
- references/API_CONVENTIONS.md and UI_CONVENTIONS.md for consistency
- templates/* for quick scaffolding

If the repo already contains similar conventions, prefer repo conventions.
