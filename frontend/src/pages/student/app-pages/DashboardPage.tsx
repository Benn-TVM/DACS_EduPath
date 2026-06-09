/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import {
  formatCourseScore,
  getCourseBadge,
  getCourseCategory,
  getCourseLevel,
  getCourseRankerLabel,
  getCourseRankerTone,
  getCourseScoreDetails,
  getCourseShortExplanation,
  getCourseVisual,
} from '../student-core'
import { useDashboardData } from '../hooks/useDashboardData'
import { AppMobileNav, AppSidebar, AppTopbar } from '../student-layout'
import '../styles/dashboard-search.css'
import '../styles/dashboard-widgets.css'

const COURSE_RENDER_BATCH_SIZE = 96
const ALL_INDUSTRIES_LABEL = 'Tất cả'

export function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeIndustry, setActiveIndustry] = useState<string>(ALL_INDUSTRIES_LABEL)
  const [activeMajor, setActiveMajor] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeRecommendationIndex, setActiveRecommendationIndex] = useState(0)
  const [courseRenderLimit, setCourseRenderLimit] = useState(COURSE_RENDER_BATCH_SIZE)
  const {
    baseCourses,
    recommendationCourses,
    savedCourseIds,
    courseSource,
    errorText,
    isLoading,
    isRecommendationLoading,
    isMoreCatalogLoading,
    catalogTotalCount,
    hasMoreCatalogCourses,
    hasCompletedOnboarding,
    categories,
    isAuthenticated,
    refreshDashboardData,
    loadMoreCatalogCourses,
    toggleSavedCourse,
  } = useDashboardData()

  useEffect(() => {
    const industryParam = searchParams.get('industry')
    const majorParam = searchParams.get('major')

    if (majorParam) {
      setActiveMajor(majorParam)
      // Tìm industry cha từ danh sách categories
      const parentIndustry = categories.find((cat) =>
        cat.children?.some((child) => child.name === majorParam),
      )
      if (parentIndustry) {
        setActiveIndustry(parentIndustry.name)
      } else if (industryParam) {
        setActiveIndustry(industryParam)
      }
    } else if (industryParam) {
      setActiveIndustry(industryParam)
      setActiveMajor(null)
    } else {
      // Nếu không có tham số nào trên URL, reset về mặc định
      setActiveIndustry('Tất cả')
      setActiveMajor(null)
    }
  }, [searchParams, categories])

  const spotlightCourses = useMemo(() => recommendationCourses.slice(0, 10), [recommendationCourses])
  const visibleCourses = useMemo(() => {
    return baseCourses.filter((course) => {
      if (activeIndustry === 'Tất cả') return true

      const category = course.category
      if (!category) return false

      // Nếu chỉ chọn ngành (Industry)
      if (!activeMajor) {
        // Khóa học thuộc ngành đó HOẶC thuộc một chuyên ngành con của ngành đó
        return category.name === activeIndustry || category.parent_name === activeIndustry
      }

      // Nếu đã chọn chuyên ngành (Major)
      return category.name === activeMajor
    })
  }, [activeIndustry, activeMajor, baseCourses])
  const renderedCourses = useMemo(
    () => visibleCourses.slice(0, courseRenderLimit),
    [courseRenderLimit, visibleCourses],
  )
  const hiddenCourseCount = Math.max(0, visibleCourses.length - renderedCourses.length)
  const spotlightCount = spotlightCourses.length
  const activeRecommendationVisualIndex =
    spotlightCount > 0 ? activeRecommendationIndex % spotlightCount : 0
  const activeRecommendation = useMemo(
    () => spotlightCourses[activeRecommendationVisualIndex] ?? null,
    [activeRecommendationVisualIndex, spotlightCourses],
  )

  useEffect(() => {
    setCourseRenderLimit(COURSE_RENDER_BATCH_SIZE)
  }, [activeIndustry, activeMajor])

  useEffect(() => {
    if (spotlightCount <= 1) {
      return
    }

    const timer = window.setInterval(() => {
      setActiveRecommendationIndex((current) => (current + 1) % spotlightCount)
    }, 6000)

    return () => window.clearInterval(timer)
  }, [spotlightCount])

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedQuery = searchQuery.trim()
    if (!normalizedQuery) {
      await refreshDashboardData()
      return
    }

    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`/search?q=${normalizedQuery}`)}`)
      return
    }

    navigate(`/search?q=${encodeURIComponent(normalizedQuery)}`)
  }

  function showPreviousRecommendation() {
    if (spotlightCount <= 1) {
      return
    }

    setActiveRecommendationIndex((current) =>
      current === 0 ? spotlightCount - 1 : current - 1,
    )
  }

  function showNextRecommendation() {
    if (spotlightCount <= 1) {
      return
    }

    setActiveRecommendationIndex((current) => (current + 1) % spotlightCount)
  }

  async function handleLoadMoreCourses() {
    if (hiddenCourseCount > 0) {
      setCourseRenderLimit((current) => current + COURSE_RENDER_BATCH_SIZE)
      return
    }

    await loadMoreCatalogCourses()
  }

  return (
    <div className="dashboard-page">
      <AppSidebar active="dashboard" />
      <AppMobileNav active="dashboard" />

      <main className="dashboard-main">
        <AppTopbar
          searchPlaceholder="Tìm kiếm khóa học trên SOICT MOOC..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
        />

        <div className="dashboard-content">
          {/* ── Spotlight Section (Top 10) – chỉ hiển khi đã đăng nhập và hoàn thành onboarding ── */}
          {isAuthenticated && hasCompletedOnboarding && (
            <>
              {isRecommendationLoading ? (
                <section className="dashboard-section dashboard-section--spotlight">
                  <div className="dashboard-section__head dashboard-section__head--spotlight">
                    <div>
                      <h2>Top 10 khóa học phù hợp</h2>
                    </div>
                  </div>
                  <div className="dashboard-spotlight">
                    <article className="dashboard-spotlight__panel dashboard-spotlight__panel--skeleton">
                      <div className="skeleton-block" style={{ width: '100%', height: '100%', minHeight: '220px', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-soft)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
                    </article>
                  </div>
                </section>
              ) : activeRecommendation ? (
                <section className="dashboard-section dashboard-section--spotlight">
                  <div className="dashboard-section__head dashboard-section__head--spotlight">
                    <div>
                      <h2>Top 10 khóa học phù hợp</h2>
                    </div>
                  </div>

                  <div className="dashboard-spotlight">
                    {spotlightCount > 1 ? (
                      <button
                        type="button"
                        className="dashboard-spotlight__nav dashboard-spotlight__nav--prev"
                        aria-label="Khóa học trước"
                        onClick={showPreviousRecommendation}
                      >
                        <AppFaIcon icon={appIcons.back} />
                      </button>
                    ) : null}

                    <article className="dashboard-spotlight__panel">
                      <div className="dashboard-spotlight__visual">
                        <img
                          src={getCourseVisual(activeRecommendationVisualIndex, activeRecommendation)}
                          alt={activeRecommendation.title}
                        />
                        <div className="dashboard-spotlight__visual-overlay"></div>
                      </div>

                      <div className="dashboard-spotlight__content">
                        <div className="dashboard-spotlight__lead">
                          <span className="dashboard-spotlight__eyebrow">
                            {courseSource === 'recommendation' ? 'AI recommendation' : 'Catalog spotlight'}
                          </span>
                          <span className="dashboard-spotlight__badge">
                            {getCourseBadge(activeRecommendationVisualIndex, 'recommendation')}
                          </span>
                          <span className={`course-ranking-source course-ranking-source--${getCourseRankerTone(activeRecommendation)} dashboard-spotlight__ranker`}>
                            <AppFaIcon icon={activeRecommendation.ranker === 'ml_reranking' ? appIcons.ai : appIcons.trend} />
                            {getCourseRankerLabel(activeRecommendation)}
                          </span>
                        </div>

                        <h3>{activeRecommendation.title}</h3>

                        {getCourseShortExplanation(activeRecommendation, 125) ? (
                          <p className="dashboard-spotlight__insight">
                            {getCourseShortExplanation(activeRecommendation, 125)}
                          </p>
                        ) : null}

                        <div className="dashboard-spotlight__bottom">
                          <div className="dashboard-spotlight__facts">
                            <div>
                              <span>Độ phù hợp</span>
                              <strong>{formatCourseScore(activeRecommendation)}</strong>
                              {getCourseScoreDetails(activeRecommendation) ? (
                                <small>{getCourseScoreDetails(activeRecommendation)}</small>
                              ) : null}
                            </div>
                            <div>
                              <span>Cấp độ</span>
                              <strong>{getCourseLevel(activeRecommendation)}</strong>
                            </div>
                            <div>
                              <span>Danh mục</span>
                              <strong>{getCourseCategory(activeRecommendation)}</strong>
                            </div>
                          </div>

                          <div className="dashboard-spotlight__actions">
                            <Link className="course-primary-link course-primary-link--compact" to={`/courses/${activeRecommendation.id}`}>
                              Xem chi tiết <AppFaIcon icon={appIcons.next} />
                            </Link>
                            <button
                              className={`ghost-action ghost-action--compact dashboard-spotlight__save${
                                savedCourseIds.includes(activeRecommendation.id) ? ' is-saved' : ''
                              }`}
                              type="button"
                              aria-label="Lưu khóa học spotlight"
                              onClick={() => void toggleSavedCourse(activeRecommendation.id)}
                            >
                              <AppFaIcon icon={appIcons.saved} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>

                    {spotlightCount > 1 ? (
                      <button
                        type="button"
                        className="dashboard-spotlight__nav dashboard-spotlight__nav--next"
                        aria-label="Khóa học tiếp theo"
                        onClick={showNextRecommendation}
                      >
                        <AppFaIcon icon={appIcons.next} />
                      </button>
                    ) : null}
                  </div>

                  {spotlightCount > 1 ? (
                    <div className="dashboard-spotlight__progress" aria-label="Tiến trình carousel gợi ý">
                      {spotlightCourses.map((course, index) => (
                        <button
                          key={course.id}
                          type="button"
                          className={index === activeRecommendationVisualIndex ? 'is-active' : ''}
                          aria-label={`Chuyển đến khóa học ${index + 1}`}
                          onClick={() => setActiveRecommendationIndex(index)}
                        />
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </>
          )}

          {/* ── Catalog Section (Tất cả khóa học) ── */}
          <section className="dashboard-section">
            <div className="dashboard-section__head">
              <h2>Tất cả khóa học</h2>
            </div>

            <div className="dashboard-filters dashboard-filters--industry">
              <button
                className={'Tất cả' === activeIndustry ? 'is-active' : ''}
                type="button"
                onClick={() => {
                  setSearchParams({})
                }}
              >
                <AppFaIcon icon={appIcons.categories} />
                Tất cả
              </button>
              {categories.map((industry) => (
                <button
                  key={industry.id}
                  className={industry.name === activeIndustry ? 'is-active' : ''}
                  type="button"
                  onClick={() => {
                    setSearchParams({ industry: industry.name })
                  }}
                >
                  <AppFaIcon icon={appIcons.course} />
                  {industry.name}
                </button>
              ))}
            </div>

            {activeIndustry !== 'Tất cả' && (
              <div className="dashboard-filters dashboard-filters--major">
                <button
                  className={activeMajor === null ? 'is-active' : ''}
                  type="button"
                  onClick={() => {
                    setSearchParams({ industry: activeIndustry })
                  }}
                >
                  Tất cả chuyên ngành
                </button>
                {categories
                  .find((ind) => ind.name === activeIndustry)
                  ?.children?.map((major) => (
                    <button
                      key={major.id}
                      className={major.name === activeMajor ? 'is-active' : ''}
                      type="button"
                      onClick={() => {
                        setSearchParams({
                          industry: activeIndustry,
                          major: major.name,
                        })
                      }}
                    >
                      {major.name}
                    </button>
                  ))}
              </div>
            )}

            {errorText ? <p className="dashboard-status dashboard-status--error">{errorText}</p> : null}

            {isLoading ? (
              <>
                <p className="dashboard-status">Đang tải dữ liệu khóa học...</p>
                <div className="course-grid">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <article key={i} className="course-card" style={{ opacity: 0.5 }}>
                      <div className="course-card__image">
                        <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', background: 'var(--color-surface-soft)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
                      </div>
                      <div className="course-card__body">
                        <div style={{ height: '1.2rem', width: '90%', borderRadius: '0.5rem', background: 'var(--color-surface-soft)', margin: '0.4rem 0' }} />
                        <div style={{ height: '0.9rem', width: '40%', borderRadius: '0.5rem', background: 'var(--color-surface-soft)', marginBottom: '0.8rem' }} />
                        <div style={{ height: '0.8rem', width: '100%', borderRadius: '0.5rem', background: 'var(--color-surface-soft)' }} />
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <>
                {visibleCourses.length === 0 ? (
                  <div className="dashboard-empty">
                    <h3>Chưa có khóa học phù hợp</h3>
                    <p>Hãy đổi bộ lọc hoặc thử một truy vấn tìm kiếm khác để xem thêm kết quả.</p>
                  </div>
                ) : null}

                {visibleCourses.length > 0 ? (
                  <p className="dashboard-catalog-meta">
                    Đã tải <strong>{baseCourses.length}</strong>/{catalogTotalCount || baseCourses.length} khóa trong catalog.
                    Hiển thị <strong>{renderedCourses.length}</strong>/{visibleCourses.length} khóa học.
                    Dùng ô tìm kiếm để lọc chính xác hơn trong toàn bộ dữ liệu.
                  </p>
                ) : null}

                <div className="course-grid">
                  {renderedCourses.map((course, index) => (
                    <Link to={`/courses/${course.id}`} key={course.id} className="course-card">
                      <div className="course-card__image">
                        <img src={getCourseVisual(index, course)} alt={course.title} />
                        <div className="course-card__overlay">
                          <button>Xem khóa học</button>
                        </div>
                      </div>

                      <div className="course-card__body">
                        <h3>{course.title}</h3>
                        <div className="course-card__price">Miễn phí</div>
                        <div className="course-card__stats">
                          <span><AppFaIcon icon={appIcons.hub} /> {((index * 12345) % 150000) + 10000}</span>
                          <span><AppFaIcon icon={appIcons.play} /> {((index * 42) % 100) + 10}</span>
                          <span><AppFaIcon icon={appIcons.clock} /> {((index * 7) % 20) + 2}h{((index * 13) % 60)}p</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {hiddenCourseCount > 0 || hasMoreCatalogCourses ? (
                  <div className="dashboard-load-more">
                    <button
                      type="button"
                      onClick={() => void handleLoadMoreCourses()}
                      disabled={isMoreCatalogLoading}
                      style={{ fontSize: 0 }}
                    >
                      <span style={{ fontSize: '1rem' }}>
                        {isMoreCatalogLoading
                          ? 'Đang tải thêm...'
                          : hiddenCourseCount > 0
                            ? `Xem thêm ${Math.min(COURSE_RENDER_BATCH_SIZE, hiddenCourseCount)} khóa học`
                            : 'Tải thêm khóa học'}
                      </span>
                      Xem thêm {Math.min(COURSE_RENDER_BATCH_SIZE, hiddenCourseCount)} khóa học
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>


        </div>
      </main>
    </div>
  )
}
