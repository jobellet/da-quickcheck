export type Arm = 'A' | 'B'

export type Trial = {
  t: number
  choice: Arm
  reward: 0 | 1
  pA: number
  pB: number
  ts: number
}

export type SessionData = {
  task: 'bandit'
  trials: Trial[]
  totalReward: number
  startedAt: number
  finishedAt?: number
  // optional metadata for future reversals/adaptive variants
  meta?: Record<string, unknown>
}
