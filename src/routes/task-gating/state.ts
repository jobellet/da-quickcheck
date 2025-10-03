import type { Cue, MiniTrial, SessionData, Step } from './types'

export type GatingConfig = {
  nTrials: number     // number of mini-trials
  seqLen: number      // number of cue–value steps per mini-trial
  pUpdate: number     // probability a given step is UPDATE vs IGNORE
}

function coin(p:number, rnd:()=>number=Math.random){ return rnd() < p }
function bit(rnd:()=>number=Math.random): 0|1 { return coin(0.5, rnd) ? 1 : 0 }

export function makeSession(cfg: GatingConfig): SessionData {
  return {
    task: 'wm-gating',
    trials: [],
    startedAt: Date.now(),
    meta: { ...cfg }
  }
}

// Build a sequence where at least one UPDATE occurs to define a WM target.
export function makeMiniTrial(t: number, cfg: GatingConfig): MiniTrial {
  const steps: Step[] = []
  let hasUpdate = false
  for (let i=0; i<cfg.seqLen; i++) {
    const cue: Cue = coin(cfg.pUpdate) ? 'UPDATE' : 'IGNORE'
    const val = bit()
    if (cue === 'UPDATE') hasUpdate = true
    steps.push({ idx: i, cue, val })
  }
  if (!hasUpdate) {
    // Guarantee at least one UPDATE by forcing the last step to UPDATE
    const last = steps[steps.length - 1]
    steps[steps.length - 1] = { ...last, cue: 'UPDATE' }
  }
  return {
    t, steps,
    updateOps: steps.filter(s => s.cue === 'UPDATE').length,
    ignoreOps: steps.filter(s => s.cue === 'IGNORE').length,
    updateFailures: 0,
    ignoreIntrusions: 0
  }
}

// Compute the ground-truth WM after the sequence (last UPDATE value).
export function computeWmTarget(steps: Step[]): 0|1 {
  let wm: 0|1 = 0
  let seen = false
  for (const s of steps) {
    if (s.cue === 'UPDATE') { wm = s.val; seen = true }
  }
  if (!seen) wm = steps[steps.length-1].val // fallback (shouldn’t happen due to fix above)
  return wm
}

export function scoreMiniTrial(mt: MiniTrial, resp: 0|1): MiniTrial {
  const wmTarget = computeWmTarget(mt.steps)
  const correct: 0|1 = resp === wmTarget ? 1 : 0
  // Diagnostics:
  // - update failure: final answer != last UPDATE
  const updateFailures = correct ? 0 : 1
  // - ignore intrusion: treat as 1 if the last step was IGNORE and its val == resp but != wmTarget
  const last = mt.steps[mt.steps.length - 1]
  const ignoreIntrusions = (!correct && last.cue === 'IGNORE' && resp === last.val && last.val !== wmTarget) ? 1 : 0

  return {
    ...mt,
    probeResp: resp,
    correct,
    wmTarget,
    updateFailures,
    ignoreIntrusions,
  }
}

// Aggregate metrics
export function aggregate(session: SessionData) {
  const n = session.trials.length || 1
  const acc = session.trials.reduce((s, t) => s + (t.correct ?? 0), 0) / n
  const updFail = session.trials.reduce((s, t) => s + (t.updateFailures ?? 0), 0) / n
  const ignIntr = session.trials.reduce((s, t) => s + (t.ignoreIntrusions ?? 0), 0) / n
  const gatingNoise = (updFail + ignIntr) / 2
  return { acc, updFail, ignIntr, gatingNoise }
}
