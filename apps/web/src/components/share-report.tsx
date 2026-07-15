'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Copy, ExternalLink, Linkedin, MessageCircle, Share2, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createShareDraftCheckout, fulfillShareDraftCheckout } from '@/lib/api/billing'
import { ApiError } from '@/lib/api/client'
import { generateIdeaOfWeekShareDraft } from '@/lib/api/idea-of-week'
import { generateLibraryShareDraft } from '@/lib/api/library'
import { generateReportShareDraft } from '@/lib/api/report'
import {
  buildSocialShareUrl,
  type ShareDraft,
  type ShareDraftSource,
  type SharePayload,
  type SocialChannel,
} from '@/lib/share-report'
import { cn } from '@/lib/utils'

interface ShareReportProps {
  payload: SharePayload
  draftSource?: ShareDraftSource
  className?: string
}

type Status = 'idle' | 'post-copied' | 'link-copied' | 'copy-failed'

function generateDraftForSource(
  source: ShareDraftSource,
  entitlementId: string,
): Promise<ShareDraft> {
  if (source.kind === 'report') return generateReportShareDraft(source.projectId, entitlementId)
  if (source.kind === 'library') return generateLibraryShareDraft(source.slug, entitlementId)
  return generateIdeaOfWeekShareDraft(source.week, entitlementId)
}

function inferDraftSource(url: string): ShareDraftSource | null {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts[0] === 'library' && parts[1]) {
      return { kind: 'library', slug: decodeURIComponent(parts[1]) }
    }
    if (parts[0] === 'idea-of-the-week' && parts[1]) {
      return { kind: 'idea-of-week', week: decodeURIComponent(parts[1]) }
    }
  } catch {
    return null
  }
  return null
}

function sourcePath(source: ShareDraftSource | null) {
  if (!source) return '/'
  if (source.kind === 'report') return `/research/${source.projectId}/report`
  if (source.kind === 'library') return `/library/${source.slug}`
  return `/idea-of-the-week/${source.week}`
}

export function ShareReport({ payload, draftSource, className }: ShareReportProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(payload.title)
  const [text, setText] = useState(payload.text)
  const [status, setStatus] = useState<Status>('idle')
  const [draftLoading, setDraftLoading] = useState(false)
  const [entitlementId, setEntitlementId] = useState<string | null>(null)
  const [draftGenerated, setDraftGenerated] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [authRequired, setAuthRequired] = useState(false)
  const userEditedRef = useRef(false)
  const resolvedDraftSource = useMemo(
    () => draftSource ?? inferDraftSource(payload.url),
    [draftSource, payload.url],
  )
  const draftSourceKey = resolvedDraftSource ? JSON.stringify(resolvedDraftSource) : ''

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('share_session_id')
    if (!sessionId || !resolvedDraftSource) return

    let cancelled = false
    setOpen(true)
    setDraftLoading(true)
    setBillingError(null)
    fulfillShareDraftCheckout(sessionId)
      .then(async (result) => {
        if (!result.ready) throw new Error('Payment is still processing')
        setEntitlementId(result.entitlement_id)
        return generateDraftForSource(resolvedDraftSource, result.entitlement_id)
      })
      .then((draft) => {
        if (cancelled) return
        setTitle(draft.title)
        setText(draft.text)
        setDraftGenerated(true)
        setEntitlementId(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setBillingError(
          error instanceof ApiError
            ? error.message
            : 'The purchase is safe, but generation failed. Retry without paying again.',
        )
      })
      .finally(() => {
        if (!cancelled) setDraftLoading(false)
        const url = new URL(window.location.href)
        url.searchParams.delete('share_session_id')
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      })

    return () => {
      cancelled = true
    }
    // resolvedDraftSource is represented by draftSourceKey to avoid reruns from object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSourceKey])

  async function generateWithEntitlement(id: string) {
    if (!resolvedDraftSource) return
    setDraftLoading(true)
    setBillingError(null)
    setAuthRequired(false)
    setEntitlementId(id)
    try {
      const draft = await generateDraftForSource(resolvedDraftSource, id)
      setTitle(draft.title)
      setText(draft.text)
      setDraftGenerated(true)
      setEntitlementId(null)
    } catch (error) {
      setBillingError(
        error instanceof ApiError
          ? error.message
          : 'Generation failed. You can retry without paying again.',
      )
    } finally {
      setDraftLoading(false)
    }
  }

  async function startDraftPurchase() {
    if (!resolvedDraftSource) return
    if (entitlementId) {
      await generateWithEntitlement(entitlementId)
      return
    }

    setDraftLoading(true)
    setBillingError(null)
    setAuthRequired(false)
    try {
      const checkout = await createShareDraftCheckout(resolvedDraftSource)
      if (checkout.checkout_url) {
        window.location.href = checkout.checkout_url
        return
      }
      await generateWithEntitlement(checkout.entitlement_id)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuthRequired(true)
      } else {
        setBillingError(error instanceof ApiError ? error.message : 'Could not start checkout')
      }
      setDraftLoading(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setTitle(payload.title)
      setText(payload.text)
      setStatus('idle')
      setBillingError(null)
      setAuthRequired(false)
      userEditedRef.current = false
    } else {
      setDraftLoading(false)
    }
  }

  function openSocial(channel: SocialChannel) {
    const url = buildSocialShareUrl(channel, { title, text, url: payload.url })
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function copy(value: string, success: Status) {
    try {
      await navigator.clipboard.writeText(value)
      setStatus(success)
    } catch {
      setStatus('copy-failed')
    }
  }

  return (
    <section
      className={cn(
        'rounded-lg border border-white/[0.09] bg-v-surface p-5 sm:p-6',
        className,
      )}
      aria-labelledby="share-report-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-landing-mono text-[10px] uppercase tracking-wider text-v-primary">
            Share the signal
          </p>
          <h2 id="share-report-heading" className="mt-1 text-lg font-semibold text-v-on">
            Turn this research into a useful conversation.
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-v-muted">
            Preview a Reddit-style post, edit it, then publish to your preferred network.
          </p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-v-on px-4 text-sm font-medium text-v-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v-primary"
            >
              <Share2 aria-hidden className="size-4" />
              Share report
            </button>
          </DialogTrigger>

          <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden border-white/[0.11] bg-v-surface p-0 text-v-on shadow-2xl sm:max-w-2xl">
            <DialogHeader className="border-b border-white/[0.08] px-5 py-5 pr-12 sm:px-6">
              <DialogTitle className="text-xl text-v-on">Share a Reddit-style post</DialogTitle>
              <DialogDescription className="leading-relaxed text-v-muted">
                Review every detail before it leaves Vantage. You can edit the title and post.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              {payload.privateReport && (
                <div
                  role="note"
                  className="mb-4 rounded-md border border-v-warn/25 bg-v-warn/[0.06] px-4 py-3 text-xs leading-relaxed text-v-warn"
                >
                  This is a private report. Sharing publishes your business idea and selected market
                  findings. The private report URL is not included.
                </div>
              )}

              {resolvedDraftSource && (
                <div className="mb-5 rounded-md border border-v-primary/20 bg-v-primary/[0.04] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-v-on">
                        Want this to sound more like a real Reddit post?
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-v-muted">
                        One successful generated draft costs $0.50. If generation fails, retry is
                        included.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={draftLoading}
                      onClick={() => void startDraftPurchase()}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-v-primary px-3.5 text-xs font-semibold text-v-bg transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Sparkles aria-hidden className="size-3.5" />
                      {draftLoading
                        ? 'Generating...'
                        : entitlementId
                          ? 'Retry - already paid'
                          : draftGenerated
                            ? 'Generate another - $0.50'
                            : 'Generate draft - $0.50'}
                    </button>
                  </div>
                  {authRequired && (
                    <p className="mt-3 border-t border-white/[0.08] pt-3 text-xs text-v-muted">
                      Sign in to purchase a generated draft. The editable post below remains free.{' '}
                      <Link
                        href={`/login?next=${encodeURIComponent(sourcePath(resolvedDraftSource))}`}
                        className="font-medium text-v-primary hover:underline"
                      >
                        Log in
                      </Link>
                    </p>
                  )}
                  {billingError && (
                    <p className="mt-3 border-t border-white/[0.08] pt-3 text-xs text-v-error">
                      {billingError}
                    </p>
                  )}
                </div>
              )}

              <label
                htmlFor="share-post-title"
                className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted"
              >
                Post title
              </label>
              <input
                id="share-post-title"
                value={title}
                onChange={(event) => {
                  userEditedRef.current = true
                  setTitle(event.target.value)
                }}
                className="mt-2 min-h-11 w-full rounded-md border border-white/[0.1] bg-v-bg px-3 text-sm text-v-on outline-none transition-colors placeholder:text-v-muted focus:border-v-primary/50"
              />

              <div className="mt-4 flex items-center justify-between gap-3">
                <label
                  htmlFor="share-post-body"
                  className="font-landing-mono text-[10px] uppercase tracking-wider text-v-muted"
                >
                  Reddit post preview
                </label>
                <span className="font-landing-mono text-[10px] tabular-nums text-v-muted">
                  {draftLoading ? 'drafting...' : `${text.length.toLocaleString('en-US')} characters`}
                </span>
              </div>
              <textarea
                id="share-post-body"
                value={text}
                onChange={(event) => {
                  userEditedRef.current = true
                  setText(event.target.value)
                }}
                rows={14}
                className="mt-2 w-full resize-y rounded-md border border-white/[0.1] bg-v-bg p-3 font-landing-mono text-xs leading-6 text-v-on outline-none transition-colors placeholder:text-v-muted focus:border-v-primary/50"
              />

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => openSocial('reddit')}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#ff4500] px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4500]"
                >
                  <MessageCircle aria-hidden className="size-4" />
                  Open Reddit
                  <ExternalLink aria-hidden className="size-3.5 opacity-75" />
                </button>
                <button
                  type="button"
                  onClick={() => openSocial('x')}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/[0.12] bg-v-bg px-3 text-sm font-medium text-v-on hover:border-white/25"
                >
                  <span aria-hidden className="text-base leading-none">
                    𝕏
                  </span>
                  Share on X
                </button>
                <button
                  type="button"
                  onClick={() => openSocial('linkedin')}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/[0.12] bg-v-bg px-3 text-sm font-medium text-v-on hover:border-[#0a66c2]/60"
                >
                  <Linkedin aria-hidden className="size-4 text-[#5ca9e6]" />
                  LinkedIn
                </button>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void copy(text, 'post-copied')}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/[0.1] px-3 text-xs font-medium text-v-muted hover:border-v-primary/30 hover:text-v-on"
                >
                  {status === 'post-copied' ? (
                    <Check aria-hidden className="size-3.5 text-v-secondary" />
                  ) : (
                    <Copy aria-hidden className="size-3.5" />
                  )}
                  {status === 'post-copied' ? 'Post copied' : 'Copy post'}
                </button>
                <button
                  type="button"
                  onClick={() => void copy(payload.url, 'link-copied')}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/[0.1] px-3 text-xs font-medium text-v-muted hover:border-v-primary/30 hover:text-v-on"
                >
                  {status === 'link-copied' ? (
                    <Check aria-hidden className="size-3.5 text-v-secondary" />
                  ) : (
                    <Copy aria-hidden className="size-3.5" />
                  )}
                  {status === 'link-copied' ? 'Link copied' : 'Copy link'}
                </button>
              </div>

              <p
                aria-live="polite"
                className={cn(
                  'mt-3 min-h-5 text-center text-xs',
                  status === 'copy-failed' ? 'text-v-error' : 'text-v-secondary',
                )}
              >
                {status === 'copy-failed'
                  ? 'Clipboard access was blocked. Select the text above and copy it manually.'
                  : status === 'post-copied'
                    ? 'The complete post is ready to paste.'
                    : status === 'link-copied'
                      ? 'The report link is ready to paste.'
                      : ''}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  )
}
