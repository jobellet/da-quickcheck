import type { SessionData, Trial, FeedbackTiming } from './types'

export type DelayConfig = {
  nTrials: number            // total trials
  pDelayed: number           // probability of delayed feedback (rest immediate)
  fbDelayMs: number          // delay in ms for delayed feedback
  pRewardCorrect: number     // probability of reward when correct
}

function coin(p:number, rnd:()=>number=Math.random){ return rnd() < p }

export function makeSession(cfg: DelayConfig): SessionData {
  return {
    task: 'delay-credit',
    trials: [],
    startedAt: Date.now(),
    totalReward: 0,
    meta: { ...cfg }
  }
}

export function makeTrial(t:number, cfg: DelayConfig): Trial {
  const timing: FeedbackTiming = coin(cfg.pDelayed) ? 'DELAYED' : 'IMMEDIATE'
  const stim = coin(0.5) ? 1 : 0
  return { t, timing, stim, ts: Date.now() }
}

export function scoreTrial(tr: Trial, resp: 0|1, cfg: DelayConfig): Trial {
  const correct: 0|1 = (resp === tr.stim) ? 1 : 0
  const reward: 0|1 = correct && coin(cfg.pRewardCorrect) ? 1 : 0
  return { ...tr, resp, correct, reward }
}

export function applyFeedback(session: SessionData, idx: number): SessionData {
  const trials = session.trials.slice()
  const tr = trials[idx]
  if (!tr || tr.fbShown) return session
  trials[idx] = { ...tr, fbShown: true, fbTs: Date.now() }
  const totalReward = trials.reduce((s, x) => s + (x.reward ?? 0), 0)
  return { ...session, trials, totalReward }
}

export function dtdIndex(session: SessionData): number {
  // simple accuracy drop: acc_immediate - acc_delayed
  const imm = session.trials.filter(t => t.timing === 'IMMEDIATE' && t.correct != null)
  const del = session.trials.filter(t => t.timing === 'DELAYED' && t.correct != null)
  const accI = imm.length ? imm.reduce((s,t)=>s+(t.correct??0),0)/imm.length : 0
  const accD = del.length ? del.reduce((s,t)=>s+(t.correct??0),0)/del.length : 0
  return accI - accD
}
