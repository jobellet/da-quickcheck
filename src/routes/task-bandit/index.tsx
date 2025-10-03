import { useMemo, useState } from 'react'
import type { SessionData } from './types'
import { makeSession, stepSession, type BanditConfig } from './state'
import { estimateRLParams } from '../../lib/api'

export const route = { path: '/tasks/bandit', label: 'Bandit' } as const

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card" style={{padding:'.75rem 1rem'}}>
      <div style={{fontSize:12, opacity:.7}}>{label}</div>
      <div style={{fontWeight:600}}>{value}</div>
    </div>
  )
}

export default function Page() {
  // fixed minimal config; later variants can randomize/reverse via meta
  const cfg: BanditConfig = useMemo(() => ({ nTrials: 20, pA: 0.7, pB: 0.3 }), [])
  const [session, setSession] = useState<SessionData>(() => makeSession(cfg))
  const [finished, setFinished] = useState(false)
  const t = session.trials.length

  const nA = session.trials.filter(tr => tr.choice === 'A').length
  const nB = t - nA
  const rA = session.trials.filter(tr => tr.choice === 'A' && tr.reward === 1).length
  const rB = session.trials.filter(tr => tr.choice === 'B' && tr.reward === 1).length

  function act(choice: 'A' | 'B') {
    if (finished) return
    const next = stepSession(session, choice, cfg)
    const nextT = next.trials.length
    if (nextT >= cfg.nTrials) {
      next.finishedAt = Date.now()
      setSession(next)
      setFinished(true)
    } else {
      setSession(next)
    }
  }

  function reset() {
    setSession(makeSession(cfg))
    setFinished(false)
  }

  const params = finished ? estimateRLParams(session) : null

  return (
    <div className="grid">
      <section className="card">
        <h1>Two-Armed Bandit</h1>
        <p>Choose A or B for {cfg.nTrials} trials. Rewards are probabilistic.</p>
        <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap', marginTop:'.5rem'}}>
          <Stat label="Trial" value={`${t} / ${cfg.nTrials}`} />
          <Stat label="Total reward" value={session.totalReward} />
          <Stat label="Choices A/B" value={`${nA} / ${nB}`} />
          <Stat label="Rewards A/B" value={`${rA} / ${rB}`} />
        </div>

        {!finished ? (
          <div style={{display:'flex', gap:'1rem', marginTop:'1rem'}}>
            <button className="btn primary" onClick={() => act('A')} aria-label="Choose A">Choose A</button>
            <button className="btn" onClick={() => act('B')} aria-label="Choose B">Choose B</button>
          </div>
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
            <div style={{opacity:.6}}>choice</div>
            <div style={{opacity:.6}}>reward</div>
            <div style={{opacity:.6}}>pA</div>
            <div style={{opacity:.6}}>pB</div>
            {session.trials.slice(-10).map(tr => (
              <>
                <div key={`t-${tr.t}`}>{tr.t+1}</div>
                <div>{tr.choice}</div>
                <div>{tr.reward}</div>
                <div>{(tr.pA*100).toFixed(0)}%</div>
                <div>{(tr.pB*100).toFixed(0)}%</div>
              </>
            ))}
          </div>
        </section>
      )}

      {finished && params && (
        <section className="card">
          <h2>Estimated parameters (stubbed)</h2>
          <p>These values come from <code>estimateRLParams(session)</code>. Later PRs will implement real MLE.</p>
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
          <li>This route is self-contained and does not edit shared files.</li>
          <li>It auto-registers via the existing route discovery.</li>
          <li>Future PRs can add reversals/adaptive schedules using <code>meta</code> in <code>SessionData</code>.</li>
        </ul>
      </section>
    </div>
  )
}
