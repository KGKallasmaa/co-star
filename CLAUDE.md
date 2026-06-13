# Co-Star for Founders

An AI coach-council for founders. A room of advisors with distinct points of view:
talk to one, summon the council to debate, or let it auto-pick the right voice.
**Coaching, not professional advice.**

## Run & Operate

- `make demo` — install + run API server and Expo dev server together (scan the QR with Expo Go). The judge path.
- `make api` — API server only (port 5000)
- `make mobile` — Expo dev server only (prints the QR code)
- `pnpm install` — install the whole monorepo
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build everything
- Requires **Node.js 24** + **pnpm**. Full AI depends on backend API keys set as env vars on the server — Replit (press Run) is the path that has these.

## Where things live

This is a pnpm monorepo. The product is `artifacts/mobile`.

```
artifacts/
  mobile/         # the Expo (React Native) app  ← the product
    app/          # screens & routing (expo-router): (onboarding)/, (tabs)/
    components/   # reusable UI (LogoStar, HomeScreen, avatars, …)
    constants/    # advisor definitions, colors, example prompts
    hooks/        # theming + shared hooks
  api-server/     # Express 5 API the advisors talk to (@anthropic-ai/sdk)
  mockup-sandbox/ # internal component preview (not part of the demo)
lib/              # shared libraries (API client, db, zod, etc.)
scripts/          # workspace scripts
```

## Stack

- Expo SDK 54, React Native 0.81, expo-router, TypeScript 5.9
- API: Express 5, Anthropic SDK, Drizzle ORM + PostgreSQL, Zod
- Payments: Stripe (+ stripe-replit-sync), RevenueCat
- Monorepo: pnpm workspaces, Node.js 24

## Gotchas

- Use **pnpm**, not npm/yarn — a preinstall hook enforces it.
- Onboarding runs once per install. Reset by clearing the app's data in Expo Go.
- The mobile `dev` script reads Replit env vars (`REPLIT_EXPO_DEV_DOMAIN`, etc.) for tunneling — local runs without them still work over LAN.
- Selecting an advisor re-themes the whole UI to their color.
