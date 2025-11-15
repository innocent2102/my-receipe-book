# My Recipe Book

Create and save your own recipes, access your favorites instantly, and generate grocery lists in seconds. Plan meals easily and keep all your go-to dishes organized in one convenient app.

## Monorepo Structure

This project is organized as a monorepo with the following workspaces:

- **frontend**: Next.js + React + PWA application
- **backend**: Node.js + Express + SQLite API server
- **shared**: Shared TypeScript types and utilities

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

#### Windows Users

`better-sqlite3` requires native compilation on Windows. You have two options:

**Option 1: Install Windows Build Tools (Recommended)**
1. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) or [Visual Studio Community](https://visualstudio.microsoft.com/downloads/)
2. During installation, select "Desktop development with C++" workload
3. Run `npm install` from the project root

**Option 2: Use Prebuilt Binaries**
If the above fails, try installing with prebuilt binaries:
```bash
npm install --build-from-source=false
```

If `better-sqlite3` still fails to install, you can temporarily skip it and install other dependencies:
```bash
npm install --ignore-scripts
cd backend
npm install better-sqlite3 --build-from-source=false
cd ..
```

#### All Platforms

Install all dependencies for all workspaces:

```bash
npm install
```

### Development

Run both frontend and backend in development mode:

```bash
npm run dev
```

Or run them separately:

```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

### Building

Build all workspaces:

```bash
npm run build
```

Or build individually:

```bash
npm run build:frontend
npm run build:backend
```

## Project Structure

```
my-receipe-book/
├── frontend/          # Next.js + React + PWA
│   ├── src/
│   │   └── app/      # Next.js App Router
│   └── public/       # Static assets & PWA files
├── backend/          # Express + SQLite API
│   ├── src/
│   │   ├── index.ts  # Express server entry
│   │   └── database.ts # SQLite setup
│   └── data/         # SQLite database files
└── shared/           # Shared TypeScript code
    └── src/
        ├── types/    # TypeScript type definitions
        └── utils/    # Shared utility functions
```

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **PWA** - Progressive Web App support via next-pwa
- **TypeScript** - Type safety

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **SQLite** - Database (via better-sqlite3)
- **TypeScript** - Type safety

### Shared
- **TypeScript** - Shared types and utilities
