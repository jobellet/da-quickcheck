import { useEffect, useMemo, useState, type CSSProperties } from 'react'

type HistoryItem = Record<string, unknown>

type HistoryEntry = HistoryItem

const HISTORY_KEY = 'daqc_history'

const TIMESTAMP_PATHS: string[][] = [
  ['timestamp'],
  ['ts'],
  ['time'],
  ['date'],
  ['createdAt'],
  ['completedAt'],
  ['run', 'timestamp'],
  ['run', 'completedAt'],
]

const TRIAL_PATHS: string[][] = [
  ['trials'],
  ['trialCount'],
  ['trial_count'],
  ['summary', 'trials'],
  ['metrics', 'trials'],
  ['results', 'trials'],
]

const RL_PARAM_PATHS: string[][] = [
  ['rlParams'],
  ['rl_params'],
  ['rl', 'params'],
  ['rl', 'theta'],
  ['rl', 'values'],
  ['params', 'rl'],
  ['summary', 'rlParams'],
]

const DIAL_PATHS: string[][] = [
  ['dials'],
  ['dialEstimates'],
  ['dial_estimates'],
  ['estimates', 'dials'],
  ['summary', 'dials'],
  ['results', 'dials'],
]

const TIP_PATHS: string[][] = [
  ['tips'],
  ['topTips'],
  ['tipRecommendations'],
  ['recommendations'],
  ['summary', 'tips'],
  ['results', 'tips'],
]

export const route = { path: '/history', label: 'History' } as const

export default function Page() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (!raw) {
        setEntries([])
        return
      }
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setEntries(parsed.filter(isRecord))
      } else {
        setEntries([])
      }
    } catch (error) {
      console.error('Failed to load history', error)
      setEntries([])
    }
  }, [])

  const displayEntries = useMemo(() => {
    if (!Array.isArray(entries)) return []
    const recent = entries.filter(isRecord)
    return recent.slice(-20).reverse()
  }, [entries])

  const handleClear = () => {
    if (displayEntries.length === 0) return
    if (typeof window !== 'undefined' && window.confirm('Clear the locally stored history?')) {
      localStorage.removeItem(HISTORY_KEY)
      setEntries([])
    }
  }

  return (
    <div className="grid">
      <section className="card">
        <div style={headerStyle}>
          <h1 style={headingStyle}>History</h1>
          {displayEntries.length > 0 && (
            <button type="button" className="btn" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>
        <p style={introStyle}>Showing up to the last 20 Quick Check runs stored on this device.</p>
        {displayEntries.length === 0 ? (
          <p style={emptyStyle}>No history yet. Complete a Quick Check to see it here.</p>
        ) : (
          <ol style={listStyle}>
            {displayEntries.map((entry, index) => {
              const timestamp = getTimestampLabel(entry)
              const trials = extractTrials(entry)
              const rlParams = extractNumberArray(entry, RL_PARAM_PATHS, 4)
              const dials = extractNumberArray(entry, DIAL_PATHS, 5)
              const tips = extractTips(entry)

              return (
                <li key={`${timestamp ?? 'run'}-${index}`} className="card" style={itemStyle}>
                  <div style={itemHeaderStyle}>
                    <div>
                      <div style={timestampStyle}>{timestamp ?? 'Unknown time'}</div>
                      {trials !== undefined && (
                        <div style={subtleStyle}>
                          {trials} trial{trials === 1 ? '' : 's'}
                        </div>
                      )}
                    </div>
                  </div>
                  <dl style={detailsListStyle}>
                    <dt style={labelStyle}>RL params</dt>
                    <dd style={valueStyle}>{formatNumberList(rlParams) ?? '–'}</dd>
                    <dt style={labelStyle}>Dials</dt>
                    <dd style={valueStyle}>{formatNumberList(dials) ?? '–'}</dd>
                    <dt style={labelStyle}>Tips</dt>
                    <dd style={valueStyle}>
                      {tips.length === 0 ? (
                        <span>–</span>
                      ) : (
                        <ul style={tipsListStyle}>
                          {tips.slice(0, 3).map((tip, tipIndex) => (
                            <li key={tipIndex}>{tip}</li>
                          ))}
                        </ul>
                      )}
                    </dd>
                  </dl>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '.75rem',
  flexWrap: 'wrap',
}

const headingStyle: CSSProperties = { margin: 0 }

const introStyle: CSSProperties = { marginTop: '.5rem' }

const emptyStyle: CSSProperties = { marginTop: '.75rem' }

const listStyle: CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: '1rem 0 0',
  display: 'grid',
  gap: '0.75rem',
}

const itemStyle: CSSProperties = {
  padding: '1rem',
}

const itemHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '.75rem',
}

const timestampStyle: CSSProperties = {
  fontWeight: 600,
  fontSize: '1rem',
}

const subtleStyle: CSSProperties = {
  color: 'var(--muted, #555)',
  marginTop: '.25rem',
}

const detailsListStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(6rem, auto) 1fr',
  columnGap: '1rem',
  rowGap: '.35rem',
  margin: '.75rem 0 0',
}

const labelStyle: CSSProperties = {
  fontWeight: 600,
}

const valueStyle: CSSProperties = {
  margin: 0,
}

const tipsListStyle: CSSProperties = {
  margin: 0,
  paddingLeft: '1.2rem',
  display: 'grid',
  gap: '.25rem',
}

function isRecord(value: unknown): value is HistoryItem {
  return typeof value === 'object' && value !== null
}

function getTimestampLabel(entry: HistoryEntry): string | undefined {
  for (const path of TIMESTAMP_PATHS) {
    const value = getValueByPath(entry, path)
    const date = toDate(value)
    if (date) return date.toLocaleString()
  }
  const alt = entry.timestamp ?? entry.ts ?? entry.time ?? entry.date
  if (typeof alt === 'string' && alt.trim()) return alt
  return undefined
}

function extractTrials(entry: HistoryEntry): number | undefined {
  for (const path of TRIAL_PATHS) {
    const value = getValueByPath(entry, path)
    const numberValue = toNumber(value)
    if (numberValue !== undefined) return numberValue
  }
  return undefined
}

function extractNumberArray(entry: HistoryEntry, paths: string[][], expectedLength?: number) {
  for (const path of paths) {
    const value = getValueByPath(entry, path)
    const arrayValue = toNumberArray(value)
    if (arrayValue && (!expectedLength || arrayValue.length === expectedLength)) {
      return arrayValue
    }
  }
  if (expectedLength !== undefined) {
    const fallback = findNumberArray(entry, expectedLength)
    if (fallback) return fallback
  }
  return undefined
}

function extractTips(entry: HistoryEntry): string[] {
  for (const path of TIP_PATHS) {
    const value = getValueByPath(entry, path)
    const tips = toTipTitles(value)
    if (tips.length > 0) {
      return tips.slice(0, 3)
    }
  }
  return []
}

function getValueByPath(source: HistoryItem, path: string[]): unknown {
  let current: unknown = source
  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function toDate(value: unknown): Date | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value)
    if (!Number.isNaN(numeric)) {
      const dateFromNumber = new Date(numeric)
      if (!Number.isNaN(dateFromNumber.getTime())) return dateFromNumber
    }
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  return undefined
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return undefined
}

function toNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const numbers: number[] = []
  for (const item of value) {
    const numberValue = toNumber(item)
    if (numberValue === undefined) return undefined
    numbers.push(numberValue)
  }
  return numbers
}

function findNumberArray(value: unknown, expectedLength: number, depth = 0): number[] | undefined {
  if (depth > 3) return undefined
  if (Array.isArray(value)) {
    const numbers = toNumberArray(value)
    if (numbers && numbers.length === expectedLength) return numbers
    return undefined
  }
  if (value && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) {
      const found = findNumberArray(child, expectedLength, depth + 1)
      if (found) return found
    }
  }
  return undefined
}

function toTipTitles(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const titles: string[] = []
  for (const item of value) {
    if (typeof item === 'string' && item.trim()) {
      titles.push(item.trim())
    } else if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const maybeTitle = record.title ?? record.name ?? record.tip ?? record.id
      if (typeof maybeTitle === 'string' && maybeTitle.trim()) {
        titles.push(maybeTitle.trim())
      }
    }
    if (titles.length >= 3) break
  }
  return titles
}

function formatNumberList(values?: number[]) {
  if (!values || values.length === 0) return undefined
  return values.map(n => formatNumber(n)).join(', ')
}

function formatNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs === 0) return '0'
  if (abs >= 100 || Number.isInteger(value)) return value.toString()
  if (abs >= 10) return value.toFixed(1).replace(/\.0$/, '')
  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}
