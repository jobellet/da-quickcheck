export type FeedbackTiming = 'IMMEDIATE' | 'DELAYED'

export type Trial = {
  t: number
  timing: FeedbackTiming
  stim: number           // 0/1 category for a trivial discrimination
  resp?: 0 | 1
  correct?: 0 | 1
  reward?: 0 | 1
  fbShown?: boolean
  fbTs?: number
  ts: number
}

export type SessionData = {
  task: 'delay-credit'
  trials: Trial[]
  startedAt: number
  finishedAt?: number
  totalReward: number
  meta: { nTrials:number; pDelayed:number; fbDelayMs:number; pRewardCorrect:number }
}
