'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from '@phosphor-icons/react'
import { ApiError } from '@/lib/api/client'
import {
  getFeedbackStatus,
  submitFeedback,
  type FeedbackTag,
} from '@/lib/api/feedback'
import { cn } from '@/lib/utils'

const TAGS: { id: FeedbackTag; label: string }[] = [
  { id: 'report_useful', label: 'Report was useful' },
  { id: 'waited_too_long', label: 'Waited too long' },
  { id: 'bugs', label: 'Hit bugs' },
  { id: 'easy_to_use', label: 'Easy to use' },
  { id: 'confusing', label: 'Felt confusing' },
  { id: 'would_recommend', label: 'Would recommend' },
]

const DISMISS_PREFIX = 'vantage_feedback_dismissed_'

function dismissedKey(projectId: string) {
  return `${DISMISS_PREFIX}${projectId}`
}

interface AppFeedbackPromptProps {
  projectId: string
}

export function AppFeedbackPrompt({ projectId }: AppFeedbackPromptProps) {
  const queryClient = useQueryClient()
  const [visible, setVisible] = useState(false)
  const [selected, setSelected] = useState<FeedbackTag[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [thanks, setThanks] = useState(false)

  const { data: status, isLoading } = useQuery({
    queryKey: ['app-feedback-status'],
    queryFn: getFeedbackStatus,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (isLoading || status?.submitted) return
    if (typeof window === 'undefined') return
    if (localStorage.getItem(dismissedKey(projectId))) return

    const timer = window.setTimeout(() => setVisible(true), 2500)
    return () => window.clearTimeout(timer)
  }, [isLoading, status?.submitted, projectId])

  const mutation = useMutation({
    mutationFn: () =>
      submitFeedback({
        project_id: projectId,
        tags: selected,
        message: message.trim(),
      }),
    onSuccess: async () => {
      setThanks(true)
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['app-feedback-status'] })
      window.setTimeout(() => setVisible(false), 1800)
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setVisible(false)
        void queryClient.invalidateQueries({ queryKey: ['app-feedback-status'] })
        return
      }
      setError(err instanceof ApiError ? err.message : 'Could not send feedback')
    },
  })

  function toggleTag(tag: FeedbackTag) {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function handleDismiss() {
    localStorage.setItem(dismissedKey(projectId), '1')
    setVisible(false)
  }

  if (!visible) return null
  if (status?.submitted && !thanks) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-4 sm:p-6">
      <div
        role="dialog"
        aria-label="Share feedback"
        className="pointer-events-auto w-full max-w-sm rounded-xl border border-white/[0.08] bg-v-surface p-4"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-landing-mono text-[10px] uppercase tracking-widest text-v-muted">
              Quick feedback
            </p>
            <h2 className="mt-1 text-sm font-semibold text-v-on">How was this research run?</h2>
            <p className="mt-1 text-xs leading-relaxed text-v-muted">
              Helps us improve Vantage. One response per account.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-v-muted transition-colors hover:bg-white/5 hover:text-v-on"
            aria-label="Not now"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {thanks ? (
          <p className="py-4 text-center text-sm text-v-tertiary">Thanks — that helps a lot.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {TAGS.map((tag) => {
                const on = selected.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs transition-colors',
                      on
                        ? 'border-v-primary/45 bg-v-primary/15 text-v-primary'
                        : 'border-white/10 text-v-muted hover:border-white/25 hover:text-v-on',
                    )}
                  >
                    {tag.label}
                  </button>
                )
              })}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything else? (optional)"
              rows={3}
              maxLength={2000}
              className="mb-3 w-full resize-none rounded-lg border border-white/12 bg-v-bg px-3 py-2 text-sm text-v-on outline-none placeholder:text-v-muted focus:border-v-primary/45"
            />

            {error && <p className="mb-2 text-xs text-v-error">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || (selected.length === 0 && !message.trim())}
                className="flex-1 rounded-md bg-v-on px-3 py-2 text-sm font-medium text-v-bg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {mutation.isPending ? 'Sending…' : 'Send feedback'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-md px-3 py-2 text-sm text-v-muted transition-colors hover:text-v-on"
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
