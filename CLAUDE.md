# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ayraç** — a minimal, Turkish-language reading journal app (Expo / React Native). All user-facing copy and most code comments are in Turkish; follow that convention. Brand identity, design principles, and anti-references live in `PRODUCT.md` (short version: Sakin · Kişisel · Zarif — quiet design, no gamification noise, Fraunces serif as the brand voice, dark mode is the default). `ROADMAP.md` is the prioritized task list; mark items `[x]` when completed and log finished work there.

## Commands

- `npx expo start` — dev server (`--ios` / `--android` / `--web` variants via npm scripts)
- `npm run lint` — ESLint (flat config, `eslint-config-expo`)
- No test framework is configured.

## Architecture

Expo SDK 54, expo-router file-based routing, React 19 / RN 0.81, TypeScript with `@/` path alias to the repo root.

**No backend, no real auth.** All state persists to AsyncStorage under `@ayrac_*` keys. Data migrations are one-time, guarded by flag keys (e.g. `@ayrac_rating_v2` for the 5-star→10-point migration, `@ayrac_author_norm_v1` for author-name cleanup) — see `context/BooksContext.tsx` for the pattern. When changing stored data shapes, add a new flag-guarded migration rather than breaking existing installs.

**Routing flow** (`app/`): `index` → `splash` (shows a random literary quote from `data/quotes.json` via `utils/quotes.ts`, then routes based on onboarding state) → `(onboarding)` or `(app)/(main)/library`. `(app)` stacks modal screens: `add-book`, `edit-book` (modals), `reading-mode`, `share-book` (full-screen modals). The `(auth)` group exists but the product is deliberately auth-less.

**Providers** (nested in `app/_layout.tsx`): `ThemeProvider` → `BooksProvider` → `GoalProvider` → `ProProvider`.

- `BooksContext` — core domain: `Book` (status: `reading | finished | want`; `finishedAt` is stamped when a book transitions to finished and cleared when it leaves that status; `rating` is 0–10 in 0.5 steps) and `ReadingSession` records from reading mode.
- `ProContext` — fake Pro subscription + paywall modal. Gate features by calling `showPaywall(trigger)` with a `PaywallTrigger`; add new trigger copy to `TRIGGER_COPY`. `toggleProForDev` switches Free/Pro in `__DEV__` only.
- `ThemeContext` — exposes tokens as `t`; components style with `t.fg`, `t.surface`, etc. from `constants/tokens.ts`. Never hard-code colors; add tokens there if needed. Fonts come from the `fonts` export (Fraunces serif variants).

**Conventions**

- Touch targets ≥ 44×44pt; interactive elements get `accessibilityLabel`/`accessibilityRole`.
- Haptics (`expo-haptics`) accompany meaningful interactions; `ScalePressable` is the standard pressable with press-scale feedback.
- Book metadata comes from Open Library search (with Google Books thumbnail fallback for covers); author strings are normalized via `utils/authorName.ts`.
