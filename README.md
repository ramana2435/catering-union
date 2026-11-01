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

## Roadmap

- [ ] Authentication flows (login, signup, password reset)
- [ ] Job posting and browsing
- [ ] Worker profile management
- [ ] Provider dashboard
- [ ] Real-time location tracking
- [ ] Admin panel
- [ ] Push notifications
