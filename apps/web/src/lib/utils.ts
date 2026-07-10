import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(email: string): string {
  const local = email.split('@')[0] ?? email
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  }
  return local.slice(0, 2).toUpperCase()
}
