'use client'

import { useEffect, useId, useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'
import { submitSupportRequest } from '@/lib/api/support'
import { cn } from '@/lib/utils'

type FormValues = {
  subject: string
  message: string
}

/** Keep in sync with apps/api SUPPORT_COOLDOWN (2 minutes). */
const SUPPORT_COOLDOWN_MS = 2 * 60 * 1000
const SUPPORT_LAST_SENT_KEY = 'vantage_support_last_sent_at'

function markSupportSent() {
  try {
    window.localStorage.setItem(SUPPORT_LAST_SENT_KEY, String(Date.now()))
  } catch {
    // ignore private mode / blocked storage
  }
}

function getSupportCooldownLeft(): number {
  try {
    const raw = window.localStorage.getItem(SUPPORT_LAST_SENT_KEY)
    if (!raw) return 0
    const sentAt = Number(raw)
    if (!Number.isFinite(sentAt)) return 0
    const left = Math.ceil((sentAt + SUPPORT_COOLDOWN_MS - Date.now()) / 1000)
    return Math.max(0, left)
  } catch {
    return 0
  }
}

const fieldClass =
  'w-full rounded-md border border-white/12 bg-v-bg px-3 py-2 text-sm text-v-on outline-none transition-colors placeholder:text-v-muted focus:border-v-primary/45 focus:ring-1 focus:ring-v-primary/20'

/** Product FAQ — no vendor / stack names. Detailed answers for real support friction. */
const FAQ_ITEMS: { id: string; question: string; answer: string[] }[] = [
  {
    id: 'credits',
    question: 'How do research credits work?',
    answer: [
      'Credits unlock full market analyses. Your balance is shown on the dashboard and when you start new research. Credits never expire and are consumed only when a full analysis begins successfully.',
      'Depth changes how many credits a run costs: shallow uses the least, deep uses the most. A free preview, when available, does not spend credits — it gives a shorter teaser so you can see how Vantage works before buying.',
    ],
  },
  {
    id: 'preview-vs-full',
    question: 'What is the difference between a free preview and a full report?',
    answer: [
      'A free preview is a lighter pass: enough signal to understand whether the market looks promising, but not the complete evidence pack.',
      'A full report includes richer pain clustering, opportunity scoring, competitor context, and the review evidence you can open and verify. Once you unlock a full analysis for a project, you keep access to that report.',
    ],
  },
  {
    id: 'timing',
    question: 'How long does an analysis take?',
    answer: [
      'Most runs finish within several minutes. Timing depends on market breadth, how many products match your idea, and which depth you chose.',
      'While it runs you will see live progress stages. You can leave the page and return later — the job continues in the background, and completed reports appear in your workspace history.',
    ],
  },
  {
    id: 'failed',
    question: 'Why did my analysis stop or fail?',
    answer: [
      'Common reasons: not enough competing products could be found for your description, review coverage was too thin for a trustworthy read, or a temporary connection issue interrupted the run.',
      'Try clarifying the product category and audience, then re-run. If the same failure repeats, send us the project title and roughly when it happened — we can investigate from there.',
    ],
  },
  {
    id: 'payment',
    question: 'I paid, but credits did not show up. What should I do?',
    answer: [
      'Checkout confirmation can take a short moment to reach your account. Refresh the dashboard, then open Account and check the Research credits balance.',
      'If nothing changes after a few minutes, reply through the form below with the email you used at purchase and the approximate time of payment. We will match it and top up any missing credits.',
    ],
  },
  {
    id: 'refunds',
    question: 'Can I get a refund?',
    answer: [
      'If checkout charged you but credits never appeared, we treat that as a fulfillment issue and prioritize making it right — usually by granting the missing credits.',
      'For other refund requests, describe what happened (project, pack purchased, date). We review these case by case. Unused purchased credits remain on your account indefinitely.',
    ],
  },
  {
    id: 'evidence',
    question: 'Where does the customer evidence come from?',
    answer: [
      'Vantage analyzes real negative software reviews that customers already published about competing products in your category. We focus on recurring complaints and patterns — not anonymous gossip.',
      'Quotes in reports are anonymized: we do not show reviewer names or personal contact details. The point is market pain evidence you can trust, not private user data.',
    ],
  },
  {
    id: 'privacy',
    question: 'Who can see my research projects?',
    answer: [
      'Your workspace analyses are private to your signed-in account. Other users cannot browse your projects or reports.',
      'Published Research Library articles are a separate public archive when we choose to share anonymized market findings. Your private project text and unpaid report drafts stay in your account unless you use a public share path we explicitly provide.',
    ],
  },
  {
    id: 'depth',
    question: 'Which research depth should I choose?',
    answer: [
      'Shallow is best for a quick read on a new idea. Standard is the default for comparing a few directions seriously. Deep is for when you need broader coverage before committing time or money.',
      'You can start shallow and later unlock a fuller run on the same idea if you still have credits — higher depth simply pulls a wider sample and typically costs more credits.',
    ],
  },
  {
    id: 'contact',
    question: 'How do I reach a person?',
    answer: [
      'Use the contact form on this page. We reply to the email on your account, usually within one business day.',
      'Include the project title, what you expected, what you saw instead, and any screenshot notes if something looked wrong. The more concrete the steps, the faster we can help.',
    ],
  },
]

function FaqItem({
  item,
  open,
  onToggle,
}: {
  item: (typeof FAQ_ITEMS)[number]
  open: boolean
  onToggle: () => void
}) {
  const panelId = useId()
  const buttonId = useId()

  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02] sm:px-5"
        >
          <span className="text-sm font-semibold text-v-on">{item.question}</span>
          <CaretDown
            size={16}
            weight="bold"
            className={cn(
              'mt-0.5 shrink-0 text-v-muted transition-transform duration-200',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="px-4 pb-4 sm:px-5"
      >
        <div className="max-w-2xl space-y-3 border-l-2 border-white/[0.08] pl-4 text-sm leading-relaxed text-v-muted">
          {item.answer.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SupportView() {
  const [sent, setSent] = useState(false)
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { subject: '', message: '' },
  })

  useEffect(() => {
    setCooldownLeft(getSupportCooldownLeft())
  }, [])

  useEffect(() => {
    if (cooldownLeft <= 0) return
    const id = window.setInterval(() => {
      setCooldownLeft(getSupportCooldownLeft())
    }, 1000)
    return () => window.clearInterval(id)
  }, [cooldownLeft])

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      submitSupportRequest({
        subject: values.subject.trim(),
        message: values.message.trim(),
      }),
    onSuccess: () => {
      markSupportSent()
      setCooldownLeft(SUPPORT_COOLDOWN_MS / 1000)
      setSent(true)
      reset()
    },
  })

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'Could not send your message'
        : null

  const canSendAnother = cooldownLeft <= 0
  const cooldownLabel =
    cooldownLeft > 60
      ? `Wait ${Math.ceil(cooldownLeft / 60)} min`
      : `Wait ${cooldownLeft}s`

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <header className="mb-8 border-b border-white/[0.06] pb-6">
        <h1 className="text-xl font-semibold tracking-tight text-v-on">Support</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-v-muted">
          Answers to common questions, plus a direct line to us if you need help with billing,
          reports, or a stuck analysis.
        </p>
      </header>

      {/* GitHub docs-style FAQ */}
      <section className="mb-8" aria-labelledby="support-faq-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="support-faq-heading" className="text-sm font-semibold text-v-on">
            Frequently asked questions
          </h2>
          <p className="font-landing-mono text-[11px] uppercase tracking-wider text-v-muted">
            {FAQ_ITEMS.length} topics
          </p>
        </div>

        <div className="overflow-hidden rounded-md border border-white/[0.08] bg-v-surface">
          {FAQ_ITEMS.map((item) => (
            <FaqItem
              key={item.id}
              item={item}
              open={openFaqId === item.id}
              onToggle={() => setOpenFaqId((cur) => (cur === item.id ? null : item.id))}
            />
          ))}
        </div>
      </section>

      {/* Contact — GitHub settings section */}
      <section aria-labelledby="support-contact-heading">
        <div className="overflow-hidden rounded-md border border-white/[0.08] bg-v-surface">
          <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
            <h2 id="support-contact-heading" className="text-sm font-semibold text-v-on">
              Contact us
            </h2>
            <p className="mt-0.5 text-xs text-v-muted">
              We reply to your account email, usually within one business day.
            </p>
          </div>

          <div className="px-4 py-4 sm:px-5 sm:py-5">
            {sent ? (
              <div>
                <p className="text-sm font-medium text-v-tertiary">Message sent</p>
                <p className="mt-1.5 text-sm text-v-muted">
                  Thanks — we received your request and will reply to your account email.
                  {canSendAnother
                    ? ' You can send another message if something else comes up.'
                    : ' Please wait a moment before sending another message.'}
                </p>
                <button
                  type="button"
                  disabled={!canSendAnother}
                  onClick={() => {
                    if (!canSendAnother) return
                    setSent(false)
                    mutation.reset()
                  }}
                  className="mt-4 inline-flex h-8 items-center justify-center rounded-md border border-white/14 bg-white/[0.03] px-3 text-xs font-semibold text-v-on transition-colors hover:border-white/25 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {canSendAnother ? 'Send another message' : cooldownLabel}
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit((values) => {
                  if (getSupportCooldownLeft() > 0) {
                    setCooldownLeft(getSupportCooldownLeft())
                    return
                  }
                  mutation.mutate(values)
                })}
                className="space-y-4"
                noValidate
              >
                <div>
                  <label
                    htmlFor="support-subject"
                    className="mb-1.5 block text-xs font-medium text-v-muted"
                  >
                    Subject <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    id="support-subject"
                    type="text"
                    maxLength={200}
                    placeholder="e.g. Credits not updating"
                    className={fieldClass}
                    {...register('subject')}
                  />
                </div>

                <div>
                  <label
                    htmlFor="support-message"
                    className="mb-1.5 block text-xs font-medium text-v-muted"
                  >
                    Describe your problem
                  </label>
                  <textarea
                    id="support-message"
                    rows={7}
                    maxLength={5000}
                    placeholder="What happened? Project name, steps to reproduce, or anything else that helps…"
                    className={`resize-y ${fieldClass}`}
                    aria-invalid={errors.message ? true : undefined}
                    {...register('message', {
                      required: 'Please describe your problem',
                      minLength: {
                        value: 10,
                        message: 'Add a bit more detail (at least 10 characters)',
                      },
                    })}
                  />
                  {errors.message && (
                    <p className="mt-1.5 text-xs text-v-error">{errors.message.message}</p>
                  )}
                </div>

                {errorMessage && <p className="text-xs text-v-error">{errorMessage}</p>}
                {!errorMessage && cooldownLeft > 0 && (
                  <p className="text-xs text-v-muted">
                    You can send another support message in {cooldownLabel.toLowerCase()}.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                  <button
                    type="submit"
                    disabled={mutation.isPending || cooldownLeft > 0}
                    className="inline-flex h-8 items-center justify-center rounded-md bg-[#238636] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mutation.isPending
                      ? 'Sending…'
                      : cooldownLeft > 0
                        ? cooldownLabel
                        : 'Send message'}
                  </button>
                  <p className="text-xs text-v-muted">Include as much context as you can.</p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
