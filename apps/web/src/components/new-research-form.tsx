'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createProject } from '@/lib/api/projects'
import { getCredits } from '@/lib/api/billing'
import { ApiError } from '@/lib/api/client'
import type { ResearchDepth, ResearchMode } from '@/lib/api/types'
import { CreditsMeter } from '@/components/credits-meter'
import { PricingModal } from '@/components/pricing-modal'
import { cn } from '@/lib/utils'

const INDUSTRIES = [
  'Productivity',
  'Developer tools',
  'Fintech',
  'HR Tech',
  'Sales',
  'Marketing',
  'E-commerce',
  'Legal Tech',
  'Health Tech',
  'EdTech',
  'Analytics',
  'Agency tools',
  'No-code / Low-code',
  'Other',
]

const SOURCES = [
  { id: 'g2', label: 'G2', desc: 'B2B software reviews' },
  { id: 'capterra', label: 'Capterra', desc: 'Business software listings' },
] as const

const DEPTH_OPTIONS: {
  id: ResearchDepth
  label: string
  desc: string
  competitors: number
  reviews: number
}[] = [
  {
    id: 'shallow',
    label: 'Shallow',
    desc: 'Quick scan — enough to spot obvious red flags',
    competitors: 5,
    reviews: 50,
  },
  {
    id: 'standard',
    label: 'Standard',
    desc: 'Balanced depth for most validation decisions',
    competitors: 10,
    reviews: 100,
  },
  {
    id: 'deep',
    label: 'Deep',
    desc: 'Maximum coverage when the stakes are high',
    competitors: 15,
    reviews: 200,
  },
]

type FormValues = {
  title: string
  description: string
  targetAudience: string
  category: string
  sources: string[]
  mode: ResearchMode
  depth: ResearchDepth
}

const fieldClass =
  'mt-2 w-full rounded-lg border border-white/12 bg-v-surface px-3 py-2.5 text-sm text-v-on placeholder:text-v-muted outline-none transition-colors focus:border-v-primary/45 focus:ring-1 focus:ring-v-primary/20'
const labelClass = 'text-sm font-medium text-v-muted'
const hintClass = 'font-normal text-v-muted'

function depthCost(credits: { depth_credit_costs?: Record<string, number> }, depth: ResearchDepth) {
  return credits.depth_credit_costs?.[depth] ?? (depth === 'shallow' ? 1 : depth === 'standard' ? 2 : 3)
}

function canAffordDepth(
  credits: { total_credits: number; depth_credit_costs?: Record<string, number> },
  depth: ResearchDepth,
) {
  return credits.total_credits >= depthCost(credits, depth)
}

export function NewResearchForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pricingOpen, setPricingOpen] = useState(false)

  const { data: credits } = useQuery({
    queryKey: ['billing-credits'],
    queryFn: getCredits,
    staleTime: 0,
  })

  const isFirstResearch = credits?.free_preview_available ?? false

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      targetAudience: '',
      category: '',
      sources: ['g2', 'capterra'],
      mode: 'preview',
      depth: 'shallow',
    },
  })

  const description = watch('description')
  const sources = watch('sources')
  const depth = watch('depth')
  const category = watch('category')

  useEffect(() => {
    if (!credits) return
    if (credits.free_preview_available) {
      setValue('mode', 'preview')
    } else {
      setValue('mode', 'full')
    }
  }, [credits, setValue])

  const canSubmit = description.trim().length > 20 && category.length > 0
  const selectedDepth = DEPTH_OPTIONS.find((d) => d.id === depth) ?? DEPTH_OPTIONS[0]!
  const selectedCost = credits ? depthCost(credits, depth) : 1

  const estimate = useMemo(() => {
    if (isFirstResearch) {
      return {
        mode: 'Free preview',
        cost: '0 credits',
        competitors: 3,
        reviewsEach: 5,
        note: 'Teaser only — top themes, no full quotes.',
      }
    }
    return {
      mode: selectedDepth.label,
      cost: `${selectedCost} credit${selectedCost === 1 ? '' : 's'}`,
      competitors: selectedDepth.competitors,
      reviewsEach: selectedDepth.reviews,
      note: selectedDepth.desc,
    }
  }, [isFirstResearch, selectedCost, selectedDepth])

  function toggleSource(id: string) {
    const next = sources.includes(id) ? sources.filter((s) => s !== id) : [...sources, id]
    setValue('sources', next, { shouldDirty: true })
  }

  function selectDepth(next: ResearchDepth) {
    if (!credits) {
      setValue('depth', next)
      return
    }
    if (!canAffordDepth(credits, next)) {
      setPricingOpen(true)
      return
    }
    setValue('depth', next)
  }

  async function onSubmit(data: FormValues) {
    setSubmitError(null)

    if (isFirstResearch) {
      if (!credits?.can_run_preview) {
        setPricingOpen(true)
        return
      }
    } else if (!credits || !canAffordDepth(credits, data.depth)) {
      setPricingOpen(true)
      return
    }

    try {
      const project = await createProject({
        title: data.title,
        description: data.description,
        target_audience: data.targetAudience || undefined,
        category: data.category,
        research_mode: isFirstResearch ? 'preview' : 'full',
        research_depth: isFirstResearch ? undefined : data.depth,
        sources: data.sources,
      })
      await queryClient.invalidateQueries({ queryKey: ['billing-credits'] })
      router.push(`/research/${project.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        await queryClient.invalidateQueries({ queryKey: ['billing-credits'] })
        setPricingOpen(true)
        return
      }
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to start analysis')
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-v-muted transition-colors hover:text-v-on">
          Back
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm font-medium text-v-on">New research</span>
      </div>

      <div className="mb-8 max-w-2xl">
        <h1 className="mb-1 text-xl font-semibold tracking-tight text-v-on">
          Validate your startup idea
        </h1>
        <p className="text-sm leading-relaxed text-v-muted">
          {isFirstResearch
            ? 'Your first analysis is free — a quick teaser of the market before you spend credits.'
            : 'Choose how deep to go. More reviews and competitors cost more credits, but give stronger evidence.'}
        </p>
      </div>

      {credits && (
        <CreditsMeter
          credits={credits}
          className="mb-6 lg:hidden"
          onBuyCredits={() => setPricingOpen(true)}
        />
      )}

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="title" className={labelClass}>
              Project title
            </label>
            <input
              id="title"
              className={fieldClass}
              placeholder="e.g. AI invoice tool for freelancers"
              {...register('title')}
            />
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
              Startup idea <span className={hintClass}>(required)</span>
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Describe your product idea and what problem it solves..."
              className={cn(fieldClass, 'resize-none leading-relaxed')}
              {...register('description', { required: true, minLength: 21 })}
            />
            <p className="mt-2 text-xs text-v-muted">{description.length} chars · aim for 80+</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="targetAudience" className={labelClass}>
                Target audience <span className={hintClass}>(optional)</span>
              </label>
              <input
                id="targetAudience"
                className={fieldClass}
                placeholder="e.g. solo founders, remote engineering teams"
                {...register('targetAudience')}
              />
            </div>
            <div>
              <label htmlFor="category" className={labelClass}>
                Industry <span className={hintClass}>(required)</span>
              </label>
              <select
                id="category"
                className={cn(fieldClass, 'appearance-none')}
                {...register('category', { required: true })}
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i} className="bg-v-surface text-v-on">
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className={labelClass}>Data sources</p>
            <p className="mb-3 mt-1 text-xs text-v-muted">G2 and Capterra — real user reviews</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SOURCES.map((s) => {
                const selected = sources.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSource(s.id)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors',
                      selected
                        ? 'border-v-primary/40 bg-v-primary/10 text-v-on'
                        : 'border-white/10 text-v-muted hover:border-white/20 hover:text-v-on',
                    )}
                  >
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className={cn('mt-0.5 text-xs', selected ? 'text-v-primary/80' : 'text-v-muted')}>
                      {s.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {isFirstResearch ? (
            <div>
              <p className={labelClass}>Your first analysis</p>
              <div className="mt-3 rounded-lg border border-v-tertiary/25 bg-v-tertiary/8 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-v-on">Free preview</span>
                  <span className="font-landing-mono text-xs text-v-tertiary">$0 · once</span>
                </div>
                <p className="text-xs leading-relaxed text-v-muted">
                  3 competitors, 5 reviews each, top 3 pain themes. No quotes or full complaint
                  breakdowns. After this, all research uses credits.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className={labelClass}>Research depth</p>
              <p className="mb-3 mt-1 text-xs text-v-muted">
                Deeper runs read more reviews — better signal, higher credit cost
              </p>
              <div
                className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.06] sm:grid-cols-3"
                role="radiogroup"
                aria-label="Research depth"
              >
                {DEPTH_OPTIONS.map((option) => {
                  const cost = credits ? depthCost(credits, option.id) : 1
                  const affordable = credits ? canAffordDepth(credits, option.id) : true
                  const selected = depth === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => selectDepth(option.id)}
                      className={cn(
                        'bg-v-bg p-4 text-left transition-colors',
                        selected ? 'bg-v-surface ring-1 ring-inset ring-v-primary/50' : 'hover:bg-v-surface/80',
                        !affordable && 'opacity-55',
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-v-on">{option.label}</span>
                        <span className="font-landing-mono text-xs text-v-primary">
                          {cost} credit{cost === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="mb-2 text-xs leading-relaxed text-v-muted">{option.desc}</p>
                      <p className="font-landing-mono text-[10px] text-v-muted">
                        {option.competitors} competitors · {option.reviews} reviews each
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="border-t border-white/[0.06] pt-6">
            <div className="mb-5 rounded-lg border border-white/[0.08] bg-v-surface px-4 py-3">
              <p className="text-sm leading-relaxed text-v-muted">
                Before you start: you may need to complete a{' '}
                <span className="font-medium text-v-on">captcha once</span> while we reach review
                sources. After that, collection continues automatically — usually about 10 minutes.
              </p>
            </div>
            {submitError && <p className="mb-4 text-sm text-v-error">{submitError}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-md bg-v-on px-6 text-sm font-medium text-v-bg transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-45"
              >
                {isSubmitting
                  ? 'Starting…'
                  : isFirstResearch
                    ? 'Run free preview'
                    : `Start analysis — ${selectedCost} credit${selectedCost === 1 ? '' : 's'}`}
              </button>
              <Link
                href="/dashboard"
                className="px-4 py-2.5 text-sm text-v-muted transition-colors hover:text-v-on"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>

        <aside className="hidden lg:sticky lg:top-6 lg:block">
          {credits && (
            <CreditsMeter
              credits={credits}
              className="mb-4"
              onBuyCredits={() => setPricingOpen(true)}
            />
          )}
          <div className="rounded-lg border border-white/[0.08] bg-v-surface p-5">
            <p className="mb-3 font-landing-mono text-[11px] uppercase tracking-[0.14em] text-v-muted">
              Live estimate
            </p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-v-muted">Mode</dt>
                <dd className="font-medium text-v-on">{estimate.mode}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-v-muted">Cost</dt>
                <dd className="font-landing-mono tabular-nums text-v-primary">{estimate.cost}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-v-muted">Competitors</dt>
                <dd className="font-landing-mono tabular-nums text-v-on">{estimate.competitors}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-v-muted">Reviews each</dt>
                <dd className="font-landing-mono tabular-nums text-v-on">{estimate.reviewsEach}</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-white/[0.06] pt-3 text-xs leading-relaxed text-v-muted">
              {estimate.note}
            </p>
            <p className="mt-2 text-xs text-v-muted">
              Sources:{' '}
              {sources.length === 0
                ? 'none selected'
                : sources.map((s) => s.toUpperCase()).join(' · ')}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
