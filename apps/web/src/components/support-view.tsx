'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'
import { submitSupportRequest } from '@/lib/api/support'

type FormValues = {
  subject: string
  message: string
}

export function SupportView() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { subject: '', message: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      submitSupportRequest({
        subject: values.subject.trim(),
        message: values.message.trim(),
      }),
    onSuccess: () => {
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

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 h-48 w-48 rounded-full bg-[#d0bcff]/10 blur-[90px]" />
      </div>

      <h1 className="mb-2 text-xl font-semibold tracking-tight text-[#e5e1e4]">Support</h1>
      <p className="mb-6 max-w-lg text-sm leading-relaxed text-[#cbc3d7]">
        Describe what went wrong or what you need help with. We&apos;ll get back to you by email.
      </p>

      {sent ? (
        <div className="rounded-xl border border-[#d0bcff]/25 bg-[#1c1b1d]/80 p-6">
          <p className="text-sm font-medium text-[#d0bcff]">Message sent</p>
          <p className="mt-2 text-sm text-[#cbc3d7]">
            Thanks — we received your request and will reply to your account email.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false)
              mutation.reset()
            }}
            className="mt-4 text-sm text-[#958ea0] transition-colors hover:text-[#d0bcff]"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="rounded-xl border border-white/10 bg-[#1c1b1d]/80 p-5 sm:p-6"
          noValidate
        >
          <label htmlFor="support-subject" className="mb-1.5 block text-xs font-medium text-[#958ea0]">
            Subject <span className="font-normal">(optional)</span>
          </label>
          <input
            id="support-subject"
            type="text"
            maxLength={200}
            placeholder="e.g. Credits not updating"
            className="mb-4 w-full rounded-lg border border-white/12 bg-[#131315] px-3 py-2.5 text-sm text-[#e5e1e4] outline-none placeholder:text-[#958ea0] focus:border-[#d0bcff]/45"
            {...register('subject')}
          />

          <label htmlFor="support-message" className="mb-1.5 block text-xs font-medium text-[#958ea0]">
            Describe your problem
          </label>
          <textarea
            id="support-message"
            rows={8}
            maxLength={5000}
            placeholder="What happened? Steps to reproduce, project name, or anything else that helps…"
            className="mb-1 w-full resize-y rounded-lg border border-white/12 bg-[#131315] px-3 py-2.5 text-sm text-[#e5e1e4] outline-none placeholder:text-[#958ea0] focus:border-[#d0bcff]/45"
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
            <p className="mb-3 text-xs text-[#ff8adf]">{errors.message.message}</p>
          )}

          {errorMessage && <p className="mb-3 text-xs text-[#ff8adf]">{errorMessage}</p>}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="landing-primary-glow mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[#d0bcff] px-4 py-2.5 text-sm font-semibold text-[#3c0091] transition-transform hover:-translate-y-0.5 disabled:opacity-60 sm:w-auto"
          >
            {mutation.isPending ? 'Sending…' : 'Send message'}
          </button>
        </form>
      )}
    </div>
  )
}
