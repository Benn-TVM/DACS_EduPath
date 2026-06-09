import { useEffect, useRef, useState } from 'react'
import { AUTH_SESSION_CHANGED_EVENT, hasAuthSession } from '../../../services/api'
import type { CourseRecord, CourseCategory } from '../student-core'
import {
  extractSavedCourseIds,
  fetchCatalogCoursePage,
  fetchCategories,
  fetchOptionalOnboardingProfile,
  fetchOptionalRecommendations,
  fetchOptionalSavedCourses,
  removeSavedCourse,
  saveCourse,
} from '../services/student-api'

const CATALOG_PAGE_SIZE = 240

export function useDashboardData() {
  const refreshRequestId = useRef(0)
  const [baseCourses, setBaseCourses] = useState<CourseRecord[]>([])
  const [recommendationCourses, setRecommendationCourses] = useState<CourseRecord[]>([])
  const [savedCourseIds, setSavedCourseIds] = useState<number[]>([])
  const [courseSource, setCourseSource] = useState<'catalog' | 'recommendation'>('catalog')
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [summaryText, setSummaryText] = useState('Đang tải dữ liệu khóa học...')
  const [errorText, setErrorText] = useState('')
  const [isCatalogLoading, setIsCatalogLoading] = useState(true)
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(true)
  const [isMoreCatalogLoading, setIsMoreCatalogLoading] = useState(false)
  const [catalogTotalCount, setCatalogTotalCount] = useState(0)
  const [catalogNextOffset, setCatalogNextOffset] = useState<number | null>(null)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasAuthSession())

  /** Backward-compatible: true khi cả 2 phần đều chưa xong */
  const isLoading = isCatalogLoading

  async function refreshDashboardData() {
    const requestId = refreshRequestId.current + 1
    refreshRequestId.current = requestId
    const isCurrentRequest = () => refreshRequestId.current === requestId
    const currentIsAuthenticated = hasAuthSession()
    setIsAuthenticated(currentIsAuthenticated)

    setIsCatalogLoading(true)
    setIsRecommendationLoading(true)
    setIsMoreCatalogLoading(false)
    setErrorText('')
    setCatalogTotalCount(0)
    setCatalogNextOffset(null)

    if (!currentIsAuthenticated) {
      // Guest: chỉ cần catalog và categories, không hiển thị Top 10
      setHasCompletedOnboarding(false)
      try {
        const [catalogPage, fetchedCategories] = await Promise.all([
          fetchCatalogCoursePage(CATALOG_PAGE_SIZE, 0),
          fetchCategories(),
        ])
        if (!isCurrentRequest()) return
        setBaseCourses(catalogPage.results)
        setCatalogTotalCount(catalogPage.count)
        setCatalogNextOffset(catalogPage.next_offset)
        setRecommendationCourses([])
        setCategories(fetchedCategories)
        setCourseSource('catalog')
        setSummaryText(
          'Khám phá danh mục khóa học công khai. Đăng nhập hoặc đăng ký để nhận gợi ý cá nhân hóa và lưu khóa học.',
        )
        setSavedCourseIds([])
      } catch {
        if (!isCurrentRequest()) return
        setErrorText('Không thể tải danh sách khóa học từ máy chủ.')
      } finally {
        if (isCurrentRequest()) {
          setIsCatalogLoading(false)
          setIsRecommendationLoading(false)
        }
      }
      return
    }

    // Authenticated: kiểm tra onboarding trước, rồi fetch dữ liệu
    const onboardingPromise = fetchOptionalOnboardingProfile()
    const catalogPromise = fetchCatalogCoursePage(CATALOG_PAGE_SIZE, 0)
    const savedPromise = fetchOptionalSavedCourses()
    const categoryPromise = fetchCategories()

    // Catalog về trước → hiển thị "Tất cả khóa học" ngay
    catalogPromise
      .then((catalogPage) => {
        if (!isCurrentRequest()) return
        setBaseCourses(catalogPage.results)
        setCatalogTotalCount(catalogPage.count)
        setCatalogNextOffset(catalogPage.next_offset)
        setIsCatalogLoading(false)
      })
      .catch(() => {
        if (!isCurrentRequest()) return
        setErrorText('Không thể tải danh sách khóa học từ máy chủ.')
        setIsCatalogLoading(false)
      })

    // Kiểm tra onboarding → chỉ fetch recommendations nếu đã hoàn thành
    onboardingPromise.then((profile) => {
      if (!isCurrentRequest()) return
      const isOnboardingDone = Boolean(profile?.onboarding_completed)
      setHasCompletedOnboarding(isOnboardingDone)

      if (!isOnboardingDone) {
        // Chưa onboarding → không hiển thị Top 10
        setRecommendationCourses([])
        setCourseSource('catalog')
        setSummaryText(
          'Hoàn thành onboarding để nhận gợi ý khóa học cá nhân hóa từ AI.',
        )
        setIsRecommendationLoading(false)

        // Vẫn fetch saved + categories
        Promise.all([savedPromise, categoryPromise]).then(([savedCourses, fetchedCategories]) => {
          if (!isCurrentRequest()) return
          setCategories(fetchedCategories)
          setSavedCourseIds(extractSavedCourseIds(savedCourses))
        })
        return
      }

      // Đã onboarding → fetch recommendations
      const recommendationPromise = fetchOptionalRecommendations()

      Promise.all([
        catalogPromise.catch(() => ({ count: 0, next_offset: null, results: [] as CourseRecord[] })),
        recommendationPromise,
        savedPromise,
        categoryPromise,
      ])
        .then(([catalogPage, recommendedCourses, savedCourses, fetchedCategories]) => {
          if (!isCurrentRequest()) return
          setCategories(fetchedCategories)
          const nextRecommendations =
            recommendedCourses.length > 0 ? recommendedCourses.slice(0, 10) : catalogPage.results.slice(0, 10)

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
          if (isCurrentRequest()) {
            setIsRecommendationLoading(false)
          }
        })
    })
  }

  useEffect(() => {
    void refreshDashboardData()
  }, [isAuthenticated])

  useEffect(() => {
    function syncAuthSession() {
      setIsAuthenticated(hasAuthSession())
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === 'edupath_auth' || event.key === 'edupath_user') {
        syncAuthSession()
      }
    }

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthSession)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthSession)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  async function loadMoreCatalogCourses() {
    if (isMoreCatalogLoading || catalogNextOffset === null) {
      return false
    }

    const requestId = refreshRequestId.current
    setIsMoreCatalogLoading(true)

    try {
      const catalogPage = await fetchCatalogCoursePage(CATALOG_PAGE_SIZE, catalogNextOffset)
      if (refreshRequestId.current !== requestId) {
        return false
      }

      setBaseCourses((current) => {
        const existingIds = new Set(current.map((course) => course.id))
        const newCourses = catalogPage.results.filter((course) => !existingIds.has(course.id))
        return [...current, ...newCourses]
      })
      setCatalogTotalCount(catalogPage.count)
      setCatalogNextOffset(catalogPage.next_offset)
      setErrorText('')
      return true
    } catch {
      if (refreshRequestId.current === requestId) {
        setErrorText('KhÃ´ng thá»ƒ táº£i thÃªm danh sÃ¡ch khÃ³a há»c.')
      }
      return false
    } finally {
      if (refreshRequestId.current === requestId) {
        setIsMoreCatalogLoading(false)
      }
    }
  }

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
    isMoreCatalogLoading,
    catalogTotalCount,
    hasMoreCatalogCourses: catalogNextOffset !== null,
    hasCompletedOnboarding,
    categories,
    isAuthenticated,
    refreshDashboardData,
    loadMoreCatalogCourses,
    toggleSavedCourse,
  }
}
