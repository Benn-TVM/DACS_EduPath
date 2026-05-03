import { useEffect, useState } from 'react'
import { hasAuthSession } from '../../../services/api'
import type { CourseRecord } from '../student-core'
import {
  extractSavedCourseIds,
  fetchCatalogCourses,
  fetchOptionalRecommendations,
  fetchOptionalSavedCourses,
  removeSavedCourse,
  saveCourse,
} from '../services/student-api'

export function useDashboardData() {
  const [baseCourses, setBaseCourses] = useState<CourseRecord[]>([])
  const [recommendationCourses, setRecommendationCourses] = useState<CourseRecord[]>([])
  const [savedCourseIds, setSavedCourseIds] = useState<number[]>([])
  const [courseSource, setCourseSource] = useState<'catalog' | 'recommendation'>('catalog')
  const [summaryText, setSummaryText] = useState('Đang tải dữ liệu khóa học...')
  const [errorText, setErrorText] = useState('')
  const [isCatalogLoading, setIsCatalogLoading] = useState(true)
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(true)

  /** Backward-compatible: true khi cả 2 phần đều chưa xong */
  const isLoading = isCatalogLoading

  async function refreshDashboardData() {
    const isAuthenticated = hasAuthSession()

    setIsCatalogLoading(true)
    setIsRecommendationLoading(true)
    setErrorText('')

    if (!isAuthenticated) {
      // Guest: chỉ cần catalog, không cần recommendation riêng
      try {
        const catalogCourses = await fetchCatalogCourses()
        setBaseCourses(catalogCourses)
        setRecommendationCourses(catalogCourses.slice(0, 10))
        setCourseSource('catalog')
        setSummaryText('Khám phá danh mục khóa học công khai. Đăng nhập hoặc đăng ký để nhận gợi ý cá nhân hóa và lưu khóa học.')
        setSavedCourseIds([])
      } catch {
        setErrorText('Không thể tải danh sách khóa học từ máy chủ.')
      } finally {
        setIsCatalogLoading(false)
        setIsRecommendationLoading(false)
      }
      return
    }

    // Authenticated: fetch TẤT CẢ song song
    const catalogPromise = fetchCatalogCourses()
    const recommendationPromise = fetchOptionalRecommendations()
    const savedPromise = fetchOptionalSavedCourses()

    // Catalog về trước → hiển thị "Tất cả khóa học" ngay
    catalogPromise
      .then((catalogCourses) => {
        setBaseCourses(catalogCourses)
        // Tạm dùng catalog cho spotlight cho đến khi recommendations về
        setRecommendationCourses((prev) => (prev.length > 0 ? prev : catalogCourses.slice(0, 10)))
        setIsCatalogLoading(false)
      })
      .catch(() => {
        setErrorText('Không thể tải danh sách khóa học từ máy chủ.')
        setIsCatalogLoading(false)
      })

    // Recommendations + Saved về sau → cập nhật spotlight
    Promise.all([catalogPromise.catch(() => [] as CourseRecord[]), recommendationPromise, savedPromise])
      .then(([catalogCourses, recommendedCourses, savedCourses]) => {
        const nextRecommendations =
          recommendedCourses.length > 0 ? recommendedCourses.slice(0, 10) : catalogCourses.slice(0, 10)

        setRecommendationCourses(nextRecommendations)
        setCourseSource(recommendedCourses.length > 0 ? 'recommendation' : 'catalog')
        setSummaryText(
          recommendedCourses.length > 0
            ? 'Top 10 phù hợp được cá nhân hóa từ hồ sơ onboarding, còn toàn bộ danh sách bên dưới lấy trực tiếp từ kho SQL Server.'
            : 'Top 10 đang lấy từ kho dữ liệu SQL Server, bên dưới là toàn bộ danh mục khóa học hiện có trong hệ thống.',
        )
        setSavedCourseIds(extractSavedCourseIds(savedCourses))
      })
      .finally(() => {
        setIsRecommendationLoading(false)
      })
  }

  useEffect(() => {
    void refreshDashboardData()
  }, [])

  async function toggleSavedCourse(courseId: number) {
    if (!hasAuthSession()) {
      setErrorText('Vui lòng đăng nhập để lưu khóa học.')
      return false
    }

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
    baseCourses,
    recommendationCourses,
    savedCourseIds,
    courseSource,
    summaryText,
    errorText,
    isLoading,
    isRecommendationLoading,
    refreshDashboardData,
    toggleSavedCourse,
  }
}
