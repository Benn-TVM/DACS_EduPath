import { useEffect, useMemo, useState } from 'react'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { getCourseCategory, type CourseRecord } from '../../student/student-core'
import { AdminPageHeader } from '../admin-layout'
import {
  fetchAdminCategories,
  fetchAdminCourses,
  fetchAdminStats,
  fetchAdminTags,
  taxonomyUnavailableMessage,
  type AdminCategoryRow,
  type AdminStatsResponse,
  type AdminTagRow,
} from '../services/admin-api'

export function ReportsPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [categories, setCategories] = useState<AdminCategoryRow[]>([])
  const [tags, setTags] = useState<AdminTagRow[]>([])
  const [stats, setStats] = useState<AdminStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [noticeText, setNoticeText] = useState('')
  const [taxonomyLimited, setTaxonomyLimited] = useState(false)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setErrorText('')
      setNoticeText('')
      setTaxonomyLimited(false)

      const [courseResult, categoryResult, tagResult, statsResult] = await Promise.allSettled([
        fetchAdminCourses(),
        fetchAdminCategories(),
        fetchAdminTags(),
        fetchAdminStats(),
      ])

      if (courseResult.status === 'fulfilled') {
        setCourses(courseResult.value)
      } else {
        setCourses([])
        setErrorText(courseResult.reason instanceof Error ? courseResult.reason.message : 'Không thể tải báo cáo khóa học.')
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value)
      } else {
        setStats(null)
        setErrorText((current) =>
          current || (statsResult.reason instanceof Error ? statsResult.reason.message : 'Không thể tải thống kê hệ thống.'),
        )
      }

      const messages: string[] = []

      if (categoryResult.status === 'fulfilled') {
        setCategories(categoryResult.value)
      } else {
        setCategories([])
        messages.push(
          categoryResult.reason instanceof Error ? categoryResult.reason.message : taxonomyUnavailableMessage,
        )
      }

      if (tagResult.status === 'fulfilled') {
        setTags(tagResult.value)
      } else {
        setTags([])
        messages.push(tagResult.reason instanceof Error ? tagResult.reason.message : taxonomyUnavailableMessage)
      }

      if (messages.length > 0) {
        setNoticeText(Array.from(new Set(messages)).join(' '))
        setTaxonomyLimited(true)
      }

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
    return [...counters.entries()].sort((first, second) => second[1] - first[1])
  }, [courses])

  const topTags = useMemo(
    () => [...tags].sort((first, second) => second.course_count - first.course_count).slice(0, 5),
    [tags],
  )

  const categorizedCourses = courses.filter((course) => course.category?.id).length
  const taggedCourses = courses.filter((course) => course.tags?.length).length

  if (isLoading) {
    return <p className="dashboard-status" style={{ padding: '2rem' }}>Đang tải báo cáo...</p>
  }

  return (
    <>
      <AdminPageHeader
        title="Thống Kê Hệ Thống"
      />

      {errorText ? <p className="dashboard-status dashboard-status--error">{errorText}</p> : null}
      {noticeText ? <p className="dashboard-status">{noticeText}</p> : null}

      <section className="admin-kpi-grid">
        <article className="admin-kpi-card is-mint admin-reveal">
          <div className="admin-kpi-card__icon">
            <AppFaIcon icon={appIcons.course} />
          </div>
          <div className="admin-kpi-card__meta">
            <span>Tổng Khóa Học</span>
            <strong>{stats?.total_courses ?? courses.length}</strong>
          </div>
          <small>Dữ liệu API</small>
        </article>

        <article className="admin-kpi-card is-sky admin-reveal" style={{ animationDelay: '60ms' }}>
          <div className="admin-kpi-card__icon">
            <AppFaIcon icon={appIcons.filter} />
          </div>
          <div className="admin-kpi-card__meta">
            <span>Danh Mục Hoạt Động</span>
            <strong>{categories.length}</strong>
          </div>
          <small>{categorizedCourses} khóa học đã gán</small>
        </article>

        <article className="admin-kpi-card is-amber admin-reveal" style={{ animationDelay: '120ms' }}>
          <div className="admin-kpi-card__icon">
            <AppFaIcon icon={appIcons.checklist} />
          </div>
          <div className="admin-kpi-card__meta">
            <span>Tag Đang Dùng</span>
            <strong>{tags.length}</strong>
          </div>
          <small>{taggedCourses} khóa học có tag</small>
        </article>

        <article className="admin-kpi-card is-violet admin-reveal" style={{ animationDelay: '180ms' }}>
          <div className="admin-kpi-card__icon">
            <AppFaIcon icon={appIcons.search} />
          </div>
          <div className="admin-kpi-card__meta">
            <span>Lượt Tìm Kiếm</span>
            <strong>{stats?.total_searches ?? 0}</strong>
          </div>
          <small>{stats?.total_saved ?? 0} lượt lưu</small>
        </article>
      </section>

      <section className="admin-layout-grid admin-layout-grid--reports">
        <article className="admin-panel admin-reveal">
          <div className="admin-panel__head">
            <div>
              <h2>Phân Bố Theo Danh Mục</h2>
              <p>Tỷ trọng khóa học đang thuộc từng danh mục thực tế.</p>
            </div>
          </div>
          <div className="admin-source-list">
            {categoryDistribution.map(([label, count]) => {
              const width = courses.length > 0 ? Math.max(8, Math.round((count / courses.length) * 100)) : 0
              return (
                <div key={label}>
                  <div>
                    <strong>{label}</strong>
                    <span>{count} khóa học</span>
                  </div>
                  <div className="admin-source-list__bar">
                    <span style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <article className="admin-panel admin-reveal">
          <div className="admin-panel__head">
            <div>
              <h2>Chất Lượng Dữ Liệu</h2>
              <p>Các điểm cần bổ sung để dữ liệu admin dùng ổn định hơn.</p>
            </div>
          </div>
          <div className="admin-health-list">
            <div>
              <strong>Khóa học có danh mục</strong>
              <span className={`admin-status-pill ${categorizedCourses === courses.length ? 'is-positive' : 'is-pending'}`}>
                {categorizedCourses}/{courses.length}
              </span>
            </div>
            <div>
              <strong>Khóa học có tag</strong>
              <span className={`admin-status-pill ${taggedCourses === courses.length ? 'is-positive' : 'is-pending'}`}>
                {taggedCourses}/{courses.length}
              </span>
            </div>
            <div>
              <strong>Danh mục trống</strong>
              <span className={`admin-status-pill ${categories.some((item) => item.course_count === 0) ? 'is-negative' : 'is-positive'}`}>
                {categories.filter((item) => item.course_count === 0).length}
              </span>
            </div>
            <div>
              <strong>Tag ít dùng</strong>
              <span className={`admin-status-pill ${tags.some((item) => item.course_count <= 1) ? 'is-pending' : 'is-positive'}`}>
                {tags.filter((item) => item.course_count <= 1).length}
              </span>
            </div>
          </div>
        </article>
      </section>

      {taxonomyLimited ? (
        <section className="admin-panel admin-reveal">
          <div className="admin-panel__head">
            <div>
              <h2>Báo Cáo Taxonomy Tạm Thời Bị Giới Hạn</h2>
              <p>
                Phần danh mục và tag trong cơ sở dữ liệu chưa sẵn sàng đầy đủ, nên các thống kê taxonomy đang hiển thị
                theo dữ liệu còn dùng được thay vì báo lỗi thô.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="admin-panel admin-reveal">
        <div className="admin-panel__head">
          <div>
            <h2>Tag Được Gán Nhiều Nhất</h2>
            <p>Danh sách này lấy trực tiếp từ endpoint quản lý tag.</p>
          </div>
        </div>
        <div className="admin-source-list">
          {topTags.map((tag) => (
            <div key={tag.id}>
              <div>
                <strong>{tag.name}</strong>
                <span>{tag.course_count} khóa học</span>
              </div>
              <div className="admin-source-list__bar">
                <span
                  style={{
                    width: `${courses.length > 0 ? Math.max(8, Math.round((tag.course_count / courses.length) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
