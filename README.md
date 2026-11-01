# Catering Union

A full-stack web application connecting catering workers with event providers.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project ([supabase.com](https://supabase.com))

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the environment variable template and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these in your Supabase dashboard under **Project Settings → API**.

> **Security**: Never commit `.env` to version control. It is already in `.gitignore`.

### 3. Start development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run type-check` | Run TypeScript checks without building |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── assets/          # Images, fonts, static files
├── components/
│   ├── common/      # Reusable UI: Button, Input, Card, Loading, ErrorMessage
│   └── layout/      # Header, Footer, MainLayout, AuthLayout
├── features/        # Feature-based modules
│   ├── auth/        # Authentication
│   ├── jobs/        # Job listings and management
│   ├── workers/     # Worker profiles
│   ├── providers/   # Provider management
│   ├── admin/       # Admin panel
│   └── tracking/    # Live location tracking
├── hooks/           # Custom React hooks
├── lib/
│   └── supabase.ts  # Supabase client (reads env vars)
├── pages/           # Route-level page components
├── routes/          # React Router configuration
├── types/           # Shared TypeScript types
├── utils/           # Pure utility functions
├── App.tsx
├── main.tsx
└── index.css
```

## Architecture Notes

- **Mobile-first**: All styles use Tailwind mobile-first breakpoints.
- **Strict TypeScript**: `strict: true` with no `any` types.
- **@ path alias**: Import from `@/components/...` instead of relative paths.
- **Feature modules**: Each domain (auth, jobs, workers, providers, admin, tracking) lives in `src/features/` for scalability.
- **Environment variables**: All secrets are environment variables; the frontend only receives the public anon key.

## Features

- ✅ Complete authentication system (login, signup, password reset)
- ✅ Job posting, browsing, and management
- ✅ Worker profile management
- ✅ Provider dashboard with job tracking
- ✅ Real-time location sharing during events
- ✅ Admin panel with audit logs
- ✅ Multilingual support (English, Hindi, Telugu)
- ✅ Offline detection and error handling
- ✅ Comprehensive security with Row Level Security (RLS)
- ✅ Attendance tracking with location verification
- ✅ Soft delete with restore capability
- ✅ Automated data retention and cleanup

## Deployment

See **[MODULE_14_DEPLOYMENT_GUIDE.md](MODULE_14_DEPLOYMENT_GUIDE.md)** for complete deployment instructions to:
- **GitHub** (version control)
- **Supabase** (backend, database, auth)
- **Cloudflare Pages** (frontend hosting)

All services use free tiers - no cost to deploy and run.

## Testing

```bash
# Run unit tests
npm test

# Run tests with UI
npm run test:ui

# Run type checking
npm run type-check

# Build for production
npm run build
```

**Test Coverage**: 47 automated tests covering error handling and database functions.

See **[MANUAL_TESTING_CHECKLIST.md](MANUAL_TESTING_CHECKLIST.md)** for comprehensive manual testing (200+ test cases).

## Security

**Security Rating**: 8.5/10 (STRONG)

- ✅ Zero critical or high-severity issues
- ✅ 47 Row Level Security (RLS) policies across 8 tables
- ✅ Immutable audit logs
- ✅ Atomic booking operations with race condition protection
- ✅ Privacy-first location sharing (auto-expires, RLS-protected)
- ✅ No secrets in frontend code

See **[SECURITY_REVIEW.md](SECURITY_REVIEW.md)** for detailed security audit.
