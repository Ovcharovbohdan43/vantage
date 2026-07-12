'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  'mt-2 w-full rounded-lg border border-white/12 bg-[#1c1b1d] px-3 py-2.5 text-sm text-[#e5e1e4] placeholder:text-[#958ea0] outline-none transition-colors focus:border-[#d0bcff]/45 focus:ring-1 focus:ring-[#d0bcff]/20'
const labelClass = 'text-sm font-medium text-[#cbc3d7]'
const hintClass = 'font-normal text-[#958ea0]'

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

  useEffect(() => {
    if (!credits) return
    if (credits.free_preview_available) {
      setValue('mode', 'preview')
    } else {
      setValue('mode', 'full')
    }
  }, [credits, setValue])

  const canSubmit = description.trim().length > 20 && watch('category').length > 0

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
    } else {
      if (!credits || !canAffordDepth(credits, data.depth)) {
        setPricingOpen(true)
        return
      }
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

  const selectedCost = credits ? depthCost(credits, depth) : 1

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-[#958ea0] transition-colors hover:text-[#d0bcff]"
        >
          Back
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm font-medium text-[#e5e1e4]">New analysis</span>
      </div>

      <div className="mb-8">
        <h1 className="mb-1 text-xl font-semibold tracking-tight text-[#e5e1e4]">
          Validate your startup idea
        </h1>
        <p className="text-sm leading-relaxed text-[#cbc3d7]">
          {isFirstResearch
            ? 'Your first analysis is free — a quick teaser of the market before you spend credits.'
            : 'Choose how deep to go. More reviews and competitors cost more credits, but give stronger evidence.'}
        </p>
      </div>

      {credits && <CreditsMeter credits={credits} className="mb-6" />}

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />

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
          <p className="mt-2 text-xs text-[#958ea0]">
            {description.length} chars · aim for 80+
          </p>
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
                <option key={i} value={i} className="bg-[#1c1b1d] text-[#e5e1e4]">
                  {i}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className={labelClass}>Data sources</p>
          <p className="mb-3 mt-1 text-xs text-[#958ea0]">G2 and Capterra — real user reviews</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SOURCES.map((s) => {
              const selected = sources.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSource(s.id)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-colors',
                    selected
                      ? 'border-[#d0bcff]/45 bg-[#d0bcff]/10 text-[#e5e1e4]'
                      : 'border-white/10 text-[#cbc3d7] hover:border-[#d0bcff]/30',
                  )}
                >
                  <div className="text-sm font-medium">{s.label}</div>
                  <div
                    className={cn(
                      'mt-0.5 text-xs',
                      selected ? 'text-[#d0bcff]/80' : 'text-[#958ea0]',
                    )}
                  >
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
            <div className="mt-3 rounded-xl border border-[#4edea3]/25 bg-[#4edea3]/8 p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-[#e5e1e4]">Free preview</span>
                <span className="font-mono text-xs text-[#4edea3]">$0 · once</span>
              </div>
              <p className="text-xs leading-relaxed text-[#cbc3d7]">
                3 competitors, 5 reviews each, top 3 pain themes. No quotes or full complaint breakdowns.
                After this, all research uses credits.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className={labelClass}>Research depth</p>
            <p className="mb-3 mt-1 text-xs text-[#958ea0]">
              Deeper runs read more reviews — better signal, higher credit cost
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DEPTH_OPTIONS.map((option) => {
                const cost = credits ? depthCost(credits, option.id) : 1
                const affordable = credits ? canAffordDepth(credits, option.id) : true
                const selected = depth === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectDepth(option.id)}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-all',
                      selected
                        ? 'border-[#d0bcff]/50 bg-[#d0bcff]/10 shadow-[0_0_24px_rgba(208,188,255,0.12)]'
                        : 'border-white/10 hover:border-[#d0bcff]/30',
                      !affordable && 'opacity-55',
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-[#e5e1e4]">{option.label}</span>
                      <span className="font-mono text-xs text-[#d0bcff]">
                        {cost} credit{cost === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="mb-2 text-xs leading-relaxed text-[#cbc3d7]">{option.desc}</p>
                    <p className="font-mono text-[10px] text-[#958ea0]">
                      {option.competitors} competitors · {option.reviews} reviews each
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="border-t border-white/8 pt-6">
          <div className="mb-5 rounded-xl border border-[#ff8adf]/25 bg-[#ff8adf]/8 px-4 py-3">
            <p className="text-sm leading-relaxed text-[#e5e1e4]/90">
              Before you start: you may need to complete a{' '}
              <span className="font-medium text-[#ff8adf]">captcha once</span> while we reach review
              sources. After that, collection continues automatically — usually about 10 minutes
              while we process thousands of real reviews for patterns.
            </p>
          </div>
          {submitError && <p className="mb-4 text-sm text-[#ffb4ab]">{submitError}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="landing-primary-glow inline-flex items-center justify-center rounded-lg bg-[#d0bcff] px-6 py-2.5 text-sm font-bold text-[#3c0091] transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-45"
            >
              {isSubmitting
                ? 'Starting…'
                : isFirstResearch
                  ? 'Run free preview'
                  : `Start analysis — ${selectedCost} credit${selectedCost === 1 ? '' : 's'}`}
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2.5 text-sm text-[#958ea0] transition-colors hover:text-[#d0bcff]"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
