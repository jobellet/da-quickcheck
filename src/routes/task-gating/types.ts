export type Cue = 'UPDATE' | 'IGNORE'

export type Step = {
  idx: number
  cue: Cue
  val: 0 | 1
}

export type MiniTrial = {
  t: number
  steps: Step[]             // sequence of cue–value pairs
  probeResp?: 0 | 1         // user response at probe
  correct?: 0 | 1           // correctness at probe
  wmTarget?: 0 | 1          // ground-truth WM after sequence
  // Diagnostics
  updateOps: number         // count of UPDATE cues
  ignoreOps: number         // count of IGNORE cues
  updateFailures: number    // times user final answer mismatched last UPDATE (proxy)
  ignoreIntrusions: number  // whether last IGNORE value wrongly appears to dominate (proxy)
}

export type SessionData = {
  task: 'wm-gating'
  trials: MiniTrial[]
  startedAt: number
  finishedAt?: number
  meta: { nTrials:number; seqLen:number; pUpdate:number }
}
