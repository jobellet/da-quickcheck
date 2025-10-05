import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { estimateRLParams } from '../../lib/api'
import { runJsPsych, type JsPsychRunResult } from '../../lib/jspsych'
import { createGoNoGoInitializer, N_TRIALS, P_GO, PUN_INCORRECT, RWD_CORRECT, type TrialDataPayload } from './experiment'
import type { SessionData, Trial } from './types'

export const route = { path: '/tasks/gonogo-jspsych', label: 'Go/NoGo (jsPsych)' } as const

const styles = `
.gonogo-jspsych-stage { display:flex; flex-direction:column; align-items:center; gap:1rem; padding:1.5rem 0; }
.gonogo-jspsych-cue { font-size:3rem; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; transition:opacity 0.2s ease; }
.gonogo-jspsych-cue--dim { opacity:0.25; }
.gonogo-jspsych-helper { font-size:0.85rem; max-width:360px; text-align:center; opacity:0.75; margin:0; }
.gonogo-jspsych-buttons { display:flex; gap:0.75rem; flex-wrap:wrap; justify-content:center; }
`

type Phase = 'intro' | 'running' | 'finished'

type Params = ReturnType<typeof estimateRLParams>

type TrialRow = Trial & { index: number }

function isTrialData(entry: Record<string, unknown>): entry is TrialDataPayload {
  if (!entry) return false
  const { cue, resp, correct, reward, rt } = entry as Partial<TrialDataPayload>
  const stimOk = cue === 'GO' || cue === 'NOGO'
  const respOk = resp === 'PRESS' || resp === 'NONE'
  return stimOk && respOk && typeof correct === 'number' && typeof reward === 'number' && typeof rt === 'number'
}

function makeSession(result: JsPsychRunResult): SessionData {
  const trials: Trial[] = result.data
    .filter((entry): entry is TrialDataPayload => isTrialData(entry))
    .map((entry) => ({
      stim: entry.cue,
      resp: entry.resp,
      correct: entry.correct ? 1 : 0,
      reward: entry.reward ? 1 : 0,
      rt: entry.rt,
    }))

  const totalReward = trials.reduce((acc, trial) => acc + trial.reward, 0)

  return {
    task: 'gonogo-jspsych',
    trials,
    totalReward,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    meta: {
      nTrials: N_TRIALS,
      pGo: P_GO,
      rwdCorrect: RWD_CORRECT,
      punIncorrect: PUN_INCORRECT,
    },
  }
}

export default function Page() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const cssLoadedRef = useRef(false)
  const aliveRef = useRef(true)

  const [phase, setPhase] = useState<Phase>('intro')
  const [isRunning, setIsRunning] = useState(false)
  const [session, setSession] = useState<SessionData | null>(null)
  const [params, setParams] = useState<Params | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      aliveRef.current = false
    }
  }, [])

  const accuracy = useMemo(() => {
    if (!session || session.trials.length === 0) return '—'
    const nCorrect = session.trials.filter((trial) => trial.correct === 1).length
    return `${Math.round((nCorrect / session.trials.length) * 100)}%`
  }, [session])

  const lastTrials: TrialRow[] = useMemo(() => {
    if (!session) return []
    return session.trials.map((trial, index) => ({ ...trial, index })).slice(-10)
  }, [session])

  const startExperiment = useCallback(async () => {
    if (isRunning) return
    const mount = mountRef.current
    if (!mount) {
      setError('Experiment container is missing.')
      return
    }

    setError(null)
    setSession(null)
    setParams(null)
    setPhase('running')
    setIsRunning(true)

    try {
      if (!cssLoadedRef.current) {
        await import('jspsych/css/jspsych.css')
        cssLoadedRef.current = true
      }

      const initializer = createGoNoGoInitializer()
      const result = await runJsPsych(initializer, mount, { taskName: 'gonogo-jspsych' })
      if (!aliveRef.current) return

      const sessionData = makeSession(result)
      setSession(sessionData)
      setParams(estimateRLParams(sessionData))
      setPhase('finished')
    } catch (err) {
      console.error(err)
      if (!aliveRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to run experiment.')
      setPhase('intro')
    } finally {
      if (aliveRef.current) {
        setIsRunning(false)
      }
    }
  }, [isRunning])

  const totalTrials = session?.trials.length ?? 0
  const totalCorrect = session?.trials.filter((trial) => trial.correct === 1).length ?? 0
  const finishedDuration = session ? (session.finishedAt - session.startedAt) / 1000 : null

  return (
    <div className="grid">
      <style>{styles}</style>
      <section className="card">
        <h1>Go/NoGo (jsPsych)</h1>
        <p>
          Press for <strong>GO</strong>, withhold for <strong>NOGO</strong>. The block runs {N_TRIALS} trials with
          p(GO) ≈ {Math.round(P_GO * 100)}%.
        </p>

        <div
          ref={mountRef}
          style={{
            minHeight: '220px',
            display: phase === 'running' ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />

        {phase === 'intro' && (
          <button className="btn primary" onClick={startExperiment} disabled={isRunning}>
            Start task
          </button>
        )}

        {phase === 'running' && (
          <p style={{ opacity: 0.75, marginTop: '0.75rem' }}>
            The task is running. Use <kbd>Space</kbd> for PRESS, <kbd>N</kbd> for NO PRESS, or click the buttons.
          </p>
        )}

        {phase === 'finished' && session && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', alignItems: 'center' }}>
            <span className="badge">Trials: {totalTrials}</span>
            <span className="badge">Correct: {totalCorrect}</span>
            <span className="badge">Reward: {session.totalReward}</span>
            {finishedDuration != null && <span className="badge">Duration: {finishedDuration.toFixed(1)}s</span>}
            <button className="btn" onClick={startExperiment} disabled={isRunning}>
              Run again
            </button>
          </div>
        )}

        {error && (
          <p role="alert" style={{ color: 'var(--danger, #c00)', marginTop: '0.75rem' }}>
            {error}
          </p>
        )}
      </section>

      {session && (
        <section className="card">
          <h2>Results</h2>
          <p>
            Accuracy: <strong>{accuracy}</strong>. Total reward: <strong>{session.totalReward}</strong>.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', opacity: 0.7 }}>
                  <th style={{ padding: '0.25rem 0.5rem' }}>#</th>
                  <th style={{ padding: '0.25rem 0.5rem' }}>Stim</th>
                  <th style={{ padding: '0.25rem 0.5rem' }}>Resp</th>
                  <th style={{ padding: '0.25rem 0.5rem' }}>Correct</th>
                  <th style={{ padding: '0.25rem 0.5rem' }}>Reward</th>
                  <th style={{ padding: '0.25rem 0.5rem' }}>RT (ms)</th>
                </tr>
              </thead>
              <tbody>
                {lastTrials.map((trial) => (
                  <tr key={trial.index} style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <td style={{ padding: '0.25rem 0.5rem' }}>{trial.index + 1}</td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>{trial.stim}</td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>{trial.resp}</td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>{trial.correct}</td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>{trial.reward}</td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>{trial.rt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {session && params && (
        <section className="card">
          <h2>Estimated parameters (stubbed)</h2>
          <p>
            Values are generated via <code>estimateRLParams(session)</code>. Real MLE integration will land later.
          </p>
          <ul>
            <li>
              <strong>alphaPlus</strong>: {params.alphaPlus}
            </li>
            <li>
              <strong>alphaMinus</strong>: {params.alphaMinus}
            </li>
            <li>
              <strong>beta</strong>: {params.beta}
            </li>
            <li>
              <strong>kappa</strong>: {params.kappa}
            </li>
          </ul>
        </section>
      )}
    </div>
  )
}
