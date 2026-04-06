# Numerical Methods Visualizer

A full-stack web application for visualizing numerical methods for finding roots of mathematical functions.

## Architecture

- **Frontend**: React + TypeScript + Vite, using Tailwind CSS and shadcn/ui components
- **Backend**: Express.js (Node.js) with TypeScript, served via `tsx` in development
- **Database**: PostgreSQL via Drizzle ORM
- **Routing**: Wouter (client-side), Express (API routes)
- **Math**: mathjs and KaTeX for parsing and rendering mathematical expressions

## Project Structure

```
client/         - React frontend application
  src/
    pages/      - Page components (visualizer, not-found)
    components/ - UI components (shadcn/ui)
server/         - Express backend
  index.ts      - Main entry point
  routes.ts     - API routes (presets CRUD)
  storage.ts    - Database access layer
  db.ts         - Drizzle ORM connection
  vite.ts       - Vite dev middleware setup
shared/
  schema.ts     - Drizzle database schema (presetFunctions table)
  routes.ts     - Shared route definitions
```

## Running the App

- **Development**: `npm run dev` (starts Express + Vite middleware on port 5000)
- **Build**: `npm run build` (builds frontend to dist/public, bundles server)
- **Production**: `npm run start` (runs compiled dist/index.cjs)
- **DB schema push**: `npm run db:push`

## Database

Uses Replit's built-in PostgreSQL database. Schema defined in `shared/schema.ts`:
- `preset_functions`: Stores example mathematical functions with name, expression, g_expression (for Fixed Point method), and description

## Key Features

- Interactive visualizer for numerical root-finding methods (Bisection, Newton-Raphson, Fixed Point, etc.)
- Preset function library stored in PostgreSQL
- KaTeX rendering of mathematical expressions
- Recharts for graphical visualization
