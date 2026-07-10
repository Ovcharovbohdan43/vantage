import { ResearchProgressView } from '@/components/research-progress-view'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ResearchProgressPage({ params }: PageProps) {
  const { id } = await params
  return <ResearchProgressView projectId={id} />
}
