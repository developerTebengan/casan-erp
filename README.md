# Casan ERP

A modern, full-stack ERP application built with SvelteKit, TypeScript, Tailwind CSS, Prisma, and SQLite.

## Features

- **Authentication**: Session-based login with protected routes
- **Dashboard**: Statistics cards, monthly purchase chart, recent activity
- **Inventory**: Product management with CRUD operations and stock tracking
- **Purchasing**: Purchase order management with items and suppliers
- **Settings**: Company profile, user/role management, application settings
- **Responsive Design**: Mobile-first with collapsible sidebar drawer
- **Dark/Light Mode**: Theme switching with persistence

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS 4, Lucide Icons
- **Backend**: SvelteKit Server Routes (+server.ts), REST API
- **Database**: PostgreSQL with Prisma ORM
- **Charts**: Chart.js

## Getting Started

```sh
# Install dependencies
npm install

# Set up PostgreSQL (example with Docker)
docker run -d --name casan-erp-postgres \
  -e POSTGRES_USER=casan \
  -e POSTGRES_PASSWORD=casan123 \
  -e POSTGRES_DB=casan_erp \
  -p 5432:5432 postgres:17-alpine

# Set DATABASE_URL in .env
# DATABASE_URL="postgresql://casan:casan123@localhost:5432/casan_erp?schema=public"

# Set up the database and seed sample data
npx prisma migrate dev --name init
npx prisma db seed

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

**Demo credentials:**

- Email: `admin@casanerp.com`
- Password: `password`

## Available Scripts

```sh
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Type-check with svelte-check
npm run lint         # Run Prettier and ESLint
npm run format       # Format code with Prettier
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed the database
npm run db:studio    # Open Prisma Studio
```

## Project Structure

```
src/
 ├── lib/
 │   ├── components/      # Reusable UI components
 │   ├── server/          # Server-only modules (db, auth, repositories, services)
 │   ├── stores/          # Svelte stores (theme, auth, toast, sidebar)
 │   ├── types/           # Shared TypeScript types
 │   └── utils/           # Utility functions
 ├── routes/
 │   ├── login/           # Login page
 │   ├── (app)/           # Protected app routes
 │   │   ├── dashboard/
 │   │   ├── inventory/
 │   │   ├── purchasing/
 │   │   └── settings/
 │   └── api/             # REST API endpoints
 ├── hooks.server.ts      # Authentication hooks
 └── app.html
```

## Database Schema

The application uses the following Prisma models:

- `User`
- `Supplier`
- `Category`
- `Product`
- `Purchase`
- `PurchaseItem`

## License

Private — for demonstration purposes.
