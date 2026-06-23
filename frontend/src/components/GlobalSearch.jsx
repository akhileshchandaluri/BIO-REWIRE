import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  Loader2,
  FlaskConical,
  Database,
  Radio,
  AlertTriangle,
  X,
} from 'lucide-react'
import { inferDrug, getDrugs } from '../lib/api'
import { labelFor } from '../lib/utils'

// Feature 3 — On-the-Fly Drug Inference.
// A global search bar that scores ANY drug (in- or out-of-database) live
// against the currently active disease, keeping the result strictly in-memory.
export default function GlobalSearch({ activeDisease }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [pending, setPending] = useState('') // drug name being computed
  const [drugList, setDrugList] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    getDrugs()
      .then((res) => {
        if (res && res.drugs) setDrugList(res.drugs)
      })
      .catch(console.error)
  }, [])

  const run = async (e) => {
    e?.preventDefault()
    const drug = query.trim()
    if (!drug || status === 'loading') return
    setPending(drug)
    setStatus('loading')
    setResult(null)
    setErrorMsg('')
    try {
      const data = await inferDrug(drug, activeDisease)
      setResult(data)
      setStatus('done')
    } catch (err) {
      // Prefer the backend's graceful message; fall back to the spec wording.
      const detail = err?.response?.data?.detail
      setErrorMsg(
        detail ||
          `Insufficient data available for ${drug} — computational relevance cannot be evaluated.`,
      )
      setStatus('error')
    }
  }

  const reset = () => {
    setStatus('idle')
    setResult(null)
    setErrorMsg('')
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-indigo-500" />
        <h3 className="text-sm font-bold text-slate-800">On-the-Fly Drug Inference</h3>
        <span className="ml-auto text-[11px] font-medium text-slate-400">
          vs. {labelFor(activeDisease)}
        </span>
      </div>

      <form onSubmit={run} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search any drug (e.g. Aspirin, Lisinopril, Afatinib)…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          {showSuggestions && query.trim() && (() => {
            const matches = drugList.filter((d) =>
              d.toLowerCase().includes(query.toLowerCase())
            )
            // Hide if no matches or if the only match is already exactly what's typed
            if (
              matches.length === 0 ||
              (matches.length === 1 && matches[0].toLowerCase() === query.trim().toLowerCase())
            ) {
              return null
            }
            return (
              <div className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <ul className="max-h-48 overflow-y-auto py-1">
                  {matches.map((d) => (
                    <li
                      key={d}
                      onMouseDown={(e) => {
                        e.preventDefault() // prevent input blur
                        setQuery(d)
                        setShowSuggestions(false)
                      }}
                      className="cursor-pointer px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })()}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={status === 'loading' || !query.trim()}
          className={
            status === 'loading' || !query.trim()
              ? 'flex h-11 cursor-not-allowed items-center gap-2 rounded-xl bg-slate-300 px-5 text-sm font-semibold text-white'
              : 'flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl'
          }
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Compute
        </motion.button>
      </form>

      <AnimatePresence mode="wait">
        {status === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3"
          >
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-500" />
            <div>
              <p className="text-sm font-semibold text-indigo-700">
                Computing relevance for {pending}…
              </p>
              <p className="text-xs text-indigo-500/80">
                Running the live network-perturbation pipeline — this may take a
                moment.
              </p>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            <p className="flex-1 text-sm font-medium text-rose-700">{errorMsg}</p>
            <button onClick={reset} className="text-rose-400 hover:text-rose-600">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {status === 'done' && result && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">
                  {result.drug_name}
                </span>
                {result.in_database ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    <Database className="h-3 w-3" /> In database
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    <Radio className="h-3 w-3" /> Live inference
                  </span>
                )}
              </div>
              <button onClick={reset} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Relevance to{' '}
              <span className="font-semibold text-slate-700">
                {labelFor(result.disease_name)}
              </span>
              {result.targets?.length ? (
                <>
                  {' '}
                  · targets: {result.targets.join(', ')}
                </>
              ) : null}
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.max(0, Math.min(1, result.relevance_score)) * 100}%`,
                  }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                />
              </div>
              <span className="font-mono text-sm font-bold tabular-nums text-slate-800">
                {result.relevance_score.toFixed(4)}
              </span>
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">
              Computed live · not saved to the database
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
