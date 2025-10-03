# DA QuickCheck

A 2–3 minute micro-battery that estimates RL/WM parameters and maps them to a simple “dopamine state” with immediate, ADHD-friendly tips. Ships as a static PWA-ready site on GitHub Pages.

## Stack
- Vite + React + TypeScript
- React Router (HashRouter)
- GitHub Pages via Actions

## Local Dev
```bash
npm install
npm run dev

Build

npm run build
npm run preview

Deploy

GitHub Actions workflow in .github/workflows/deploy.yml builds and deploys on pushes to main. Vite base is set to /da-quickcheck/ for Pages.

Auto-discovered routes

Any file at src/routes/**/index.tsx exporting:

export const route = { path: '/tasks/bandit', label: 'Bandit' } as const
export default function Page() { return <div/> }

is picked up automatically and appears in the nav (see src/routes/_auto.ts).

Roadmap & Milestones

1. MVP shell + router discovery (this PR)


2. Tasks (parallel PRs)

/tasks/bandit – Two-armed bandit (α, β, κ)

/tasks/gonogo – Go/NoGo asymmetry (α⁺ vs α⁻)

/tasks/delay – Delay-credit (DTD)

/tasks/gating – WM update vs ignore

/tasks/effort – Effort trade-off


3. Engines (parallel PRs)

RL MLE (src/lib/rl/mle.ts)

Scheduler (src/lib/scheduler/index.ts)

State dials mapping (src/lib/state/dials.ts)

Tip engine (src/lib/tips/*)


4. Check flow /check – orchestrates micro-battery


5. History /history – local summaries (IndexedDB/localStorage)


6. PWA (optional) – manifest + SW


7. Privacy/About – local-only default; opt-in research mode



Contributing

Do not change exported function signatures in src/lib/api.ts.

New tasks must live in their own folder under src/routes/… and export route.

Avoid editing shared files in parallel PRs.


---
