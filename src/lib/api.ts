import type { RLParams, StateDials, Tip } from './types'

// Keep these signatures stable; later PRs will only change the bodies to call real implementations.
export function estimateRLParams(_sessionData: unknown): RLParams {
  return { alphaPlus: 0.2, alphaMinus: 0.1, beta: 2.0, kappa: 0.1 } // stub
}

export function estimateStateDials(_rl: RLParams): StateDials {
  return { DA_t: 0.5, DA_phi: 0.5, DTD: 0.3, effortW: 0.4, gatingNoise: 0.3 } // stub
}

export function getTips(_dials: StateDials): Tip[] {
  return [
    { id:'one-bite', title:'One-bite start', body:'Do 2 minutes, then reassess.',
      reason:'effort high', confidence:0.6 }
  ]
}

export function chooseNextTrial(_context: unknown): { task:string; kind:string } {
  return { task:'bandit', kind:'standard' } // stub
}
