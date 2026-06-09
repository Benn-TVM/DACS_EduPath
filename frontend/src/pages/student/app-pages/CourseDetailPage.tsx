import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { useCourseDetail } from '../hooks/useCourseDetail'
import {
  getCourseLevel,
  getCourseVisual,
  getLearningFocus,
} from '../student-core'
import { AppMobileNav, AppSidebar, AppTopbar } from '../student-layout'
import '../styles/course-detail.css'

export function CourseDetailPage() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const { course, isSaved, loading, errorText, recommendationMeta, toggleSavedCourse } = useCourseDetail(courseId)

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedQuery = searchQuery.trim()
    if (!normalizedQuery) {
      navigate('/search')
      return
    }
    navigate(`/search?q=${encodeURIComponent(normalizedQuery)}`)
  }

  if (loading) {
    return (
      <div className="dashboard-page course-detail-page">
        <AppSidebar active="none" />
        <AppMobileNav active="none" />
        <main className="dashboard-main">
          <AppTopbar
            searchPlaceholder="Tìm kiếm khóa học..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchSubmit={handleSearchSubmit}
          />
          <div className="course-detail-main">
            <div className="course-detail-status">Đang tải chi tiết khóa học...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="dashboard-page course-detail-page">
        <AppSidebar active="none" />
        <AppMobileNav active="none" />
        <main className="dashboard-main">
          <AppTopbar
            searchPlaceholder="Tìm kiếm khóa học..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchSubmit={handleSearchSubmit}
          />
          <div className="course-detail-main">
            <div className="course-detail-status course-detail-status--error">
              {errorText || 'Không tìm thấy khóa học.'}
            </div>
          </div>
        </main>
      </div>
    )
  }

  const learningFocus = getLearningFocus(course)
  const scorePercent =
    typeof recommendationMeta?.score === 'number'
      ? Math.min(99, Math.max(0, Math.round(recommendationMeta.score * 100)))
      : null

  return (
    <div className="dashboard-page course-detail-page">
      <AppSidebar active="none" />
      <AppMobileNav active="none" />

      <main className="dashboard-main">
        <AppTopbar
          searchPlaceholder="Tìm kiếm khóa học..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
        />

        <div className="course-detail-main">
          <div className="course-detail-layout">
            {/* ── Left Column: Main Content ── */}
            <div className="course-detail-content">
              <header className="course-detail-header">
                <h1>{course.title}</h1>
                <div className="course-detail-header__stats">
                  <div className="stars">
                    <AppFaIcon icon={appIcons.star} />
                    <AppFaIcon icon={appIcons.star} />
                    <AppFaIcon icon={appIcons.star} />
                    <AppFaIcon icon={appIcons.star} />
                    <AppFaIcon icon={appIcons.star} />
                    <span>4.9 (2,450 đánh giá)</span>
                  </div>
                  <div className="student-count">
                    <AppFaIcon icon={appIcons.users} />
                    <strong>12,480</strong> học viên
                  </div>
                </div>
              </header>

              <section className="course-learn-section">
                <h2>Bạn sẽ học được gì?</h2>
                <div className="learn-grid">
                  {learningFocus.length > 0 ? (
                    learningFocus.map((item, idx) => (
                      <div key={idx} className="learn-item">
                        <AppFaIcon icon={appIcons.check} />
                        {item}
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="learn-item"><AppFaIcon icon={appIcons.check} />Hiểu rõ các khái niệm cốt lõi</div>
                      <div className="learn-item"><AppFaIcon icon={appIcons.check} />Làm chủ các công cụ chuyên dụng</div>
                      <div className="learn-item"><AppFaIcon icon={appIcons.check} />Xây dựng dự án thực tế</div>
                      <div className="learn-item"><AppFaIcon icon={appIcons.check} />Quy trình triển khai sản phẩm</div>
                    </>
                  )}
                </div>
              </section>

              <section className="course-curriculum">
                <div className="curriculum-head">
                  <div>
                    <h2>Nội dung khóa học</h2>
                    <div className="summary">
                      <strong>12</strong> chương • <strong>86</strong> bài học • Thời lượng{' '}
                      <strong>18 giờ 45 phút</strong>
                    </div>
                  </div>
                  <div className="expand-toggle">Mở rộng tất cả</div>
                </div>

                <div className="curriculum-list">
                  <div className="curriculum-chapter">
                    <div className="chapter-header">
                      <div className="title">
                        <AppFaIcon icon={appIcons.plus} />
                        1. Giới thiệu và định hướng
                      </div>
                      <div className="meta">3 bài học</div>
                    </div>
                    <div className="chapter-lessons">
                      <div className="lesson-item">
                        <div className="title">
                          <AppFaIcon icon={appIcons.playCircle} />
                          1.1 Tổng quan về khóa học
                        </div>
                        <div className="duration">05:20</div>
                      </div>
                      <div className="lesson-item">
                        <div className="title">
                          <AppFaIcon icon={appIcons.playCircle} />
                          1.2 Lộ trình học tập hiệu quả
                        </div>
                        <div className="duration">12:15</div>
                      </div>
                    </div>
                  </div>

                  <div className="curriculum-chapter">
                    <div className="chapter-header">
                      <div className="title">
                        <AppFaIcon icon={appIcons.plus} />
                        2. Kiến thức nền tảng quan trọng
                      </div>
                      <div className="meta">8 bài học</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right Column: Sidebar ── */}
            <aside className="course-detail-side">
              <div className="side-preview">
                <img src={getCourseVisual(course.id, course)} alt="Preview" />
                <div className="overlay">
                  <div className="play-icon">
                    <AppFaIcon icon={appIcons.play} />
                  </div>
                  <span>Xem giới thiệu khóa học</span>
                </div>
              </div>

              <div className="side-info">
                <div className="price-tag">Miễn phí</div>
                <button
                  className="btn-enroll"
                  type="button"
                  onClick={() => window.open(course.course_url, '_blank')}
                >
                  ĐĂNG KÝ HỌC
                </button>

                <div className="side-meta-list">
                  <div className="side-meta-item">
                    <AppFaIcon icon={appIcons.trend} />
                    Trình độ {getCourseLevel(course)}
                  </div>
                  <div className="side-meta-item">
                    <AppFaIcon icon={appIcons.course} />
                    Tổng số <strong>86</strong> bài học
                  </div>
                  <div className="side-meta-item">
                    <AppFaIcon icon={appIcons.calendar} />
                    Thời lượng <strong>18 giờ 45 phút</strong>
                  </div>
                  <div className="side-meta-item">
                    <AppFaIcon icon={appIcons.save} />
                    Học mọi lúc, mọi nơi
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button
                        style={{ background: 'transparent', border: 0, color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
                        onClick={() => void toggleSavedCourse()}
                    >
                        <AppFaIcon icon={isSaved ? appIcons.saved : appIcons.save} />
                        <span style={{ marginLeft: '8px' }}>
                          {isSaved ? 'Đã lưu vào mục yêu thích' : 'Lưu khóa học này'}
                        </span>
                    </button>
                </div>

                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9ff', borderRadius: '0.8rem', fontSize: '0.85rem' }}>
                    {scorePercent !== null ? (
                      <>
                        <strong>Điểm tương đồng: {scorePercent}%</strong>
                        <div style={{ width: '100%', height: '6px', background: '#eee', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                            <div style={{ width: `${scorePercent}%`, height: '100%', background: 'var(--color-primary)' }} />
                        </div>
                      </>
                    ) : (
                      <>
                        <strong>Điểm tương đồng: chưa có dữ liệu</strong>
                        <div style={{ marginTop: '0.4rem', color: 'var(--color-text-secondary)' }}>
                          Khóa học này hiện không nằm trong tập gợi ý đang được dùng để tính điểm.
                        </div>
                      </>
                    )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
