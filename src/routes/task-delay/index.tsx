import { useEffect, useMemo, useRef, useState } from 'react'
import { estimateRLParams } from '../../lib/api'
import type { SessionData, Trial } from './types'
import { makeSession, makeTrial, scoreTrial, applyFeedback, type DelayConfig, dtdIndex } from './state'

export const route = { path: '/tasks/delay', label: 'Delay Credit' } as const

function Stat({ label, value }: { label:string; value: React.ReactNode }) {
  return (
    <div className="card" style={{padding:'.6rem .9rem'}}>
      <div style={{fontSize:12,opacity:.7}}>{label}</div>
      <div style={{fontWeight:600}}>{value}</div>
    </div>
  )
}

export default function Page() {
  const cfg: DelayConfig = useMemo(() => ({
    nTrials: 24,
    pDelayed: 0.5,
    fbDelayMs: 1500,
    pRewardCorrect: 0.9
  }), [])

  const [session, setSession] = useState<SessionData>(() => makeSession(cfg))
  const [finished, setFinished] = useState(false)
  const [current, setCurrent] = useState<Trial>(() => makeTrial(0, cfg))
  const timerRef = useRef<number | null>(null)

  const t = session.trials.length
  const nI = session.trials.filter(tr => tr.timing === 'IMMEDIATE').length
  const nD = session.trials.filter(tr => tr.timing === 'DELAYED').length
  const accI = (() => {
    const xs = session.trials.filter(tr => tr.timing === 'IMMEDIATE' && tr.correct != null)
    return xs.length ? Math.round(100 * xs.reduce((s,t)=>s+(t.correct??0),0)/xs.length) : 0
  })()
  const accD = (() => {
    const xs = session.trials.filter(tr => tr.timing === 'DELAYED' && tr.correct != null)
    return xs.length ? Math.round(100 * xs.reduce((s,t)=>s+(t.correct??0),0)/xs.length) : 0
  })()
  const dtd = dtdIndex(session)

  // cleanup feedback timers on unmount
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current) }, [])

  function respond(resp: 0|1) {
    if (finished) return
    // score current trial
    const scored = scoreTrial(current, resp, cfg)
    let nextSession: SessionData = { ...session, trials: [...session.trials, scored] }
    setSession(nextSession)

    // schedule or show feedback
    if (scored.timing === 'IMMEDIATE') {
      nextSession = applyFeedback(nextSession, scored.t)
      setSession(nextSession)
    } else {
      timerRef.current = window.setTimeout(() => {
        setSession(s => applyFeedback(s, scored.t))
      }, cfg.fbDelayMs) as unknown as number
    }

    // next trial or finish
    const nextT = scored.t + 1
    if (nextT >= cfg.nTrials) {
      nextSession.finishedAt = Date.now()
      setSession(nextSession)
      setFinished(true)
    } else {
      setCurrent(makeTrial(nextT, cfg))
    }
  }

  function reset() {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    const fresh = makeSession(cfg)
    setSession(fresh)
    setCurrent(makeTrial(0, cfg))
    setFinished(false)
  }

  const params = finished ? estimateRLParams(session) : null

  return (
    <div className="grid">
      <section className="card">
        <h1>Delay-Credit</h1>
        <p>
          Choose the category that matches the stimulus (0/1). Feedback is <strong>Immediate</strong> or <strong>Delayed</strong>.
          We compare accuracy to estimate a simple DTD index (delay-credit cost).
        </p>
        <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',marginTop:'.5rem'}}>
          <Stat label="Trial" value={`${t} / ${cfg.nTrials}`} />
          <Stat label="Immediate trials" value={nI} />
          <Stat label="Delayed trials" value={nD} />
          <Stat label="Acc (Immediate)" value={`${accI}%`} />
          <Stat label="Acc (Delayed)" value={`${accD}%`} />
          <Stat label="DTD index" value={dtd.toFixed(2)} />
          <Stat label="Total reward" value={session.totalReward} />
        </div>

        {!finished ? (
          <>
            <div className="card" style={{marginTop:'1rem', textAlign:'center'}}>
              <div style={{fontSize:14,opacity:.7}}>Stimulus</div>
              <div style={{fontSize:40, fontWeight:800}}>{current.stim}</div>
              <div style={{marginTop:'.5rem', fontSize:12, opacity:.7}}>
                Feedback: {current.timing === 'IMMEDIATE' ? 'Immediate' : `Delayed (${cfg.fbDelayMs} ms)`}
              </div>
            </div>
            <div style={{display:'flex', gap:'1rem', marginTop:'1rem'}}>
              <button className="btn primary" onClick={() => respond(0)} aria-label="Choose 0">Choose 0</button>
              <button className="btn" onClick={() => respond(1)} aria-label="Choose 1">Choose 1</button>
            </div>
          </>
        ) : (
          <div style={{display:'flex', gap:'.5rem', marginTop:'1rem', alignItems:'center'}}>
            <button className="btn primary" onClick={reset}>Play again</button>
            <small style={{opacity:.7}}>Finished in {(session.finishedAt! - session.startedAt)/1000}s</small>
          </div>
        )}
      </section>

      {t > 0 && (
        <section className="card">
          <h2>Recent trials</h2>
          <div style={{display:'grid', gridTemplateColumns:'auto auto auto auto auto auto', gap:'.5rem', fontSize:14}}>
            <div style={{opacity:.6}}>t</div>
            <div style={{opacity:.6}}>timing</div>
            <div style={{opacity:.6}}>stim</div>
            <div style={{opacity:.6}}>resp</div>
            <div style={{opacity:.6}}>correct</div>
            <div style={{opacity:.6}}>reward</div>
            {session.trials.slice(-10).map(tr => (
              <div key={`row-${tr.t}`} style={{display:'contents'}}>
                <div>{tr.t + 1}</div>
                <div>{tr.timing}</div>
                <div>{tr.stim}</div>
                <div>{tr.resp ?? '—'}</div>
                <div>{tr.correct ?? '—'}</div>
                <div>{tr.reward ?? '—'}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {finished && params && (
        <section className="card">
          <h2>Estimated RL parameters (stub)</h2>
          <p>From <code>estimateRLParams(session)</code>. Real MLE arrives in a later PR.</p>
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
          <li>Self-contained route; no shared-file edits.</li>
          <li><strong>DTD index</strong> = Acc(Immediate) − Acc(Delayed).</li>
          <li>Feedback delay is simulated; later we can add timers/animations.</li>
        </ul>
      </section>
    </div>
  )
}
