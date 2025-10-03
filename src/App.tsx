import { Link, Outlet, useLocation } from 'react-router-dom'
import { getRouteMetaList } from './routes/_auto'

export default function App() {
  const meta = getRouteMetaList().filter(Boolean) as {path:string; label:string}[]
  const loc = useLocation()
  return (
    <>
      <nav>
        <div className="container" style={{display:'flex', gap:'1rem', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
            <Link to="/" className="badge">DA QuickCheck</Link>
            <Link to="/check">Check</Link>
            <Link to="/history">History</Link>
          </div>
          <div style={{display:'flex', gap:'.75rem', alignItems:'center', flexWrap:'wrap'}}>
            {meta.map(m => (
              <Link key={m.path} to={m.path} style={{opacity: loc.pathname.includes(m.path) ? 1 : .7}}>
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <div className="container">
        <Outlet />
      </div>
    </>
  )
}
