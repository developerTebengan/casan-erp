# Casan ERP

Procurement and inventory for PT CASAN Energi Indonesia: purchase requests, sequential approval, goods receipt, stock, and a petty cash box for small cash buys.

Not a full finance or sales suite. Product definition: [docs/CASAN_ERP_prd_v1.md](docs/CASAN_ERP_prd_v1.md) (through v0.7.0). Releases: [CHANGELOG.md](CHANGELOG.md).

Stack: SvelteKit, TypeScript, Tailwind CSS, Prisma, PostgreSQL.

## Features

- **Authentication**: Session login, role permissions, optional demo accounts
- **Dashboard**: Role home (approval queue, my PRs, or ops counts)
- **Inventory**: Products, low stock, last-in date; stock moves via receipt, petty cash, or ledger; suppliers per product
- **Purchasing**: Purchase requests, three-level approval, per-item goods receipt
- **Petty cash**: One cash box (Admin/Finance top-up; Admin buys stock); refund audit vs catalog; CSV
- **Suppliers**: Directory plus products each supplier sells
- **Settings**: Persisted company profile and application defaults; in-app changelog
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

# Run docker compose
docker compose up

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
- `StockTransaction`
- `PettyCashAccount` / `PettyCashTransaction`
- `ProductSupplier`

## License

Private — for demonstration purposes.
