import type { SessionData, Stim, Resp, Trial } from './types'

export type GoNoGoConfig = {
  nTrials: number
  pGo: number          // probability of GO vs NOGO
  rwdCorrect: number   // reward probability for correct
  punIncorrect: number // punishment probability for incorrect (as 1-reward)
}

export function makeSession(cfg: GoNoGoConfig): SessionData {
  return {
    task: 'gonogo',
    trials: [],
    totalReward: 0,
    startedAt: Date.now(),
    meta: { ...cfg }
  }
}

function sampleStim(pGo:number, rnd:()=>number=Math.random): Stim {
  return rnd() < pGo ? 'GO' : 'NOGO'
}

export function stepTrial(
  session: SessionData,
  cfg: GoNoGoConfig,
  resp: Resp,
  stim: Stim
): SessionData {
  const correct = (stim === 'GO' && resp === 'PRESS') || (stim === 'NOGO' && resp === 'NONE') ? 1 : 0
  // reward model: correct gets reward with rwdCorrect; incorrect gets reward with (1 - punIncorrect)
  const base = correct ? cfg.rwdCorrect : (1 - cfg.punIncorrect)
  const reward: 0 | 1 = Math.random() < base ? 1 : 0
  const t = session.trials.length
  const trial: Trial = { t, stim, resp, correct, reward, ts: Date.now() }
  const trials = [...session.trials, trial]
  return { ...session, trials, totalReward: session.totalReward + reward }
}

export function nextStim(session: SessionData, cfg: GoNoGoConfig): Stim {
  return sampleStim(cfg.pGo)
}
