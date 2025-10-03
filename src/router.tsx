import { createHashRouter } from 'react-router-dom'
import App from './App'
import Home from './routes/home'
import { getDiscoveredRoutes } from './routes/_auto'

const discovered = getDiscoveredRoutes()

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      // Stub pages that later PRs will implement as routes:
      { path: '/check', lazy: async () => ({ Component: (await import('./routes/home')).default }) },
      { path: '/history', lazy: async () => ({ Component: (await import('./routes/home')).default }) },
      ...discovered
    ]
  }
])
