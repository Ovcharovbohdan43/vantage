'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addCompetitor } from '@/lib/api/competitors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ManualCompetitorFormProps {
  projectId: string
  requiredTotal?: number
  currentTotal?: number
}

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
    <div className="border border-amber-200 bg-amber-50 p-5 space-y-4">
      <div>
        <p className="text-sm font-medium text-amber-950">Add competitors manually</p>
        <p className="text-sm text-amber-900/80 mt-1">
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
          <Label htmlFor="competitor-name">Product name</Label>
          <Input
            id="competitor-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="FreshBooks"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="competitor-url">G2 or Capterra URL</Label>
          <Input
            id="competitor-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.g2.com/products/freshbooks/reviews"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={mutation.isPending || !name.trim() || !url.trim()}>
          {mutation.isPending ? 'Validating…' : 'Add competitor'}
        </Button>
      </form>
    </div>
  )
}
