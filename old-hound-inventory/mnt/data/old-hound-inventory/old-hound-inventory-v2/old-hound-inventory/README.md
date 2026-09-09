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

## Authentication and editable master data

This version adds username/password protection and database-backed sessions. On the first visit to `/login`, if no password-enabled user exists, the app displays a one-time form to create the first Owner account. Passwords are hashed with bcrypt and are never stored in plain text.

After signing in, Owners can open **Users** in the left navigation to add users, change usernames, reset passwords, select roles, and deactivate access.

The **Products & Setup** screen now supports editing existing Products, Manufacturers, Suppliers, and Locations. Existing records can be marked inactive instead of being hard-deleted, which preserves historical inventory and purchase-order references.

### Updating an existing Railway deployment

1. Replace the files in your GitHub repository with this updated project and commit/push them.
2. Railway should automatically start a new deployment from GitHub.
3. Keep the existing `DATABASE_URL` reference variable exactly as it is.
4. Keep the Railway pre-deploy command as `npx prisma migrate deploy`.
5. The new migration `20260909200000_auth` adds usernames and the Session table without deleting your existing inventory data.
6. When deployment succeeds, open your Railway public domain. You will be redirected to `/login`.
7. Because the previous starter database has no password-enabled user, the first screen will ask you to create the first administrator. Use a strong password of at least 8 characters.
8. After signing in, use **Setup** to edit existing products/manufacturers/suppliers/locations and **Users** to manage access.

Do not run `npm run db:seed` on a live database that contains real inventory. The seed command intentionally resets demo data.
