# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Phase 1: Foundation, Auth & Deploy

### Added
- **Project Scaffolding**: Next.js 14+ App Router, TypeScript strict mode, Tailwind CSS, Lucide icons, next-themes.
- **Database Architecture**: Full Prisma ORM schema connecting to Supabase PostgreSQL (pooled runtime URL and direct migration URL) with 7 models: `User`, `Company`, `Contact`, `Deal`, `Activity`, `Task`, `ModelVersion`.
- **Referential Integrity & Performance**: Explicit `onDelete` cascades/set-null and strategic indexes on `ownerId`, `stage`, `status`, `dueDate`, `closedAt`.
- **Authentication**: Auth.js / NextAuth Credentials provider with bcrypt password hashing, JWT sessions, and Edge middleware route protection.
- **App Shell**: Modern responsive SaaS layout featuring collapsible desktop sidebar, 375px mobile navigation drawer, dark/light mode toggle, and user profile menu.
- **Formatting Utilities**: Indian Rupee currency formatting (`₹12,34,567`) and standard date format (`DD MMM YYYY`).
- **Standardized API Error Format**: Structured `{ error: { code, message, fields? } }` with type-safe handlers.
- **Health Check Endpoint**: `/api/health` performing a real database connectivity query.
- **Seed Data**: Fully seeded database with 1 Admin (`admin@akshara.test`), 2 Sales Reps, 10 Indian Companies, 60 Indian Contacts, 200 closed deals correlated for ML learnability, 40 open deals, ~400 activities, and 30 follow-up tasks.
