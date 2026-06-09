import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import {
  formatCourseScore,
  getCourseCategory,
  getCourseDescription,
  getCourseRankerLabel,
  getCourseRankerTone,
  getCourseScoreDetails,
  getCourseShortExplanation,
  getCourseTags,
  getCourseVisual,
  matchesCourseFilter,
} from '../student-core'
import { useSearchResults } from '../hooks/useSearchResults'
import { AppMobileNav, AppSidebar, AppTopbar } from '../student-layout'
import '../styles/dashboard-search.css'

type SortMode = 'score' | 'title'

const SORT_OPTIONS: { value: SortMode; label: string; icon: typeof appIcons.trend }[] = [
  { value: 'score', label: 'Điểm phù hợp', icon: appIcons.trend },
  { value: 'title', label: 'Tên A → Z', icon: appIcons.course },
]

const LEVEL_OPTIONS = ['Tất cả', 'Cơ bản', 'Trung cấp', 'Nâng cao']

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  const [activeCategory, setActiveCategory] = useState('Tất cả')
  const [activeLevel, setActiveLevel] = useState('Tất cả')
  const [sortMode, setSortMode] = useState<SortMode>('score')
  const [currentPage, setCurrentPage] = useState(1)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
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
  }, [activeCategory, activeLevel, queryText, sortMode])

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    let filtered = results.filter((course) => matchesCourseFilter(course, activeCategory))

    // Lọc theo cấp độ
    if (activeLevel !== 'Tất cả') {
      filtered = filtered.filter((course) => {
        const haystack = [
          course.title,
          course.search_document,
          course.tokenized_text,
        ].join(' ').toLowerCase()

        if (activeLevel === 'Cơ bản') {
          return haystack.includes('co ban') || haystack.includes('beginner') || haystack.includes('nhap mon')
        }
        if (activeLevel === 'Nâng cao') {
          return haystack.includes('nang cao') || haystack.includes('advanced')
        }
        // Trung cấp = phần còn lại
        return !haystack.includes('co ban') && !haystack.includes('beginner') &&
               !haystack.includes('nang cao') && !haystack.includes('advanced') &&
               !haystack.includes('nhap mon')
      })
    }

    if (sortMode === 'title') {
      return [...filtered].sort((left, right) => left.title.localeCompare(right.title, 'vi'))
    }

    return [...filtered].sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
  }, [activeCategory, activeLevel, results, sortMode])

  const pageCount = Math.max(1, Math.ceil(filteredResults.length / 4))
  const currentResults = filteredResults.slice((currentPage - 1) * 4, currentPage * 4)

  function toggleDropdown(name: string) {
    setOpenDropdown((prev) => (prev === name ? null : name))
  }

  const activeLevelLabel = activeLevel === 'Tất cả' ? 'Mọi trình độ' : activeLevel
  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === sortMode)?.label ?? 'Điểm phù hợp'

  const activeFilterCount =
    (activeCategory !== 'Tất cả' ? 1 : 0) + (activeLevel !== 'Tất cả' ? 1 : 0)

  return (
    <div className="search-page">
      <AppSidebar active="search" />
      <AppMobileNav active="search" />
      <AppTopbar
        searchPlaceholder="Tìm kiếm khóa học..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
      />

      <main className="search-main">
        <div className="search-shell">
          <section className="search-summary">
            <h1>
              Kết quả tìm kiếm cho:{' '}
              <span>{queryText ? `"${queryText}"` : '"Nhập từ khóa để tìm khóa học"'}</span>
            </h1>
            {!loading && (
              <p className="search-summary__count">
                Tìm thấy <strong>{filteredResults.length}</strong> khóa học phù hợp
              </p>
            )}
          </section>

          {/* ── Premium Filter Bar ── */}
          <section className="search-filter-bar" ref={dropdownRef}>
            <div className="search-filter-bar__left">


              {/* Dropdown Cấp độ */}
              <div className="search-filter-dropdown">
                <button
                  type="button"
                  className={`search-filter-dropdown__trigger${activeLevel !== 'Tất cả' ? ' has-value' : ''}${openDropdown === 'level' ? ' is-open' : ''}`}
                  onClick={() => toggleDropdown('level')}
                >
                  <AppFaIcon icon={appIcons.stats} />
                  <span className="search-filter-dropdown__label">Cấp độ</span>
                  <span className="search-filter-dropdown__value">{activeLevelLabel}</span>
                  <AppFaIcon icon={appIcons.chevronDown} />
                </button>
                {openDropdown === 'level' && (
                  <div className="search-filter-dropdown__menu">
                    {LEVEL_OPTIONS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={level === activeLevel ? 'is-active' : ''}
                        onClick={() => {
                          setActiveLevel(level)
                          setOpenDropdown(null)
                        }}
                      >
                        {level === activeLevel && <AppFaIcon icon={appIcons.check} />}
                        {level === 'Tất cả' ? 'Mọi trình độ' : level}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Nút xóa bộ lọc */}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="search-filter-bar__clear"
                  onClick={() => {
                    setActiveCategory('Tất cả')
                    setActiveLevel('Tất cả')
                  }}
                >
                  <AppFaIcon icon={appIcons.close} />
                  Xóa bộ lọc ({activeFilterCount})
                </button>
              )}
            </div>

            <div className="search-filter-bar__right">
              {/* Dropdown Sắp xếp */}
              <div className="search-filter-dropdown search-filter-dropdown--sort">
                <button
                  type="button"
                  className={`search-filter-dropdown__trigger${openDropdown === 'sort' ? ' is-open' : ''}`}
                  onClick={() => toggleDropdown('sort')}
                >
                  <AppFaIcon icon={appIcons.filter} />
                  <span className="search-filter-dropdown__label">Sắp xếp</span>
                  <span className="search-filter-dropdown__value">{activeSortLabel}</span>
                  <AppFaIcon icon={appIcons.chevronDown} />
                </button>
                {openDropdown === 'sort' && (
                  <div className="search-filter-dropdown__menu search-filter-dropdown__menu--right">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={option.value === sortMode ? 'is-active' : ''}
                        onClick={() => {
                          setSortMode(option.value)
                          setOpenDropdown(null)
                        }}
                      >
                        {option.value === sortMode && <AppFaIcon icon={appIcons.check} />}
                        <AppFaIcon icon={option.icon} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>


          {errorText ? <p className="search-status search-status--error">{errorText}</p> : null}

          {loading ? (
            <div className="search-loading">
              <div className="search-loading__spinner" />
              <p>Đang tìm kiếm khóa học phù hợp...</p>
            </div>
          ) : null}

          {!loading && !filteredResults.length ? (
            <div className="search-empty">
              <div className="search-empty__icon">
                <AppFaIcon icon={appIcons.search} />
              </div>
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
                    <div className="search-course-card__score">
                      <span><AppFaIcon icon={appIcons.star} /></span>
                      <strong>{formatCourseScore(course)}</strong>
                    </div>
                  </div>

                  <div className="search-course-card__ranking">
                    <span className={`course-ranking-source course-ranking-source--${getCourseRankerTone(course)}`}>
                      <AppFaIcon icon={course.ranker === 'ml_reranking' ? appIcons.ai : appIcons.trend} />
                      {getCourseRankerLabel(course)}
                    </span>
                    {getCourseScoreDetails(course) ? (
                      <span className="search-course-card__score-details">{getCourseScoreDetails(course)}</span>
                    ) : null}
                  </div>

                  <p>{getCourseDescription(course)}</p>

                  {getCourseShortExplanation(course) ? (
                    <p className="search-course-card__explanation">
                      {getCourseShortExplanation(course)}
                    </p>
                  ) : null}

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
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
              >
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
              <button
                type="button"
                disabled={currentPage === pageCount}
                onClick={() => setCurrentPage((value) => Math.min(pageCount, value + 1))}
              >
                <AppFaIcon icon={appIcons.next} />
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
