import type { Arm, Trial, SessionData } from './types'

export type BanditConfig = {
  nTrials: number
  pA: number
  pB: number
}

export function bernoulli(p: number, rnd: () => number = Math.random): 0 | 1 {
  return rnd() < p ? 1 : 0
}

export function makeSession(cfg: BanditConfig): SessionData {
  return {
    task: 'bandit',
    trials: [],
    totalReward: 0,
    startedAt: Date.now(),
    meta: { ...cfg }
  }
}

export function stepSession(
  session: SessionData,
  choice: Arm,
  cfg: BanditConfig,
  rnd: () => number = Math.random
): SessionData {
  const { pA, pB } = cfg
  const reward = choice === 'A' ? bernoulli(pA, rnd) : bernoulli(pB, rnd)
  const t = session.trials.length
  const trial: Trial = {
    t,
    choice,
    reward,
    pA,
    pB,
    ts: Date.now()
  }
  const trials = [...session.trials, trial]
  const totalReward = session.totalReward + reward
  return { ...session, trials, totalReward }
}
