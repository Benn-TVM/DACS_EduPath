import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import {
  dashboardFilters,
  formatCourseScore,
  getCourseCategory,
  getCourseDescription,
  getCourseTags,
  getCourseVisual,
  matchesCourseFilter,
} from '../student-core'
import { useSearchResults } from '../hooks/useSearchResults'
import { AppSidebar, AppTopbar } from '../student-layout'
import '../styles/dashboard-search.css'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  const [activeCategory, setActiveCategory] = useState('Tất cả')
  const [sortMode, setSortMode] = useState<'score' | 'title'>('score')
  const [currentPage, setCurrentPage] = useState(1)
  const queryText = (searchParams.get('q') ?? '').trim()
  const {
    results,
    savedCourseIds,
    loading,
    errorText,
    toggleSavedCourse,
  } = useSearchResults(queryText)

  useEffect(() => {
    setSearchInput(queryText)
  }, [queryText])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeCategory, queryText, sortMode])

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedQuery = searchInput.trim()

    if (!normalizedQuery) {
      setSearchParams({})
      return
    }

    setSearchParams({ q: normalizedQuery })
  }

  const filteredResults = useMemo(() => {
    const filtered = results.filter((course) => matchesCourseFilter(course, activeCategory))

    if (sortMode === 'title') {
      return [...filtered].sort((left, right) => left.title.localeCompare(right.title, 'vi'))
    }

    return [...filtered].sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
  }, [activeCategory, results, sortMode])

  const pageCount = Math.max(1, Math.ceil(filteredResults.length / 4))
  const currentResults = filteredResults.slice((currentPage - 1) * 4, currentPage * 4)

  return (
    <div className="search-page">
      <AppSidebar active="search" />
      <AppTopbar
        searchPlaceholder="Tìm kiếm khóa học..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
      />

      <main className="search-main">
        <div className="search-shell">
          <section className="search-summary">
            <nav>
              <span>Hệ thống</span>
              <i><AppFaIcon icon={appIcons.breadcrumb} /></i>
              <span>Kết quả tìm kiếm</span>
            </nav>
            <h1>
              Kết quả tìm kiếm cho:{' '}
              <span>{queryText ? `"${queryText}"` : '"Nhập từ khóa để tìm khóa học"'}</span>
            </h1>
            <p>
              Hệ thống đã tìm thấy <strong>{filteredResults.length}</strong> khóa học phù hợp nhất từ
              SOICT MOOC.
            </p>
          </section>

          <section className="search-toolbar">
            <div className="search-toolbar__filters">
              <button type="button">
                Danh mục: <span>{activeCategory === 'Tất cả' ? 'Mọi lĩnh vực' : activeCategory}</span>
              </button>
              <button type="button">
                Cấp độ: <span>Mọi trình độ</span>
              </button>
            </div>

            <div className="search-toolbar__sort">
              <span>Sắp xếp theo</span>
              <button
                className={sortMode === 'score' ? 'is-active' : ''}
                type="button"
                onClick={() => setSortMode('score')}
              >
                <AppFaIcon icon={appIcons.trend} /> Điểm phù hợp
              </button>
            </div>
          </section>

          <div className="search-category-pills">
            {dashboardFilters.map((filter) => (
              <button
                key={filter}
                className={filter === activeCategory ? 'is-active' : ''}
                type="button"
                onClick={() => setActiveCategory(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          {errorText ? <p className="search-status search-status--error">{errorText}</p> : null}
          {loading ? <p className="search-status">Đang tải kết quả tìm kiếm...</p> : null}
          {!loading && !filteredResults.length ? (
            <div className="search-empty">
              <h3>Chưa tìm thấy khóa học phù hợp</h3>
              <p>Hãy thử một từ khóa khác hoặc bỏ bớt bộ lọc để xem thêm kết quả.</p>
            </div>
          ) : null}

          <div className="search-results-grid">
            {currentResults.map((course, index) => (
              <article key={course.id} className="search-course-card">
                <div className="search-course-card__image">
                  <img src={getCourseVisual(index, course)} alt={course.title} />
                  <span>{getCourseCategory(course)}</span>
                </div>

                <div className="search-course-card__body">
                  <div className="search-course-card__head">
                    <h3>{course.title}</h3>
                    <div>
                      <span><AppFaIcon icon={appIcons.star} /></span>
                      <strong>{formatCourseScore(course)}</strong>
                    </div>
                  </div>

                  <p>{getCourseDescription(course)}</p>

                  <div className="search-course-card__tags">
                    {getCourseTags(course).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>

                  <div className="search-course-card__actions">
                    <Link to={`/courses/${course.id}`}>Xem chi tiết</Link>
                    <button
                      className={savedCourseIds.includes(course.id) ? 'is-saved' : ''}
                      type="button"
                      onClick={() => void toggleSavedCourse(course.id)}
                    >
                      <AppFaIcon icon={appIcons.saved} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {pageCount > 1 ? (
            <div className="search-pagination">
              <button type="button" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}>
                <AppFaIcon icon={appIcons.back} />
              </button>
              <div>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    className={page === currentPage ? 'is-active' : ''}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setCurrentPage((value) => Math.min(pageCount, value + 1))}>
                <AppFaIcon icon={appIcons.next} />
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
