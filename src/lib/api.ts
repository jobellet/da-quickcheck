import type { RLParams, StateDials, Tip } from './types'
import { fitRL_MLE } from './rl/mle'

// Keep these signatures stable; later PRs may improve internals only.
export function estimateRLParams(_sessionData: unknown): RLParams {
  try {
    const p = fitRL_MLE(_sessionData)
    // Map to RLParams (same names)
    return {
      alphaPlus: p.alphaPlus,
      alphaMinus: p.alphaMinus,
      beta: p.beta,
      kappa: p.kappa
    }
  } catch {
    // Safe fallback on any parsing/fit issue
    return { alphaPlus: 0.2, alphaMinus: 0.1, beta: 2.0, kappa: 0.1 }
  }
}

// For now keep the simple stubs below; separate PRs will improve these.
export function estimateStateDials(_rl: RLParams): StateDials {
  return { DA_t: 0.5, DA_phi: 0.5, DTD: 0.3, effortW: 0.4, gatingNoise: 0.3 }
}

export function getTips(_dials: StateDials): Tip[] {
  return [
    { id:'one-bite', title:'One-bite start', body:'Do 2 minutes, then reassess.',
      reason:'effort high', confidence:0.6 }
  ]
}

export function chooseNextTrial(_context: unknown): { task:string; kind:string } {
  return { task:'bandit', kind:'standard' }
}
