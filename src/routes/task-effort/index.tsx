import { useMemo, useState } from 'react'
import { estimateRLParams } from '../../lib/api'
import type { SessionData } from './types'
import { makeSession, step, type EffortConfig, getOffer } from './state'

export const route = { path: '/tasks/effort', label: 'Effort' } as const

function Stat({ label, value }: { label:string; value: React.ReactNode }) {
  return (
    <div className="card" style={{padding:'.6rem .9rem'}}>
      <div style={{fontSize:12,opacity:.7}}>{label}</div>
      <div style={{fontWeight:600}}>{value}</div>
    </div>
  )
}

export default function Page() {
  const cfg: EffortConfig = useMemo(() => ({ nTrials: 8 }), [])
  const [session, setSession] = useState<SessionData>(() => makeSession(cfg))
  const [offer, setOffer] = useState(() => getOffer(0))
  const finished = !!session.finishedAt
  const t = session.trials.length

  const wMid = (session.wLower + session.wUpper) / 2
  const conf = Math.max(0, 1 - Math.min(1, session.wUpper - session.wLower)) // crude confidence from interval width

  function choose(choice: 'EASY'|'HARD') {
    if (finished) return
    const { session: nextS, nextOffer } = step(session, choice, cfg)
    setSession(nextS)
    if (nextOffer) setOffer(nextOffer)
  }

  function reset() {
    const fresh = makeSession(cfg)
    setSession(fresh)
    setOffer(getOffer(0))
  }

  const params = finished ? estimateRLParams(session) : null

  return (
    <div className="grid">
      <section className="card">
        <h1>Effort Trade-off</h1>
        <p>
          Pick between <strong>Easy</strong> (low effort, low reward) and <strong>Hard</strong> (higher effort, higher reward).
          We estimate your current <em>effort-cost weight</em> <code>w_E</code>.
        </p>
        <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',marginTop:'.5rem'}}>
          <Stat label="Offer" value={`${t} / ${cfg.nTrials}`} />
          <Stat label="w<sub>Lower</sub>" value={session.wLower.toFixed(2)} />
          <Stat label="w<sub>Upper</sub>" value={session.wUpper.toFixed(2)} />
          <Stat label="ŵ (mid)" value={wMid.toFixed(2)} />
          <Stat label="Confidence" value={`${Math.round(conf*100)}%`} />
        </div>
      </section>

      {!finished && (
        <section className="card">
          <h2>Current offer</h2>
          <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div className="card">
              <h3>Easy</h3>
              <p>Reward: <strong>{offer.Re}</strong></p>
              <p>Effort: <strong>{offer.Ee}</strong></p>
              <button className="btn" onClick={() => choose('EASY')} aria-label="Choose Easy">Choose Easy</button>
            </div>
            <div className="card">
              <h3>Hard</h3>
              <p>Reward: <strong>{offer.Rh}</strong></p>
              <p>Effort: <strong>{offer.Eh}</strong></p>
              <button className="btn primary" onClick={() => choose('HARD')} aria-label="Choose Hard">Choose Hard</button>
            </div>
          </div>
          <p style={{opacity:.7, marginTop:'.5rem'}}>
            Indifference threshold for this offer: <code>w* = {(offer.wStar).toFixed(2)}</code>
          </p>
        </section>
      )}

      {t > 0 && (
        <section className="card">
          <h2>Recent choices</h2>
          <div style={{display:'grid', gridTemplateColumns:'auto auto auto auto auto auto', gap:'.5rem', fontSize:14}}>
            <div style={{opacity:.6}}>t</div>
            <div style={{opacity:.6}}>Re</div>
            <div style={{opacity:.6}}>Ee</div>
            <div style={{opacity:.6}}>Rh</div>
            <div style={{opacity:.6}}>Eh</div>
            <div style={{opacity:.6}}>choice</div>
            {session.trials.slice(-10).map(tr => (
              <div key={`row-${tr.t}`} style={{display:'contents'}}>
                <div>{tr.t + 1}</div>
                <div>{tr.Re}</div>
                <div>{tr.Ee}</div>
                <div>{tr.Rh}</div>
                <div>{tr.Eh}</div>
                <div>{tr.choice ?? '—'}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {finished && (
        <section className="card">
          <h2>Estimated effort-cost weight</h2>
          <p>
            Final interval: <code>[{session.wLower.toFixed(2)}, {session.wUpper.toFixed(2)}]</code>.
            Point estimate: <code>ŵ = {wMid.toFixed(2)}</code>.
          </p>
          {params && (
            <>
              <h3>RL params (stub)</h3>
              <ul>
                <li><strong>alphaPlus</strong>: {params.alphaPlus}</li>
                <li><strong>alphaMinus</strong>: {params.alphaMinus}</li>
                <li><strong>beta</strong>: {params.beta}</li>
                <li><strong>kappa</strong>: {params.kappa}</li>
              </ul>
            </>
          )}
          <div style={{display:'flex', gap:'.75rem', alignItems:'center', marginTop:'.5rem'}}>
            <button className="btn primary" onClick={reset}>Play again</button>
            <small style={{opacity:.7}}>Finished in {(session.finishedAt! - session.startedAt)/1000 || 0}s</small>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Notes</h2>
        <ul>
          <li>Utility model: choose Hard if <code>R_h - w_E·E_h &gt; R_e - w_E·E_e</code>.</li>
          <li>Each choice tightens bounds on <code>w_E</code> via <code>w*</code>.</li>
          <li>The confidence bar shrinks with the interval width.</li>
        </ul>
      </section>
    </div>
  )
}
