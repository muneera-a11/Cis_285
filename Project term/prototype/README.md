# SplitSmart prototype

A small shared expense tracker built with Next.js, React, TypeScript, Tailwind CSS, and SQLite. The local SQLite database is created automatically at `dev.db` when the app first handles a request. Set `DATABASE_URL` in `.env` to change its location; the default is `file:./dev.db`.

## Run locally

```bash
cd "Project term/prototype"
npm install
npm run dev
```

Open the URL printed by Next.js (normally http://localhost:3000). Create a group, add members, and record expenses. Data stays in SQLite across page refreshes and app restarts.

## Expense rules

- Amounts must be positive and have at most two decimal places.
- The payer and all selected participants must belong to the selected group.
- The expense is divided equally in integer cents. Remaining cents go to participants in sorted member ID order for a repeatable result.
- Balances show amounts owed to or owed by each person; the group total remains zero.

The Prisma model is in `prisma/schema.prisma`. The app initializes the same SQLite tables through the already-installed `better-sqlite3` driver.
