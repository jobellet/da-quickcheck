export type Resp = 'PRESS' | 'NONE'
export type Stim = 'GO' | 'NOGO'

export type Trial = {
  stim: Stim
  resp: Resp
  correct: 0 | 1
  reward: 0 | 1
  rt: number
}

export type SessionData = {
  task: 'gonogo-jspsych'
  trials: Trial[]
  totalReward: number
  startedAt: number
  finishedAt: number
  meta: {
    nTrials: number
    pGo: number
    rwdCorrect: number
    punIncorrect: number
  }
}
