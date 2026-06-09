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
import { AppMobileNav, AppSidebar, AppTopbar } from '../student-layout'
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
      <AppMobileNav active="saved" />
      <AppTopbar
        searchPlaceholder="Tìm kiếm trong danh sách đã lưu..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <main className="saved-main">
        <div className="saved-shell">
          <section className="saved-header">
            <h1>Khóa học đã lưu</h1>
          </section>

          {errorText ? <p className="saved-status saved-status--error">{errorText}</p> : null}
          {loading ? <p className="saved-status">Đang tải danh sách khóa học đã lưu...</p> : null}

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
        </div>
      </main>
    </div>
  )
}
