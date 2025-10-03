import type { Offer, SessionData, Trial } from './types'

export type EffortConfig = {
  nTrials: number
}

// A small, hand-crafted offer set that quickly tightens bounds on w.
// Units: reward in arbitrary points, effort in "units" (subjective).
const OFFER_SET: Array<Omit<Offer, 't'>> = [
  { Re: 1, Ee: 1, Rh: 2, Eh: 3, wStar: (2-1)/(3-1) }, // 0.5
  { Re: 1, Ee: 1, Rh: 3, Eh: 4, wStar: (3-1)/(4-1) }, // 0.67
  { Re: 1, Ee: 1, Rh: 2, Eh: 4, wStar: (2-1)/(4-1) }, // 0.33
  { Re: 1, Ee: 1, Rh: 3, Eh: 5, wStar: (3-1)/(5-1) }, // 0.5
  { Re: 1, Ee: 1, Rh: 4, Eh: 5, wStar: (4-1)/(5-1) }, // 0.75
  { Re: 1, Ee: 1, Rh: 2.5, Eh: 3, wStar: (2.5-1)/(3-1) }, // 0.75
  { Re: 1, Ee: 1, Rh: 2, Eh: 5, wStar: (2-1)/(5-1) }, // 0.25
  { Re: 1, Ee: 1, Rh: 3.5, Eh: 4, wStar: (3.5-1)/(4-1) }, // 0.83
]

export function makeSession(cfg: EffortConfig): SessionData {
  return {
    task: 'effort',
    trials: [],
    startedAt: Date.now(),
    wLower: 0.0,
    wUpper: 2.0, // broad initial prior; typical w in [0,1], but allow >1
    meta: { nTrials: cfg.nTrials }
  }
}

export function getOffer(t: number): Offer {
  const base = OFFER_SET[t % OFFER_SET.length]
  return { t, ...base }
}

// Update interval bounds from one choice.
// If chose HARD: implies w < wStar (utility_hard > utility_easy)
// If chose EASY: implies w > wStar
export function updateBounds(wLower: number, wUpper: number, wStar: number, choice: 'EASY' | 'HARD') {
  if (choice === 'HARD') {
    return { wLower, wUpper: Math.min(wUpper, wStar) }
  } else {
    return { wLower: Math.max(wLower, wStar), wUpper }
  }
}

// Apply a choice to the session; returns updated session and next offer (or null if done)
export function step(session: SessionData, choice: 'EASY'|'HARD', cfg: EffortConfig) {
  const t = session.trials.length
  const current = getOffer(t)
  const { wLower, wUpper } = updateBounds(session.wLower, session.wUpper, current.wStar, choice)

  const trial: Trial = { ...current, choice }
  const trials = [...session.trials, trial]
  const nextT = t + 1
  let finishedAt: number | undefined
  let nextOffer: Offer | null = null
  if (nextT >= cfg.nTrials) {
    finishedAt = Date.now()
  } else {
    nextOffer = getOffer(nextT)
  }
  const updated: SessionData = { ...session, trials, wLower, wUpper, finishedAt }
  return { session: updated, nextOffer }
}
