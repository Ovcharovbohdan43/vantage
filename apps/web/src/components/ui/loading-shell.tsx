'use client'

import { motion } from 'framer-motion'
import { PolygonSpinner } from '@/components/ui/polygon-spinner'
import { cn } from '@/lib/utils'

interface LoadingShellProps {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

export function LoadingShell({ title, description, className, children }: LoadingShellProps) {
  return (
    <div className={cn('flex min-h-[40vh] flex-col items-center justify-center px-4 sm:px-8', className)}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex max-w-md flex-col items-center gap-5 text-center"
      >
        <PolygonSpinner size={56} className="text-v-on" label={title} />
        <div className="relative z-10">
          <h2 className="mb-1 text-sm font-medium text-v-on">{title}</h2>
          {description && <p className="text-sm text-v-muted">{description}</p>}
          {children}
        </div>
      </motion.div>
    </div>
  )
}
