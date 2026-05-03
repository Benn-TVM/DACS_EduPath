import { useState } from 'react'
import api from '../../../services/api'

export interface ComparisonCourse {
  id: number
  title: string
  provider: string
  course_code: string
  course_url: string
  difficulty_level: string
  estimated_hours: number | null
  price_type: string
  certificate_type: string
}

export interface ComparisonResult {
  courses: ComparisonCourse[]
  ai_summary: string
  count: number
}

function normalizeSelection(ids: number[]) {
  return Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0))).slice(0, 4)
}

export function useCompare(initialSelectedIds: number[] = []) {
  const [selectedIds, setSelectedIds] = useState<number[]>(() => normalizeSelection(initialSelectedIds))
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [isComparing, setIsComparing] = useState(false)
  const [errorText, setErrorText] = useState('')

  function toggleCourseSelection(courseId: number) {
    setSelectedIds((current) => {
      if (current.includes(courseId)) {
        return current.filter((id) => id !== courseId)
      }
      if (current.length >= 4) {
        return current
      }
      return [...current, courseId]
    })
  }

  function clearSelection() {
    setSelectedIds([])
    setResult(null)
    setErrorText('')
  }

  function replaceSelection(nextIds: number[]) {
    setSelectedIds(normalizeSelection(nextIds))
    setResult(null)
    setErrorText('')
  }

  async function compareCourses() {
    if (selectedIds.length < 2) {
      setErrorText('Vui lòng chọn ít nhất 2 khóa học để so sánh.')
      return null
    }

    setIsComparing(true)
    setErrorText('')

    try {
      const response = await api.post<ComparisonResult>('courses/compare/', {
        course_ids: selectedIds,
      })
      setResult(response.data)
      return response.data
    } catch (error: unknown) {
      const detail = extractError(error)
      setErrorText(detail || 'Không thể so sánh. Vui lòng thử lại.')
      return null
    } finally {
      setIsComparing(false)
    }
  }

  return {
    selectedIds,
    result,
    isComparing,
    errorText,
    toggleCourseSelection,
    clearSelection,
    replaceSelection,
    compareCourses,
  }
}

function extractError(error: unknown): string {
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
