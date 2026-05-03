import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { useCourseDetail } from '../hooks/useCourseDetail'
import {
  getCourseCategory,
  getCourseDescriptionParagraphs,
  getCourseLevel,
  getCourseTags,
  getCourseVisual,
  getLearningFocus,
} from '../student-core'
import { AppSidebar, AppTopbar } from '../student-layout'
import { CourseReviewSection } from './CourseReviewSection'
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

  const descriptionParagraphs = getCourseDescriptionParagraphs(course)
  const tags = getCourseTags(course)
  const learningFocus = getLearningFocus(course)
  const scorePercent = recommendationMeta?.score
    ? Math.min(99, Math.max(10, Math.round(recommendationMeta.score * 100)))
    : 88

  return (
    <div className="dashboard-page course-detail-page">
      <AppSidebar active="none" />

      <main className="dashboard-main">
        <AppTopbar
          searchPlaceholder="Tìm kiếm khóa học..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
        />

        <div className="course-detail-main">
          <section className="dashboard-intro course-detail-intro">
            <h1>Chi tiết khóa học</h1>
            <p>
              Nội dung chi tiết, điểm phù hợp và thông tin nguồn của khóa học đang được đồng bộ với
              hệ thống EduPath.
            </p>
          </section>

          <div className="course-detail-back">
            <button type="button" onClick={() => navigate(-1)}>
              <AppFaIcon icon={appIcons.back} /> Quay lại kết quả
            </button>
          </div>

          {errorText ? <p className="course-detail-inline-error">{errorText}</p> : null}

          <div className="course-detail-layout">
            <div className="course-detail-content">
              <section className="course-detail-hero">
                <div className="course-detail-hero__meta">
                  <span>{getCourseCategory(course)}</span>
                  <span>{course.provider}</span>
                  {course.course_code ? <span>{course.course_code}</span> : null}
                </div>

                <h1>{course.title}</h1>

                <div className="course-detail-hero__visual">
                  <img src={getCourseVisual(course.id, course)} alt={course.title} />
                </div>
              </section>

              <section className="course-detail-panel">
                <div className="section-heading">
                  <span />
                  <h2>Mô tả đầy đủ</h2>
                </div>
                <div className="course-detail-copy">
                  {descriptionParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>

              <section className="course-detail-highlight">
                <div className="section-heading section-heading--primary">
                  <span><AppFaIcon icon={appIcons.target} /></span>
                  <h2>Lý do được gợi ý</h2>
                </div>

                <div className="reason-grid">
                  <article>
                    <div className="reason-icon"><AppFaIcon icon={appIcons.profile} /></div>
                    <div>
                      <h3>Phù hợp hồ sơ học tập</h3>
                      <p>
                        Khóa học thuộc nhóm {getCourseCategory(course).toLowerCase()} và phù hợp với
                        mục tiêu học tập bạn đã thiết lập trong onboarding.
                      </p>
                    </div>
                  </article>

                  <article>
                    <div className="reason-icon"><AppFaIcon icon={appIcons.trend} /></div>
                    <div>
                      <h3>Từ khóa trùng khớp</h3>
                      <p>
                        {recommendationMeta?.matched_terms?.length
                          ? `Hệ thống phát hiện các từ khóa liên quan như ${recommendationMeta.matched_terms
                              .slice(0, 4)
                              .join(', ')}.`
                          : 'Nội dung khóa học có nhiều cụm từ trùng với kỹ năng và lĩnh vực bạn quan tâm.'}
                      </p>
                    </div>
                  </article>
                </div>
              </section>

              <section className="course-detail-syllabus">
                <h2>Nội dung nổi bật</h2>
                <div className="syllabus-list">
                  {learningFocus.map((item, index) => (
                    <article key={item} className="syllabus-item">
                      <div>
                        <strong>{String(index + 1).padStart(2, '0')}</strong>
                        <span>{item}</span>
                      </div>
                      <i><AppFaIcon icon={appIcons.chevron} /></i>
                    </article>
                  ))}
                </div>
              </section>

              {/* Tích hợp Đánh giá từ cộng đồng (Student Hub) */}
              <CourseReviewSection courseId={course.id} />
            </div>

            <aside className="course-detail-side">
              <section className="score-panel">
                <span>Điểm phù hợp</span>
                <strong>{scorePercent}%</strong>
                <div className="score-bar">
                  <div style={{ width: `${scorePercent}%` }} />
                </div>
                <p>Dựa trên hồ sơ học tập, matched terms và dữ liệu khóa học trong hệ thống.</p>

                <div className="score-panel__actions">
                  <button type="button" onClick={() => void toggleSavedCourse()}>
                    {isSaved ? 'Đã lưu khóa học' : 'Lưu khóa học'}
                  </button>
                  <a href={course.course_url} target="_blank" rel="noreferrer">
                    Mở nguồn gốc
                  </a>
                </div>
              </section>

              <section className="meta-panel">
                <h3>Thông tin khóa học</h3>

                <div className="meta-list">
                  <div>
                    <span>Danh mục</span>
                    <strong>{getCourseCategory(course)}</strong>
                  </div>
                  <div>
                    <span>Nguồn</span>
                    <strong>{course.provider}</strong>
                  </div>
                  <div>
                    <span>Mã môn</span>
                    <strong>{course.course_code || 'Đang cập nhật'}</strong>
                  </div>
                  <div>
                    <span>Cấp độ</span>
                    <strong>{getCourseLevel(course)}</strong>
                  </div>
                </div>

                <div className="meta-tags">
                  {tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </section>
            </aside>
          </div>

          <footer className="dashboard-footer detail-footer">
            <div className="detail-footer__inner">
              <div>
                <span>EduPath</span>
                <p>© 2026 Academic Curator Platform. All rights reserved.</p>
              </div>
              <div className="detail-footer__links">
                <a href="#about">Về chúng tôi</a>
                <a href="#terms">Điều khoản</a>
                <a href="#privacy">Bảo mật</a>
                <a href="#support">Hỗ trợ</a>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
