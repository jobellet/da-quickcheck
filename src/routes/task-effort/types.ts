export type Choice = 'EASY' | 'HARD'

export type Offer = {
  t: number
  Re: number   // reward easy
  Ee: number   // effort easy
  Rh: number   // reward hard
  Eh: number   // effort hard
  wStar: number // (Rh - Re) / (Eh - Ee)  (indifference threshold)
}

export type Trial = Offer & {
  choice?: Choice
}

export type SessionData = {
  task: 'effort'
  trials: Trial[]
  startedAt: number
  finishedAt?: number
  // running interval for w_E (lower/upper bounds consistent with observed choices)
  wLower: number
  wUpper: number
  meta: { nTrials:number }
}
