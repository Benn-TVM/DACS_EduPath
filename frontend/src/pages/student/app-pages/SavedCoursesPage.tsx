import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import {
  buildCourseHaystack,
  formatCourseScore,
  getCourseCategory,
  getCourseDescription,
  getCourseTags,
  getCourseVisual,
  normalizeText,
} from '../student-core'
import { useSavedCoursesList } from '../hooks/useSavedCoursesList'
import { AppSidebar, AppTopbar } from '../student-layout'
import '../styles/saved-history.css'

export function SavedCoursesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const { savedCourses, loading, errorText, removeCourse } = useSavedCoursesList()

  const visibleSavedCourses = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm.trim())
    if (!normalizedSearch) {
      return savedCourses
    }

    return savedCourses.filter((item) => buildCourseHaystack(item.course).includes(normalizedSearch))
  }, [savedCourses, searchTerm])

  return (
    <div className="saved-page">
      <AppSidebar active="saved" />
      <AppTopbar
        searchPlaceholder="Tìm kiếm trong danh sách đã lưu..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <main className="saved-main">
        <div className="saved-shell">
          <section className="saved-header">
            <h1>Khóa học đã lưu</h1>
            <p>
              Bạn có <strong>{savedCourses.length} khóa học</strong> đã lưu từ SOICT MOOC. Các lộ
              trình này được tối ưu hóa cho mục tiêu nghề nghiệp của bạn.
            </p>
          </section>

          {errorText ? <p className="saved-status saved-status--error">{errorText}</p> : null}
          {loading ? <p className="saved-status">Đang tải danh sách khóa học đã lưu...</p> : null}

          {!loading && visibleSavedCourses.length === 0 ? (
            <div className="saved-empty">
              <h3>Chưa có khóa học phù hợp</h3>
              <p>
                {savedCourses.length
                  ? 'Không có khóa học nào khớp với từ khóa bạn vừa nhập.'
                  : 'Bạn chưa lưu khóa học nào. Hãy khám phá dashboard hoặc trang tìm kiếm để lưu các khóa học quan tâm.'}
              </p>
            </div>
          ) : null}

          <div className="saved-list">
            {visibleSavedCourses.map((item, index) => {
              const course = item.course

              return (
                <article key={item.id} className="saved-course-card">
                  <div className="saved-course-card__image">
                    <img src={getCourseVisual(index, course)} alt={course.title} />
                  </div>

                  <div className="saved-course-card__body">
                    <div className="saved-course-card__meta">
                      <span>{getCourseCategory(course)}</span>
                      <small>
                        Đã lưu ngày:{' '}
                        {new Date(item.saved_at).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </small>
                    </div>

                    <h2>{course.title}</h2>
                    <p>{getCourseDescription(course)}</p>

                    <div className="saved-course-card__tags">
                      {getCourseTags(course).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>

                    <div className="saved-course-card__actions">
                      <div>
                        <Link to={`/courses/${course.id}`}>Xem chi tiết</Link>
                        <button type="button" onClick={() => void removeCourse(course.id)}>
                          <AppFaIcon icon={appIcons.delete} />
                        </button>
                      </div>

                      <div className="saved-course-card__aside">
                        {typeof course.score === 'number' ? (
                          <span>
                            <AppFaIcon icon={appIcons.star} /> <strong>{formatCourseScore(course)}</strong>
                          </span>
                        ) : course.course_code ? (
                          <span>{course.course_code}</span>
                        ) : (
                          <span>{course.provider}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <section className="saved-suggestion">
            <span><AppFaIcon icon={appIcons.ai} /></span>
            <h3>Bạn muốn khám phá thêm?</h3>
            <p>
              Dựa trên các khóa học bạn đã lưu, EduPath có thể đề xuất một lộ trình học tập chuyên
              sâu dành riêng cho bạn.
            </p>
            <Link to="/dashboard">Khám phá lộ trình đề xuất</Link>
          </section>
        </div>
      </main>
    </div>
  )
}
