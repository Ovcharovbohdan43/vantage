import { apiFetch } from '@/lib/api/client'
import type {
  CreateProjectPayload,
  Project,
  ProjectListResponse,
  ProjectStatusResponse,
} from '@/lib/api/types'

export function listProjects() {
  return apiFetch<ProjectListResponse>('/api/v1/projects')
}

export function getProject(id: string) {
  return apiFetch<Project>(`/api/v1/projects/${id}`)
}

export function getProjectStatus(id: string) {
  return apiFetch<ProjectStatusResponse>(`/api/v1/projects/${id}/status`)
}

export function createProject(payload: CreateProjectPayload) {
  return apiFetch<Project>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function retryProject(id: string) {
  return apiFetch<Project>(`/api/v1/projects/${id}/retry`, {
    method: 'POST',
  })
}

export function cancelProject(id: string) {
  return apiFetch<Project>(`/api/v1/projects/${id}/cancel`, {
    method: 'POST',
  })
}
