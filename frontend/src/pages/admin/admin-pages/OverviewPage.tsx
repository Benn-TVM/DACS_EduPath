import { useEffect, useMemo, useState } from 'react'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { getCourseCategory, type CourseRecord } from '../../student/student-core'
import { AdminPageHeader } from '../admin-layout'
import { fetchAdminCourses, fetchAdminStats, type AdminStatsResponse } from '../services/admin-api'

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(new Date(dateValue))
}

export function OverviewPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [stats, setStats] = useState<AdminStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setErrorText('')

      const [courseResult, statsResult] = await Promise.allSettled([
        fetchAdminCourses(),
        fetchAdminStats(),
      ])

      const messages: string[] = []

      if (courseResult.status === 'fulfilled') {
        setCourses(courseResult.value)
      } else {
        setCourses([])
        messages.push(courseResult.reason instanceof Error ? courseResult.reason.message : 'Không thể tải danh sách khóa học.')
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value)
      } else {
        setStats(null)
        messages.push(statsResult.reason instanceof Error ? statsResult.reason.message : 'Không thể tải chỉ số tổng quan.')
      }

      setErrorText(messages.join(' '))
      setIsLoading(false)
    }

    void loadData()
  }, [])

  const categoryDistribution = useMemo(() => {
    const counters = new Map<string, number>()
    for (const course of courses) {
      const categoryName = getCourseCategory(course)
      counters.set(categoryName, (counters.get(categoryName) ?? 0) + 1)
    }
    return [...counters.entries()]
      .sort((first, second) => second[1] - first[1])
      .slice(0, 7)
  }, [courses])

  const latestCourses = useMemo(
    () => [...courses].sort((first, second) => (second.updated_at ?? '').localeCompare(first.updated_at ?? '')).slice(0, 5),
    [courses],
  )

  const categorizedCourses = courses.filter((course) => course.category?.id).length
  const taggedCourses = courses.filter((course) => course.tags?.length).length

  if (isLoading) {
    return <p className="dashboard-status" style={{ padding: '2rem' }}>Đang tải dữ liệu tổng quan...</p>
  }

  return (
    <>
      <AdminPageHeader
        title="Tổng quan hệ thống"
      />

      {errorText ? <p className="dashboard-status dashboard-status--error">{errorText}</p> : null}

      <section className="admin-kpi-grid">
        <article className="admin-kpi-card is-violet admin-reveal">
          <div className="admin-kpi-card__icon">
            <AppFaIcon icon={appIcons.course} />
          </div>
          <div className="admin-kpi-card__meta">
            <span>Khóa học đang hoạt động</span>
            <strong>{stats?.total_courses ?? courses.length}</strong>
          </div>
          <small>Từ cơ sở dữ liệu</small>
        </article>

        <article className="admin-kpi-card is-sky admin-reveal" style={{ animationDelay: '60ms' }}>
          <div className="admin-kpi-card__icon">
            <AppFaIcon icon={appIcons.hub} />
          </div>
          <div className="admin-kpi-card__meta">
            <span>Tài khoản người dùng</span>
            <strong>{stats?.total_users ?? 0}</strong>
          </div>
          <small>Đồng bộ từ API</small>
        </article>

        <article className="admin-kpi-card is-mint admin-reveal" style={{ animationDelay: '120ms' }}>
          <div className="admin-kpi-card__icon">
            <AppFaIcon icon={appIcons.filter} />
          </div>
          <div className="admin-kpi-card__meta">
            <span>Khóa học có danh mục</span>
            <strong>{categorizedCourses}</strong>
          </div>
          <small>{courses.length > 0 ? `${Math.round((categorizedCourses / courses.length) * 100)}% tổng số` : 'Chưa có dữ liệu'}</small>
        </article>

        <article className="admin-kpi-card is-amber admin-reveal" style={{ animationDelay: '180ms' }}>
          <div className="admin-kpi-card__icon">
            <AppFaIcon icon={appIcons.saved} />
          </div>
          <div className="admin-kpi-card__meta">
            <span>Khóa học có tag</span>
            <strong>{taggedCourses}</strong>
          </div>
          <small>{stats?.total_saved ?? 0} lượt lưu toàn hệ thống</small>
        </article>
      </section>

      <section className="admin-layout-grid admin-layout-grid--overview">
        <article className="admin-panel admin-reveal">
          <div className="admin-panel__head">
            <div>
              <h2>Phân bổ danh mục</h2>
              <p>Số lượng khóa học thực tế theo từng nhóm nội dung.</p>
            </div>
          </div>
          <div className="admin-bar-chart">
            {categoryDistribution.map(([label, value], index) => {
              const maxValue = categoryDistribution[0]?.[1] ?? 1
              return (
                <div key={label} className="admin-bar-chart__item" style={{ animationDelay: `${index * 70}ms` }}>
                  <div className="admin-bar-chart__column">
                    <span style={{ height: `${Math.max(18, Math.round((value / maxValue) * 100))}%` }} />
                  </div>
                  <small>{label.length > 10 ? `${label.slice(0, 10)}...` : label}</small>
                </div>
              )
            })}
          </div>
        </article>

        <aside className="admin-alert-card admin-reveal">
          <div>
            <span>Rà soát dữ liệu</span>
            <h2>Tình trạng chuẩn hóa nội dung hiện tại.</h2>
          </div>
          <div className="admin-alert-card__list">
            <article>
              <strong>{courses.length - categorizedCourses} khóa học chưa gán danh mục</strong>
              <p>Nên bổ sung danh mục để việc lọc và báo cáo chính xác hơn.</p>
            </article>
            <article>
              <strong>{courses.length - taggedCourses} khóa học chưa có tag</strong>
              <p>Đây là nhóm cần ưu tiên khi chuẩn hóa taxonomy.</p>
            </article>
          </div>
        </aside>
      </section>

      <section className="admin-panel admin-reveal">
        <div className="admin-panel__head">
          <div>
            <h2>Khóa học cập nhật gần đây</h2>
            <p>Danh sách lấy trực tiếp từ API quản trị khóa học.</p>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table__head admin-table__head--top-courses">
            <span>Tên khóa học</span>
            <span>Danh mục</span>
            <span>Cập nhật</span>
            <span>Trạng thái</span>
          </div>
          {latestCourses.map((course) => (
            <div key={course.id} className="admin-table__row admin-table__row--top-courses">
              <strong>{course.title}</strong>
              <span>{getCourseCategory(course)}</span>
              <span>{course.updated_at ? formatDate(course.updated_at) : 'Chưa có dữ liệu'}</span>
              <span className={`admin-status-chip${course.is_active === false ? ' admin-status-pill is-negative' : ''}`}>
                {course.is_active === false ? 'Ẩn' : 'Đang hoạt động'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
