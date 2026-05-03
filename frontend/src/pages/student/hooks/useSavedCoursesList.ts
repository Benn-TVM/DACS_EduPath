import { useEffect, useState } from 'react'
import type { SavedCourseRecord } from '../student-core'
import { fetchSavedCourses, removeSavedCourse } from '../services/student-api'

export function useSavedCoursesList() {
  const [savedCourses, setSavedCourses] = useState<SavedCourseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    async function loadSavedCourses() {
      setLoading(true)
      setErrorText('')

      try {
        const nextSavedCourses = await fetchSavedCourses()
        setSavedCourses(nextSavedCourses)
      } catch {
        setErrorText('Không thể tải danh sách khóa học đã lưu.')
      } finally {
        setLoading(false)
      }
    }

    void loadSavedCourses()
  }, [])

  async function handleRemoveSavedCourse(courseId: number) {
    try {
      await removeSavedCourse(courseId)
      setSavedCourses((current) => current.filter((item) => item.course.id !== courseId))
      setErrorText('')
      return true
    } catch {
      setErrorText('Không thể xóa khóa học khỏi danh sách đã lưu.')
      return false
    }
  }

  return {
    savedCourses,
    loading,
    errorText,
    removeCourse: handleRemoveSavedCourse,
  }
}
