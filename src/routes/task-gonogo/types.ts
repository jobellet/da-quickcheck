export type Stim = 'GO' | 'NOGO'
export type Resp = 'PRESS' | 'NONE'

export type Trial = {
  t: number
  stim: Stim
  resp: Resp
  correct: 0 | 1
  reward: 0 | 1
  ts: number
}

export type SessionData = {
  task: 'gonogo'
  trials: Trial[]
  totalReward: number
  startedAt: number
  finishedAt?: number
  meta?: { nTrials:number; pGo:number; rwdCorrect:number; punIncorrect:number }
}
