import { useEffect, useState } from 'react'
import type { CourseRecord } from '../student-core'
import {
  extractSavedCourseIds,
  fetchCourseDetail,
  fetchOptionalSavedCourses,
  getCachedRecommendations,
  removeSavedCourse,
  saveCourse,
} from '../services/student-api'

interface RecommendationMeta {
  score?: number
  matched_terms?: string[]
}

export function useCourseDetail(courseId?: string) {
  const [course, setCourse] = useState<CourseRecord | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [recommendationMeta, setRecommendationMeta] = useState<RecommendationMeta | null>(null)

  useEffect(() => {
    async function loadCourseDetail() {
      if (!courseId) {
        setErrorText('Không tìm thấy mã khóa học.')
        setLoading(false)
        return
      }

      setLoading(true)
      setErrorText('')

      try {
        const [courseResponse, savedCourses] = await Promise.all([
          fetchCourseDetail(courseId),
          fetchOptionalSavedCourses(),
        ])

        setCourse(courseResponse)
        const matchedRecommendation =
          getCachedRecommendations().find((item) => String(item.id) === String(courseId)) ?? null
        setRecommendationMeta(
          matchedRecommendation
            ? {
                score: matchedRecommendation.score,
                matched_terms: matchedRecommendation.matched_terms,
              }
            : null,
        )
        setIsSaved(extractSavedCourseIds(savedCourses).includes(Number(courseId)))
      } catch {
        setErrorText('Không thể tải nội dung khóa học này.')
      } finally {
        setLoading(false)
      }
    }

    void loadCourseDetail()
  }, [courseId])

  async function toggleSavedCourse() {
    if (!course) {
      return false
    }

    try {
      if (isSaved) {
        await removeSavedCourse(course.id)
        setIsSaved(false)
      } else {
        await saveCourse(course.id)
        setIsSaved(true)
      }

      setErrorText('')
      return true
    } catch {
      setErrorText('Không thể cập nhật danh sách khóa học đã lưu.')
      return false
    }
  }

  return {
    course,
    isSaved,
    loading,
    errorText,
    recommendationMeta,
    toggleSavedCourse,
  }
}
