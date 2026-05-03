import { useEffect, useState } from 'react'
import type { CourseRecord } from '../student-core'
import {
  extractSavedCourseIds,
  fetchOptionalSavedCourses,
  fetchSearchResults,
  removeSavedCourse,
  saveCourse,
} from '../services/student-api'

export function useSearchResults(queryText: string) {
  const [results, setResults] = useState<CourseRecord[]>([])
  const [savedCourseIds, setSavedCourseIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    async function loadSearchResults() {
      setLoading(true)
      setErrorText('')

      try {
        const [nextResults, savedCourses] = await Promise.all([
          fetchSearchResults(queryText),
          fetchOptionalSavedCourses(),
        ])

        setResults(nextResults)
        setSavedCourseIds(extractSavedCourseIds(savedCourses))
      } catch {
        setErrorText('Không thể tải kết quả tìm kiếm. Vui lòng thử lại.')
      } finally {
        setLoading(false)
      }
    }

    void loadSearchResults()
  }, [queryText])

  async function toggleSavedCourse(courseId: number) {
    const isSaved = savedCourseIds.includes(courseId)

    try {
      if (isSaved) {
        await removeSavedCourse(courseId)
        setSavedCourseIds((current) => current.filter((id) => id !== courseId))
      } else {
        await saveCourse(courseId)
        setSavedCourseIds((current) => [...current, courseId])
      }

      setErrorText('')
      return true
    } catch {
      setErrorText('Không thể cập nhật danh sách khóa học đã lưu. Vui lòng thử lại.')
      return false
    }
  }

  return {
    results,
    savedCourseIds,
    loading,
    errorText,
    toggleSavedCourse,
  }
}
