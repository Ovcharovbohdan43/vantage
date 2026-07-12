'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
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
      <motion.div
        role="dialog"
        aria-label="Share feedback"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="pointer-events-auto w-full max-w-sm rounded-2xl border border-[#d0bcff]/25 bg-[#1c1b1d]/95 p-4 shadow-[0_0_48px_rgba(208,188,255,0.14)] backdrop-blur-md"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#958ea0]">
              Quick feedback
            </p>
            <h2 className="mt-1 text-sm font-semibold text-[#e5e1e4]">
              How was this research run?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#cbc3d7]">
              Helps us improve Vantage. One response per account.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-[#958ea0] transition-colors hover:bg-white/5 hover:text-[#d0bcff]"
            aria-label="Not now"
          >
            <X size={16} />
          </button>
        </div>

        {thanks ? (
          <p className="py-4 text-center text-sm text-[#d0bcff]">Thanks — that helps a lot.</p>
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
                      'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                      on
                        ? 'border-[#d0bcff]/45 bg-[#d0bcff]/15 text-[#d0bcff]'
                        : 'border-white/10 text-[#cbc3d7] hover:border-[#d0bcff]/30',
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
              className="mb-3 w-full resize-none rounded-lg border border-white/12 bg-[#131315] px-3 py-2 text-sm text-[#e5e1e4] outline-none placeholder:text-[#958ea0] focus:border-[#d0bcff]/45"
            />

            {error && <p className="mb-2 text-xs text-[#ff8adf]">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || (selected.length === 0 && !message.trim())}
                className="landing-primary-glow flex-1 rounded-lg bg-[#d0bcff] px-3 py-2 text-sm font-semibold text-[#3c0091] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {mutation.isPending ? 'Sending…' : 'Send feedback'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg px-3 py-2 text-sm text-[#958ea0] transition-colors hover:text-[#d0bcff]"
              >
                Not now
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
