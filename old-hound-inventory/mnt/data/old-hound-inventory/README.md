# The Old Hound Inventory & Ordering System

A Railway-ready inventory and purchasing application for The Old Hound ice cream shop.

## Included

- Dashboard with inventory value, low-stock count, open orders and expected deliveries
- Product catalog with categories, manufacturers, suppliers and supplier pack sizes
- Inventory by location using transaction-based stock balances
- Physical stock counts with automatic count-adjustment transactions
- Suggested purchasing based on par levels, reorder points and stock already on order
- Purchase orders
- Delivery receiving with automatic inventory receipt transactions
- Supplier price history table
- User and audit-log tables ready for authentication/permissions later
- Responsive tablet/desktop UI

Not included by design: waste, recipes, menu items, or POS sales depletion.

## Local setup

1. Install Node.js 20+ and PostgreSQL.
2. Copy `.env.example` to `.env` and update `DATABASE_URL`.
3. Run:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000.

## Railway deployment

1. Push this folder to a GitHub repository.
2. Create a Railway project.
3. Add a PostgreSQL service.
4. Deploy the GitHub repository as a Railway service.
5. Add a reference variable named `DATABASE_URL` pointing to the Postgres service's `DATABASE_URL`.
6. In the app service settings, set the pre-deploy command to:

```bash
npx prisma migrate deploy
```

7. Generate a public domain in Railway Networking.
8. Seed the production database once with `npm run db:seed` using Railway CLI or a one-off shell.

The project uses Next.js standalone output, which is suitable for Railway deployment.

## Important before public use

This starter does not implement login/authentication. Keep it private while testing, then add authentication and role checks before exposing it publicly.
