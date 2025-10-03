/// <reference types="vite/client" />
import type { ComponentType } from 'react'
import type { RouteMeta } from './_types'

// Dynamic import for components (lazy)
type Mod = { route: RouteMeta; default: ComponentType }
// NOTE: vite import glob for route components
const mods = import.meta.glob<Mod>('./**/index.tsx')

// Eager import for metadata (so labels/paths are known immediately)
const eager = import.meta.glob<Mod>('./**/index.tsx', { eager: true })

export function getDiscoveredRoutes() {
  return Object.entries(mods)
    .map(([key, loader]) => {
      const meta = (eager as Record<string, Mod | undefined>)[key]?.route
      return {
        path: meta?.path ?? '/__missing',
        lazy: async () => {
          const mod = await (loader as () => Promise<Mod>)()
          return { Component: mod.default }
        }
      }
    })
    .filter(route => route.path !== '/')
}

export function getRouteMetaList(): RouteMeta[] {
  return Object.values(eager)
    .map((m: unknown) => (m as Mod | undefined)?.route)
    .filter((route): route is RouteMeta => Boolean(route))
}
