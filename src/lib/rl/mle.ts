// src/lib/rl/mle.ts
//
// Softmax RL with asymmetric learning rates (alphaPlus, alphaMinus),
// inverse temperature beta, and choice stickiness kappa.
// Provides a robust MLE that can digest our task session objects.
//
// Model (2 actions: 0/1):
//  Q[a] <- Q[a] + alpha_posneg * (r - Q[a])
//  P(a) = softmax( beta * Q[a] + kappa * I[a == prevAction] )
//
// We parse trial arrays from various routes. We try, in order:
//  - reward: tr.reward (0|1) if present
//  - else: tr.correct (0|1) if present (treated as reward)
// Actions are inferred from:
//  - Bandit: tr.choice 'A'|'B' -> 0/1
//  - Go/NoGo: resp 'PRESS'|'NONE' -> 1/0
//  - Delay: resp 0|1 -> 0/1 (if present)  (we ignore for MLE if no reward/correct)
//  - Gating/Effort: don't have reward consistently -> usually skipped, unless 'correct' exists
//
// If < 10 informative trials, we return defaults (same as previous stub).

export type TrialLike = {
  action?: number;     // 0 or 1
  reward?: number;     // 0 or 1
  // for parsing:
  choice?: any;
  resp?: any;
  correct?: any;
}

export type ParsedData = Array<{ a: 0|1; r: 0|1 }>

export type Params = {
  alphaPlus: number
  alphaMinus: number
  beta: number
  kappa: number
}

const DEFAULT_PARAMS: Params = { alphaPlus: 0.2, alphaMinus: 0.1, beta: 2.0, kappa: 0.1 }

const EPS = 1e-12

function clamp(x:number, lo:number, hi:number){ return Math.max(lo, Math.min(hi, x)) }

// --- Parsing ---

export function parseSessionToAR(session: any): ParsedData {
  const out: ParsedData = []
  if (!session || !Array.isArray(session.trials)) return out

  for (const tr of session.trials as TrialLike[]) {
    // Reward: prefer reward, else correct
    let r: number | undefined = undefined
    if (typeof (tr as any).reward !== 'undefined') {
      const rr = Number((tr as any).reward)
      if (rr === 0 || rr === 1) r = rr
    } else if (typeof (tr as any).correct !== 'undefined') {
      const cc = Number((tr as any).correct)
      if (cc === 0 || cc === 1) r = cc
    }

    // Action:
    let a: number | undefined = undefined

    if (typeof (tr as any).choice !== 'undefined') {
      const c = (tr as any).choice
      if (c === 'A') a = 0
      else if (c === 'B') a = 1
      else if (c === 0 || c === 1) a = c
    }

    if (typeof (tr as any).resp !== 'undefined' && a === undefined) {
      const rsp = (tr as any).resp
      if (rsp === 'NONE') a = 0
      else if (rsp === 'PRESS') a = 1
      else if (rsp === 0 || rsp === 1) a = rsp
    }

    // Some tasks may store response under 'probeResp'
    if (typeof (tr as any).probeResp !== 'undefined' && a === undefined) {
      const pr = Number((tr as any).probeResp)
      if (pr === 0 || pr === 1) a = pr
    }

    if (a !== undefined && r !== undefined) {
      out.push({ a: a as 0|1, r: r as 0|1 })
    }
  }
  return out
}

// --- Likelihood ---

function nllForParams(data: ParsedData, p: Params): number {
  // Initialize Q-values
  let Q0 = 0.0, Q1 = 0.0
  let prevA: 0|1 | null = null
  let nll = 0.0

  for (const { a, r } of data) {
    const b = clamp(p.beta, 0.01, 20)
    const k = clamp(p.kappa, 0, 5)

    const pref0 = b * Q0 + (prevA === 0 ? k : 0)
    const pref1 = b * Q1 + (prevA === 1 ? k : 0)

    // softmax
    const m = Math.max(pref0, pref1)
    const e0 = Math.exp(pref0 - m)
    const e1 = Math.exp(pref1 - m)
    const Z = e0 + e1
    const p0 = e0 / (Z + EPS)
    const p1 = e1 / (Z + EPS)
    const pa = (a === 0 ? p0 : p1)

    // accumulate NLL
    nll += -Math.log(pa + EPS)

    // TD update
    const Qa = (a === 0 ? Q0 : Q1)
    const delta = r - Qa
    const alpha = delta >= 0 ? clamp(p.alphaPlus, 0.001, 0.999) : clamp(p.alphaMinus, 0.001, 0.999)
    const QaNew = Qa + alpha * delta
    if (a === 0) Q0 = QaNew; else Q1 = QaNew

    prevA = a
  }
  return nll
}

// Coarse grid for robust init
function* gridValues(lo:number, hi:number, n:number){
  const step = (hi - lo) / (n - 1)
  for (let i=0; i<n; i++) yield lo + i*step
}

function coarseSearch(data: ParsedData): Params {
  let best = { ...DEFAULT_PARAMS }
  let bestNLL = Number.POSITIVE_INFINITY

  const alphaGrid = [0.05, 0.1, 0.2, 0.4, 0.6]
  const betaGrid = [0.5, 1, 2, 4, 8, 12]
  const kappaGrid = [0, 0.1, 0.5, 1, 2]

  for (const ap of alphaGrid) {
    for (const am of alphaGrid) {
      for (const b of betaGrid) {
        for (const k of kappaGrid) {
          const p = { alphaPlus: ap, alphaMinus: am, beta: b, kappa: k }
          const nll = nllForParams(data, p)
          if (nll < bestNLL) { bestNLL = nll; best = p }
        }
      }
    }
  }
  return best
}

// Simple pattern search (coordinate descent with shrinking step)
function polish(data: ParsedData, start: Params): Params {
  let p = { ...start }
  let best = nllForParams(data, p)

  // step sizes per parameter
  let step = { ap: 0.1, am: 0.1, b: 1.0, k: 0.5 }

  for (let iter=0; iter<40; iter++) {
    let improved = false

    const candidates: Params[] = []
    // alphaPlus
    candidates.push({ ...p, alphaPlus: clamp(p.alphaPlus + step.ap, 0.001, 0.999) })
    candidates.push({ ...p, alphaPlus: clamp(p.alphaPlus - step.ap, 0.001, 0.999) })
    // alphaMinus
    candidates.push({ ...p, alphaMinus: clamp(p.alphaMinus + step.am, 0.001, 0.999) })
    candidates.push({ ...p, alphaMinus: clamp(p.alphaMinus - step.am, 0.001, 0.999) })
    // beta
    candidates.push({ ...p, beta: clamp(p.beta + step.b, 0.01, 20) })
    candidates.push({ ...p, beta: clamp(p.beta - step.b, 0.01, 20) })
    // kappa
    candidates.push({ ...p, kappa: clamp(p.kappa + step.k, 0, 5) })
    candidates.push({ ...p, kappa: clamp(p.kappa - step.k, 0, 5) })

    for (const c of candidates) {
      const nll = nllForParams(data, c)
      if (nll + 1e-9 < best) {
        best = nll
        p = c
        improved = true
      }
    }

    if (!improved) {
      // shrink steps
      step.ap *= 0.5
      step.am *= 0.5
      step.b  *= 0.5
      step.k  *= 0.5
      if (step.ap < 1e-3 && step.b < 1e-2 && step.k < 1e-3) break
    }
  }
  return p
}

export function fitRL_MLE(session: any): Params {
  const data = parseSessionToAR(session)

  // Only keep datasets with at least 10 informative trials and both actions attempted at least once
  if (data.length < 10) return { ...DEFAULT_PARAMS }

  const acted0 = data.some(d => d.a === 0)
  const acted1 = data.some(d => d.a === 1)
  const hasVar = acted0 && acted1
  if (!hasVar) return { ...DEFAULT_PARAMS }

  const init = coarseSearch(data)
  const fit = polish(data, init)
  // sanity clamp
  return {
    alphaPlus: clamp(fit.alphaPlus, 0.001, 0.999),
    alphaMinus: clamp(fit.alphaMinus, 0.001, 0.999),
    beta: clamp(fit.beta, 0.01, 20),
    kappa: clamp(fit.kappa, 0, 5),
  }
}
