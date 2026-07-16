'use client'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineMarkdown(text: string): string {
  let out = escapeHtml(text)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-v-primary underline underline-offset-2">$1</a>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-v-on">$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  out = out.replace(/`([^`]+)`/g, '<code class="rounded bg-white/5 px-1 py-0.5 font-landing-mono text-[13px] text-v-on">$1</code>')
  return out
}

function renderBlock(block: string): string {
  const trimmed = block.trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('### ')) {
    return `<h3 class="mt-8 mb-3 text-base font-semibold text-v-on">${inlineMarkdown(trimmed.slice(4))}</h3>`
  }
  if (trimmed.startsWith('## ')) {
    return `<h2 class="mt-10 mb-3 text-lg font-semibold tracking-tight text-v-on">${inlineMarkdown(trimmed.slice(3))}</h2>`
  }
  if (trimmed.startsWith('# ')) {
    return `<h1 class="mt-10 mb-4 text-xl font-semibold tracking-tight text-v-on">${inlineMarkdown(trimmed.slice(2))}</h1>`
  }

  const lines = trimmed.split('\n')
  if (lines.every((line) => line.startsWith('- ') || line.startsWith('* '))) {
    const items = lines
      .map((line) => `<li>${inlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`)
      .join('')
    return `<ul class="my-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-v-muted">${items}</ul>`
  }

  if (lines.every((line) => /^\d+\.\s/.test(line))) {
    const items = lines
      .map((line) => `<li>${inlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>`)
      .join('')
    return `<ol class="my-4 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-v-muted">${items}</ol>`
  }

  return `<p class="my-4 text-[15px] leading-relaxed text-v-muted">${inlineMarkdown(trimmed.replace(/\n/g, '<br />'))}</p>`
}

export function BlogMarkdown({ source }: { source: string }) {
  const html = source
    .split(/\n{2,}/)
    .map(renderBlock)
    .join('')

  return (
    <article
      className="blog-prose max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
