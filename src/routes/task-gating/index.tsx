import { useMemo, useState } from 'react'
import { estimateRLParams } from '../../lib/api'
import type { MiniTrial, SessionData } from './types'
import { makeSession, makeMiniTrial, scoreMiniTrial, aggregate, type GatingConfig } from './state'

export const route = { path: '/tasks/gating', label: 'WM Gating' } as const

function Stat({ label, value }: { label:string; value: React.ReactNode }) {
  return (
    <div className="card" style={{padding:'.6rem .9rem'}}>
      <div style={{fontSize:12,opacity:.7}}>{label}</div>
      <div style={{fontWeight:600}}>{value}</div>
    </div>
  )
}

function StepView({ mt }: { mt: MiniTrial }) {
  return (
    <div className="card" style={{display:'grid', gridTemplateColumns:'auto auto auto', gap:'.5rem'}}>
      <div style={{opacity:.7}}>idx</div>
      <div style={{opacity:.7}}>cue</div>
      <div style={{opacity:.7}}>val</div>
      {mt.steps.map(s => (
        <div key={`row-${s.idx}`} style={{display:'contents'}}>
          <div>{s.idx+1}</div>
          <div>{s.cue === 'UPDATE' ? '⭐ UPDATE' : '• IGNORE'}</div>
          <div>{s.val}</div>
        </div>
      ))}
    </div>
  )
}

export default function Page() {
  const cfg: GatingConfig = useMemo(() => ({
    nTrials: 12,
    seqLen: 4,
    pUpdate: 0.5
  }), [])

  const [session, setSession] = useState<SessionData>(() => makeSession(cfg))
  const [current, setCurrent] = useState<MiniTrial>(() => makeMiniTrial(0, cfg))
  const [finished, setFinished] = useState(false)

  const t = session.trials.length
  const { acc, updFail, ignIntr, gatingNoise } = aggregate(session)

  function answer(resp: 0|1) {
    if (finished) return
    const scored = scoreMiniTrial(current, resp)
    const nextSession: SessionData = { ...session, trials: [...session.trials, scored] }
    const nextT = scored.t + 1
    if (nextT >= cfg.nTrials) {
      nextSession.finishedAt = Date.now()
      setSession(nextSession)
      setFinished(true)
    } else {
      setSession(nextSession)
      setCurrent(makeMiniTrial(nextT, cfg))
    }
  }

  function nextSequence() {
    // convenience: skip answering and force incorrect (rarely used; we keep UI simple)
    answer( (Math.random() < 0.5 ? 0 : 1) as 0|1 )
  }

  function reset() {
    const fresh = makeSession(cfg)
    setSession(fresh)
    setCurrent(makeMiniTrial(0, cfg))
    setFinished(false)
  }

  const params = finished ? estimateRLParams(session) : null

  return (
    <div className="grid">
      <section className="card">
        <h1>WM Update vs Ignore</h1>
        <p>
          Read the sequence: ⭐ means <strong>UPDATE WM</strong> to the shown value;<br/>
          • means <strong>IGNORE</strong> (distractor). After the sequence, answer which value is held in WM.
        </p>
        <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',marginTop:'.5rem'}}>
          <Stat label="Mini-trial" value={`${t} / ${cfg.nTrials}`} />
          <Stat label="Accuracy" value={`${Math.round(acc*100)}%`} />
          <Stat label="Update failure" value={`${Math.round(updFail*100)}%`} />
          <Stat label="Ignore intrusion" value={`${Math.round(ignIntr*100)}%`} />
          <Stat label="Gating Noise Index" value={gatingNoise.toFixed(2)} />
        </div>
      </section>

      <StepView mt={current} />

      {!finished ? (
        <section className="card">
          <h2>Probe</h2>
          <p>Which value is currently in WM?</p>
          <div style={{display:'flex', gap:'1rem'}}>
            <button className="btn primary" onClick={() => answer(0)} aria-label="Answer 0">Answer 0</button>
            <button className="btn" onClick={() => answer(1)} aria-label="Answer 1">Answer 1</button>
          </div>
          <p style={{opacity:.7, marginTop:'.5rem'}}>Or <button className="btn" onClick={nextSequence}>skip (random)</button> to move on.</p>
        </section>
      ) : (
        <section className="card" style={{display:'flex', gap:'.75rem', alignItems:'center'}}>
          <button className="btn primary" onClick={reset}>Play again</button>
          <small style={{opacity:.7}}>Finished in {(session.finishedAt! - session.startedAt)/1000}s</small>
        </section>
      )}

      {t > 0 && (
        <section className="card">
          <h2>Recent mini-trials</h2>
          <div style={{display:'grid', gridTemplateColumns:'auto auto auto auto auto', gap:'.5rem', fontSize:14}}>
            <div style={{opacity:.6}}>t</div>
            <div style={{opacity:.6}}>seqLen</div>
            <div style={{opacity:.6}}>updOps</div>
            <div style={{opacity:.6}}>ignOps</div>
            <div style={{opacity:.6}}>correct</div>
            {session.trials.slice(-10).map(mt => (
              <div key={`row-${mt.t}`} style={{display:'contents'}}>
                <div>{mt.t + 1}</div>
                <div>{mt.steps.length}</div>
                <div>{mt.updateOps}</div>
                <div>{mt.ignoreOps}</div>
                <div>{mt.correct ?? '—'}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {finished && params && (
        <section className="card">
          <h2>Estimated RL parameters (stub)</h2>
          <p>From <code>estimateRLParams(session)</code>. Real MLE will arrive in a later PR.</p>
          <ul>
            <li><strong>alphaPlus</strong>: {params.alphaPlus}</li>
            <li><strong>alphaMinus</strong>: {params.alphaMinus}</li>
            <li><strong>beta</strong>: {params.beta}</li>
            <li><strong>kappa</strong>: {params.kappa}</li>
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Notes</h2>
        <ul>
          <li>Self-contained route; auto-registers via discovery.</li>
          <li><strong>Gating Noise Index</strong> = mean(Update failure, Ignore intrusion).</li>
          <li>Later we can add timing pressure and distractor salience.</li>
        </ul>
      </section>
    </div>
  )
}
