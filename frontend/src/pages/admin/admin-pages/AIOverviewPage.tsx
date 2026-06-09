import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { fetchAdminStats, fetchAdminCourses, fetchAdminCategories, type AdminStatsResponse, type AdminCategoryRow } from '../services/admin-api'
import type { CourseRecord } from '../../student/student-core'

interface DashboardData {
  stats: AdminStatsResponse
  courses: CourseRecord[]
  categories: AdminCategoryRow[]
}

function getMetadataScore(course: CourseRecord) {
  const searchDocumentLength = course.search_document_length ?? (course.search_document || '').trim().length
  const tagCount = course.tags?.length ?? course.tag_ids?.length ?? 0
  const checks = [
    Boolean(course.category),
    tagCount > 0,
    searchDocumentLength >= 50,
    Boolean(course.difficulty_level),
    Boolean(course.provider),
  ]

  return checks.filter(Boolean).length
}

export function AIOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchAdminStats(), fetchAdminCourses(), fetchAdminCategories().catch(() => [])])
      .then(([stats, courses, categories]) => {
        setData({ stats, courses, categories })
        setIsLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [])

  const overview = useMemo(() => {
    if (!data) {
      return null
    }

    const { courses, categories } = data
    const activeCourses = courses.filter((course) => course.is_active !== false).length
    const coursesWithTags = courses.filter((course) => (course.tags?.length ?? course.tag_ids?.length ?? 0) > 0).length
    const coursesWithCategory = courses.filter((course) => Boolean(course.category)).length
    const coursesWithDescription = courses.filter((course) => {
      const searchDocumentLength = course.search_document_length ?? (course.search_document || '').trim().length
      return searchDocumentLength >= 50
    }).length
    const coursesWithDifficulty = courses.filter((course) => Boolean(course.difficulty_level)).length
    const coursesWithProvider = courses.filter((course) => Boolean(course.provider)).length
    const denominator = Math.max(courses.length * 5, 1)
    const dataQualityPercent = Math.round(
      courses.reduce((sum, course) => sum + getMetadataScore(course), 0) / denominator * 100,
    )
    const categoryDistribution = categories
      .map((category) => ({ name: category.name, count: category.course_count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7)
    const maxCategoryCount = Math.max(...categoryDistribution.map((category) => category.count), 1)
    const topReadyCourses = [...courses]
      .sort((a, b) => getMetadataScore(b) - getMetadataScore(a) || a.title.localeCompare(b.title))
      .slice(0, 6)
    const scoreDistribution = Array.from({ length: 6 }, (_, score) => ({
      score,
      count: courses.filter((course) => getMetadataScore(course) === score).length,
    }))
    const maxScoreCount = Math.max(...scoreDistribution.map((item) => item.count), 1)
    const healthMetrics = [
      { label: 'Có danh mục', value: coursesWithCategory, total: courses.length },
      { label: 'Có tag', value: coursesWithTags, total: courses.length },
      { label: 'Mô tả đủ dài', value: coursesWithDescription, total: courses.length },
      { label: 'Có mức độ', value: coursesWithDifficulty, total: courses.length },
      { label: 'Có đơn vị', value: coursesWithProvider, total: courses.length },
    ]
    const alerts = [
      { label: 'Thiếu danh mục', value: courses.length - coursesWithCategory },
      { label: 'Thiếu tag', value: courses.length - coursesWithTags },
      { label: 'Mô tả AI ngắn', value: courses.length - coursesWithDescription },
      { label: 'Thiếu mức độ', value: courses.length - coursesWithDifficulty },
      { label: 'Thiếu đơn vị', value: courses.length - coursesWithProvider },
    ].filter((item) => item.value > 0)
    const maxAlertCount = Math.max(...alerts.map((item) => item.value), 1)

    return {
      activeCourses,
      coursesWithTags,
      coursesWithCategory,
      coursesWithDescription,
      coursesWithDifficulty,
      coursesWithProvider,
      dataQualityPercent,
      categoryDistribution,
      maxCategoryCount,
      topReadyCourses,
      scoreDistribution,
      maxScoreCount,
      healthMetrics,
      alerts,
      maxAlertCount,
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="admin-reveal">
        <div className="admin-empty-state">Đang tải dữ liệu thống kê...</div>
      </div>
    )
  }

  if (error || !data || !overview) {
    return (
      <div className="admin-reveal">
        <div className="admin-empty-state is-error">{error || 'Không thể tải dữ liệu.'}</div>
      </div>
    )
  }

  const { stats } = data

  return (
    <div className="admin-reveal admin-overview-page">
      <section className="admin-kpi-grid">
        <article className="admin-kpi-card is-violet admin-reveal">
          <div className="admin-kpi-card__icon">
            <AppFaIcon icon={appIcons.course} />
          </div>
          <div className="admin-kpi-card__meta">
            <span>Tổng khóa học</span>
            <strong>{stats.total_courses.toLocaleString('vi-VN')}</strong>
          </div>
          <small>{overview.activeCourses} đang mở</small>
        </article>

        <article className="admin-kpi-card is-sky admin-reveal" style={{ animationDelay: '60ms' }}>
          <div className="admin-kpi-card__icon">
            <AppFaIcon icon={appIcons.users} />
          </div>
          <div className="admin-kpi-card__meta">
            <span>Người dùng</span>
            <strong>{stats.total_users.toLocaleString('vi-VN')}</strong>
          </div>
          <small>Tài khoản hệ thống</small>
        </article>

        <article className="admin-kpi-card is-mint admin-reveal" style={{ animationDelay: '120ms' }}>
          <div className="admin-kpi-card__icon">
            <AppFaIcon icon={appIcons.search} />
          </div>
          <div className="admin-kpi-card__meta">
            <span>Lượt tìm kiếm</span>
            <strong>{stats.total_searches.toLocaleString('vi-VN')}</strong>
          </div>
          <small>Tổng đã ghi nhận</small>
        </article>

        <article className="admin-kpi-card is-amber admin-reveal" style={{ animationDelay: '180ms' }}>
          <div className="admin-kpi-card__icon">
            <AppFaIcon icon={appIcons.saved} />
          </div>
          <div className="admin-kpi-card__meta">
            <span>Lượt lưu</span>
            <strong>{stats.total_saved.toLocaleString('vi-VN')}</strong>
          </div>
          <small>Bookmark khóa học</small>
        </article>
      </section>

      <section className="admin-layout-grid admin-layout-grid--overview admin-reveal">
        <article className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <h2 className="admin-panel__title">Phân bổ khóa học theo danh mục</h2>
              <p>Hiển thị tối đa 7 danh mục có nhiều khóa học nhất.</p>
            </div>
          </div>
          {overview.categoryDistribution.length > 0 ? (
            <div className="admin-rank-chart">
              {overview.categoryDistribution.map((category, index) => (
                <div key={category.name} className="admin-rank-chart__row" style={{ animationDelay: `${index * 70}ms` }}>
                  <div className="admin-rank-chart__label">
                    <span>{category.name}</span>
                    <strong>{category.count}</strong>
                  </div>
                  <div className="admin-rank-chart__track" aria-label={`${category.name}: ${category.count} khóa học`}>
                    <span style={{ width: `${(category.count / overview.maxCategoryCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">Chưa có danh mục nào.</div>
          )}
        </article>

        <aside className="admin-alert-card admin-reveal">
          <h2>Chất lượng dữ liệu AI</h2>
          <span>Điểm dựa trên danh mục, tag, mô tả, mức độ và đơn vị cung cấp.</span>
          <div className="admin-quality-chart">
            <div className="admin-quality-chart__gauge" style={{ '--value': `${overview.dataQualityPercent}%` } as CSSProperties}>
              <strong>{overview.dataQualityPercent}%</strong>
              <span>Sẵn sàng</span>
            </div>
            <div className="admin-quality-chart__metrics">
              {overview.healthMetrics.map((metric) => (
                <div key={metric.label} className="admin-quality-chart__metric">
                  <div>
                    <span>{metric.label}</span>
                    <strong>{metric.value}/{metric.total}</strong>
                  </div>
                  <div className="admin-quality-chart__track">
                    <span style={{ width: `${metric.total > 0 ? (metric.value / metric.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="admin-layout-grid admin-layout-grid--overview admin-reveal">
        <article className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <h2 className="admin-panel__title">Khóa học sẵn sàng cho gợi ý</h2>
              <p>Phân bố điểm metadata và các khóa học có dữ liệu tốt nhất.</p>
            </div>
          </div>
          <div className="admin-readiness-chart">
            <div className="admin-score-histogram" aria-label="Phân bố điểm metadata">
              {overview.scoreDistribution.map((item) => (
                <div key={item.score} className="admin-score-histogram__item">
                  <div className="admin-score-histogram__bar">
                    <span style={{ height: `${(item.count / overview.maxScoreCount) * 100}%` }} />
                  </div>
                  <strong>{item.count}</strong>
                  <small>{item.score}/5</small>
                </div>
              ))}
            </div>
            <div className="admin-course-score-list">
              {overview.topReadyCourses.map((course) => {
                const score = getMetadataScore(course)
                return (
                  <div key={course.id} className="admin-course-score-list__row">
                    <div>
                      <span>{course.title}</span>
                      <small>{course.category?.name || 'Chưa phân loại'}</small>
                    </div>
                    <strong>{score}/5</strong>
                    <div className="admin-course-score-list__track">
                      <span style={{ width: `${(score / 5) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </article>

        <aside className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <h2 className="admin-panel__title">Việc cần xử lý</h2>
              <p>Các nhóm thiếu metadata ảnh hưởng trực tiếp tới ranking.</p>
            </div>
          </div>
          <div className="admin-deficit-chart">
            {overview.alerts.length > 0 ? overview.alerts.map((alert) => (
              <div key={alert.label} className="admin-deficit-chart__row">
                <div>
                  <span>{alert.label}</span>
                  <strong>{alert.value}</strong>
                </div>
                <div className="admin-deficit-chart__track">
                  <span style={{ width: `${(alert.value / overview.maxAlertCount) * 100}%` }} />
                </div>
              </div>
            )) : (
              <div className="admin-deficit-chart__empty">
                <span>Metadata cơ bản đã đủ</span>
                <strong>OK</strong>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}
