'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addCompetitor } from '@/lib/api/competitors'

interface ManualCompetitorFormProps {
  projectId: string
  requiredTotal?: number
  currentTotal?: number
}

const fieldClass =
  'w-full rounded-lg border border-white/12 bg-[#131315] px-3 py-2.5 text-sm text-[#e5e1e4] placeholder:text-[#958ea0] outline-none transition-colors focus:border-[#d0bcff]/45'

export function ManualCompetitorForm({
  projectId,
  requiredTotal = 3,
  currentTotal = 0,
}: ManualCompetitorFormProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => addCompetitor(projectId, { name: name.trim(), url: url.trim() }),
    onSuccess: () => {
      setName('')
      setUrl('')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['competitors', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-status', projectId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const remaining = Math.max(0, requiredTotal - currentTotal)

  return (
    <div className="space-y-4 rounded-xl border border-[#ffcc80]/25 bg-[#ffcc80]/8 p-5">
      <div>
        <p className="text-sm font-medium text-[#e5e1e4]">Add competitors manually</p>
        <p className="mt-1 text-sm text-[#ffcc80]/90">
          We found fewer than {requiredTotal} valid G2/Capterra pages. Paste a product URL to continue
          {remaining > 0 ? ` — ${remaining} more needed.` : '.'}
        </p>
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim() || !url.trim()) return
          mutation.mutate()
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="competitor-name" className="text-sm font-medium text-[#cbc3d7]">
            Product name
          </label>
          <input
            id="competitor-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="FreshBooks"
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="competitor-url" className="text-sm font-medium text-[#cbc3d7]">
            G2 or Capterra URL
          </label>
          <input
            id="competitor-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.g2.com/products/freshbooks/reviews"
            className={fieldClass}
          />
        </div>
        {error && <p className="text-sm text-[#ffb4ab]">{error}</p>}
        <button
          type="submit"
          disabled={mutation.isPending || !name.trim() || !url.trim()}
          className="landing-primary-glow inline-flex rounded-lg bg-[#d0bcff] px-4 py-2.5 text-sm font-semibold text-[#3c0091] disabled:opacity-45"
        >
          {mutation.isPending ? 'Validating…' : 'Add competitor'}
        </button>
      </form>
    </div>
  )
}
