interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[]
}

/** Safe JSON-LD script for search engines (SSR). */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
