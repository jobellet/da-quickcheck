import { Link } from 'react-router-dom'
import { getRouteMetaList } from '../_auto'

export const route = { path: '/', label: 'Home' } as const

export default function Home() {
  const tasks = getRouteMetaList().filter(m => m.path.startsWith('/tasks/'))
  return (
    <div className="grid">
      <section className="card">
        <h1>DA QuickCheck</h1>
        <p>2–3 minute micro-battery to estimate RL/WM dials → real-time tips.</p>
        <div style={{display:'flex', gap:'.5rem', marginTop:'.5rem'}}>
          <Link to="/check" className="btn primary">Start 2-min Check</Link>
          <Link to="/history" className="btn">View History</Link>
        </div>
      </section>

      <section className="card">
        <h2>Tasks (auto-discovered)</h2>
        {tasks.length === 0 ? (
          <p>No tasks yet. When a PR adds <code>src/routes/any-task/index.tsx</code> with an exported <code>route</code>, it appears here automatically.</p>
        ) : (
          <ul>
            {tasks.map(t => (
              <li key={t.path}><Link to={t.path}>{t.label}</Link></li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>What’s next?</h2>
        <ul>
          <li>Add task routes: Bandit, Go/NoGo, Delay, Gating, Effort.</li>
          <li>Implement RL MLE, scheduler, dials mapping, tip engine.</li>
          <li>Then wire “Check” flow and local history.</li>
        </ul>
      </section>
    </div>
  )
}
