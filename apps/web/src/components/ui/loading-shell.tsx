'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LoadingShellProps {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

export function LoadingShell({ title, description, className, children }: LoadingShellProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[40vh] px-4 sm:px-8', className)}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-md"
      >
        <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-sm font-medium text-zinc-950 mb-1">{title}</h2>
        {description && <p className="text-sm text-zinc-500">{description}</p>}
        {children}
      </motion.div>
    </div>
  )
}
