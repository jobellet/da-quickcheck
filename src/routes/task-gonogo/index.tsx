import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { estimateRLParams } from '../../lib/api'
import type { SessionData, Stim, Resp } from './types'
import { makeSession, nextStim, stepTrial, type GoNoGoConfig } from './state'

export const route = { path: '/tasks/gonogo', label: 'Go/NoGo' } as const

function Stat({ label, value }: { label:string; value: ReactNode }) {
  return (
    <div className="card" style={{padding:'.6rem .9rem'}}>
      <div style={{fontSize:12,opacity:.7}}>{label}</div>
      <div style={{fontWeight:600}}>{value}</div>
    </div>
  )
}

export default function Page() {
  const cfg: GoNoGoConfig = useMemo(() => ({
    nTrials: 30, pGo: 0.7, rwdCorrect: 0.9, punIncorrect: 0.9
  }), [])

  const [session, setSession] = useState<SessionData>(() => makeSession(cfg))
  const [stim, setStim] = useState<Stim>(() => nextStim(makeSession(cfg), cfg))
  const [finished, setFinished] = useState(false)

  const t = session.trials.length
  const nCorrect = session.trials.filter(tr => tr.correct === 1).length
  const acc = t ? (nCorrect / t * 100).toFixed(0) + '%' : '—'

  function respond(resp: Resp) {
    if (finished) return
    const after = stepTrial(session, cfg, resp, stim)
    const nextT = after.trials.length
    if (nextT >= cfg.nTrials) {
      after.finishedAt = Date.now()
      setSession(after)
      setFinished(true)
    } else {
      setSession(after)
      setStim(nextStim(after, cfg))
    }
  }

  function reset() {
    const fresh = makeSession(cfg)
    setSession(fresh)
    setStim(nextStim(fresh, cfg))
    setFinished(false)
  }

  const params = finished ? estimateRLParams(session) : null

  return (
    <div className="grid">
      <section className="card">
        <h1>Go/NoGo</h1>
        <p>Press for <strong>GO</strong>. Do not press for <strong>NOGO</strong>. {cfg.nTrials} trials.</p>
        <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',marginTop:'.5rem'}}>
          <Stat label="Trial" value={`${t} / ${cfg.nTrials}`} />
          <Stat label="Total reward" value={session.totalReward} />
          <Stat label="Accuracy" value={acc} />
        </div>

        {!finished ? (
          <>
            <div className="card" style={{marginTop:'1rem', textAlign:'center'}}>
              <div style={{fontSize:14,opacity:.7}}>Current cue</div>
              <div style={{fontSize:32, fontWeight:800, letterSpacing:1}}>{stim}</div>
            </div>
            <div style={{display:'flex', gap:'1rem', marginTop:'1rem'}}>
              <button className="btn primary" onClick={() => respond('PRESS')} aria-label="Press">PRESS</button>
              <button className="btn" onClick={() => respond('NONE')} aria-label="Withhold">NO PRESS</button>
            </div>
            <p style={{opacity:.7,marginTop:'.5rem'}}>Keyboard: <kbd>Space</kbd>=PRESS, <kbd>N</kbd>=NO PRESS (optional to add later).</p>
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
          <div style={{display:'grid', gridTemplateColumns:'auto auto auto auto auto', gap:'.5rem', fontSize:14}}>
            <div style={{opacity:.6}}>t</div>
            <div style={{opacity:.6}}>stim</div>
            <div style={{opacity:.6}}>resp</div>
            <div style={{opacity:.6}}>correct</div>
            <div style={{opacity:.6}}>reward</div>
            {session.trials.slice(-10).map(tr => (
              <Fragment key={tr.t}>
                <div>{tr.t + 1}</div>
                <div>{tr.stim}</div>
                <div>{tr.resp}</div>
                <div>{tr.correct}</div>
                <div>{tr.reward}</div>
              </Fragment>
            ))}
          </div>
        </section>
      )}

      {finished && params && (
        <section className="card">
          <h2>Estimated parameters (stubbed)</h2>
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
          <li>Self-contained route; no shared-file edits.</li>
          <li>Auto-registers via route discovery.</li>
          <li>Reward/punishment probabilities are configurable in <code>meta</code>.</li>
        </ul>
      </section>
    </div>
  )
}
