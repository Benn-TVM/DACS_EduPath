import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { hasAuthSession } from '../../../services/api'
import {
  dashboardFilters,
  formatCourseScore,
  getCourseBadge,
  getCourseCategory,
  getCourseDescription,
  getCourseLevel,
  getCourseTags,
  getCourseVisual,
  matchesCourseFilter,
} from '../student-core'
import { useDashboardData } from '../hooks/useDashboardData'
import { AppSidebar, AppTopbar } from '../student-layout'
import '../styles/dashboard-search.css'
import '../styles/dashboard-widgets.css'

export function DashboardPage() {
  const isAuthenticated = hasAuthSession()
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState(dashboardFilters[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeRecommendationIndex, setActiveRecommendationIndex] = useState(0)
  const {
    baseCourses,
    recommendationCourses,
    savedCourseIds,
    courseSource,
    errorText,
    isLoading,
    isRecommendationLoading,
    refreshDashboardData,
    toggleSavedCourse,
  } = useDashboardData()

  const spotlightCourses = useMemo(() => recommendationCourses.slice(0, 10), [recommendationCourses])
  const visibleCourses = useMemo(
    () => baseCourses.filter((course) => matchesCourseFilter(course, activeFilter)),
    [activeFilter, baseCourses],
  )
  const spotlightCount = spotlightCourses.length
  const activeRecommendationVisualIndex =
    spotlightCount > 0 ? activeRecommendationIndex % spotlightCount : 0
  const activeRecommendation = useMemo(
    () => spotlightCourses[activeRecommendationVisualIndex] ?? null,
    [activeRecommendationVisualIndex, spotlightCourses],
  )

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

  return (
    <div className="dashboard-page">
      <AppSidebar active="dashboard" />

      <main className="dashboard-main">
        <AppTopbar
          searchPlaceholder="Tìm kiếm khóa học trên SOICT MOOC..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
        />

        <div className="dashboard-content">
          {/* ── Spotlight Section (Top 10) ── */}
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
                    </div>
                    
                    <h3>{activeRecommendation.title}</h3>

                    <div className="dashboard-spotlight__bottom">
                      <div className="dashboard-spotlight__facts">
                        <div>
                          <span>Độ phù hợp</span>
                          <strong>{formatCourseScore(activeRecommendation)}</strong>
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
                        {isAuthenticated ? (
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
                        ) : null}
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

          {/* ── Catalog Section (Tất cả khóa học) ── */}
          <section className="dashboard-section">
            <div className="dashboard-section__head">
              <h2>Tất cả khóa học</h2>
            </div>

            <div className="dashboard-filters">
              {dashboardFilters.map((filter) => (
                <button
                  key={filter}
                  className={filter === activeFilter ? 'is-active' : ''}
                  type="button"
                  onClick={() => !isLoading && setActiveFilter(filter)}
                  disabled={isLoading}
                >
                  {filter}
                </button>
              ))}
            </div>

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

                <div className="course-grid">
                  {visibleCourses.map((course, index) => (
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
              </>
            )}
          </section>


        </div>
      </main>
    </div>
  )
}
