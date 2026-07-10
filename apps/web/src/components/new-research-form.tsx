'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { createProject } from '@/lib/api/projects'
import { getCredits } from '@/lib/api/billing'
import { ApiError } from '@/lib/api/client'
import type { ResearchDepth, ResearchMode } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditsMeter } from '@/components/credits-meter'
import { PricingModal } from '@/components/pricing-modal'

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
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pricingOpen, setPricingOpen] = useState(false)

  const { data: credits } = useQuery({
    queryKey: ['billing-credits'],
    queryFn: getCredits,
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
  const category = watch('category')
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

  const canSubmit = description.trim().length > 20 && category.length > 0

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
      router.push(`/research/${project.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setPricingOpen(true)
        return
      }
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to start analysis')
    }
  }

  const selectedCost = credits ? depthCost(credits, depth) : 1

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          Back
        </Link>
        <span className="text-zinc-200">/</span>
        <span className="text-sm text-zinc-950 font-medium">New analysis</span>
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-950 mb-1">Validate your startup idea</h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          {isFirstResearch
            ? 'Your first analysis is free — a quick teaser of the market before you spend credits.'
            : 'Choose how deep to go. More reviews and competitors cost more credits, but give a stronger verdict.'}
        </p>
      </div>

      {credits && <CreditsMeter credits={credits} className="mb-6" />}

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="title">Project title</Label>
          <Input
            id="title"
            className="mt-2"
            placeholder="e.g. AI invoice tool for freelancers"
            {...register('title')}
          />
        </div>

        <div>
          <Label htmlFor="description">
            Startup idea <span className="text-zinc-400 font-normal">(required)</span>
          </Label>
          <textarea
            id="description"
            rows={4}
            placeholder="Describe your product idea and what problem it solves..."
            className="mt-2 w-full text-sm border border-zinc-200 p-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors resize-none leading-relaxed"
            {...register('description', { required: true, minLength: 21 })}
          />
          <p className="text-xs text-zinc-400 mt-2">{description.length} chars · aim for 80+</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="targetAudience">
              Target audience <span className="text-zinc-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="targetAudience"
              className="mt-2"
              placeholder="e.g. solo founders, remote engineering teams"
              {...register('targetAudience')}
            />
          </div>
          <div>
            <Label htmlFor="category">
              Industry <span className="text-zinc-400 font-normal">(required)</span>
            </Label>
            <select
              id="category"
              className="mt-2 w-full text-sm border border-zinc-200 p-2.5 text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors bg-white"
              {...register('category', { required: true })}
            >
              <option value="">Select industry...</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>Data sources</Label>
          <p className="text-xs text-zinc-400 mt-1 mb-3">G2 and Capterra — real user reviews</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSource(s.id)}
                className={`text-left p-3 border transition-colors ${
                  sources.includes(s.id)
                    ? 'border-zinc-950 bg-zinc-950 text-white'
                    : 'border-zinc-200 hover:border-zinc-400 text-zinc-900'
                }`}
              >
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs mt-0.5 text-zinc-400">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {isFirstResearch ? (
          <div>
            <Label>Your first analysis</Label>
            <div className="mt-3 border border-zinc-950 bg-zinc-50 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-zinc-950">Free preview</span>
                <span className="text-xs font-mono text-emerald-700">$0 · once</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                3 competitors, 5 reviews each, top 3 pain themes. No quotes or build/pivot verdict.
                After this, all research uses credits.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <Label>Research depth</Label>
            <p className="text-xs text-zinc-400 mt-1 mb-3">
              Deeper runs read more reviews — better signal, higher credit cost
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DEPTH_OPTIONS.map((option) => {
                const cost = credits ? depthCost(credits, option.id) : 1
                const affordable = credits ? canAffordDepth(credits, option.id) : true
                const selected = depth === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectDepth(option.id)}
                    className={`text-left p-4 border transition-colors ${
                      selected ? 'border-zinc-950 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
                    } ${!affordable ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-950">{option.label}</span>
                      <span className="text-xs font-mono text-zinc-500">
                        {cost} credit{cost === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed mb-2">{option.desc}</p>
                    <p className="text-[10px] font-mono text-zinc-400">
                      {option.competitors} competitors · {option.reviews} reviews each
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="border-t border-zinc-100 pt-6">
          {submitError && <p className="text-sm text-red-600 mb-4">{submitError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!canSubmit || isSubmitting} className="px-6 py-2.5 h-auto">
              {isSubmitting
                ? 'Starting…'
                : isFirstResearch
                  ? 'Run free preview'
                  : `Start analysis — ${selectedCost} credit${selectedCost === 1 ? '' : 's'}`}
            </Button>
            <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-800 px-4 py-2.5">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
