import { useCallback, useEffect, useState } from 'react'
import api from '../../../services/api'

export interface RoadmapStepRecord {
  id: number
  order: number
  phase_name: string
  description: string
  skills: string[]
  is_completed: boolean
  course: {
    id: number
    title: string
    course_code: string | null
    provider: string
    course_url: string
  } | null
}

export interface RoadmapRecord {
  id: number
  title: string
  input_text: string
  target_role: string
  extracted_skills: string[]
  steps: RoadmapStepRecord[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoadmapListItem {
  id: number
  title: string
  target_role: string
  step_count: number
  completed_count: number
  is_active: boolean
  created_at: string
}

export function useRoadmap() {
  const [roadmapList, setRoadmapList] = useState<RoadmapListItem[]>([])
  const [activeRoadmap, setActiveRoadmap] = useState<RoadmapRecord | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [successText, setSuccessText] = useState('')

  const fetchRoadmapList = useCallback(async () => {
    try {
      const response = await api.get<{ count: number; results: RoadmapListItem[] }>('roadmaps/')
      setRoadmapList(response.data.results)
    } catch {
      /* silently ignore list errors */
    }
  }, [])

  useEffect(() => {
    void fetchRoadmapList()
  }, [fetchRoadmapList])

  async function generateRoadmap(inputText: string) {
    setIsGenerating(true)
    setErrorText('')
    setSuccessText('')

    try {
      const response = await api.post<{ message: string; roadmap: RoadmapRecord }>(
        'roadmap/generate/',
        { input_text: inputText },
      )
      setActiveRoadmap(response.data.roadmap)
      setSuccessText(response.data.message)
      await fetchRoadmapList()
      return response.data.roadmap
    } catch (error: unknown) {
      const detail = extractErrorDetail(error)
      setErrorText(detail || 'Không thể tạo lộ trình. Vui lòng thử lại.')
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  async function loadRoadmapDetail(roadmapId: number) {
    setIsLoading(true)
    setErrorText('')

    try {
      const response = await api.get<RoadmapRecord>(`roadmaps/${roadmapId}/`)
      setActiveRoadmap(response.data)
    } catch {
      setErrorText('Không thể tải chi tiết lộ trình.')
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleStepComplete(roadmapId: number, stepId: number, isCompleted: boolean) {
    try {
      const response = await api.put<RoadmapRecord>(`roadmaps/${roadmapId}/`, {
        step_id: stepId,
        is_completed: isCompleted,
      })
      setActiveRoadmap(response.data)
      await fetchRoadmapList()
    } catch {
      setErrorText('Không thể cập nhật tiến độ.')
    }
  }

  async function deleteRoadmap(roadmapId: number) {
    try {
      await api.delete(`roadmaps/${roadmapId}/`)
      setActiveRoadmap(null)
      setRoadmapList((current) => current.filter((item) => item.id !== roadmapId))
    } catch {
      setErrorText('Không thể xóa lộ trình.')
    }
  }

  function clearActiveRoadmap() {
    setActiveRoadmap(null)
    setErrorText('')
    setSuccessText('')
  }

  return {
    roadmapList,
    activeRoadmap,
    isGenerating,
    isLoading,
    errorText,
    successText,
    generateRoadmap,
    loadRoadmapDetail,
    toggleStepComplete,
    deleteRoadmap,
    clearActiveRoadmap,
  }
}

function extractErrorDetail(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
  ) {
    const response = (error as { response: { data?: unknown } }).response
    if (response?.data && typeof response.data === 'object' && 'detail' in response.data) {
      return String((response.data as { detail: unknown }).detail)
    }
  }
  return ''
}
