import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import type { CourseRecord } from '../student-core'
import { getCourseVisual } from '../student-core'
import { useCompare } from '../hooks/useCompare'
import type { ComparisonCourse } from '../hooks/useCompare'
import { fetchCatalogCourses } from '../services/student-api'
import { AppSidebar, AppTopbar } from '../student-layout'
import '../styles/compare.css'

const PRICE_LABELS: Record<string, string> = {
  free: 'Miễn phí',
  paid: 'Trả phí',
  freemium: 'Freemium',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
}

export function ComparePage() {
  const [searchParams] = useSearchParams()
  const [allCourses, setAllCourses] = useState<CourseRecord[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [searchFilter, setSearchFilter] = useState('')
  const presetIds = parsePresetIds(searchParams)

  const {
    selectedIds,
    result,
    isComparing,
    errorText,
    toggleCourseSelection,
    clearSelection,
    replaceSelection,
    compareCourses,
  } = useCompare(presetIds)

  useEffect(() => {
    async function load() {
      try {
        const courses = await fetchCatalogCourses()
        setAllCourses(courses)
      } catch {
        /* ignore */
      } finally {
        setIsLoadingCourses(false)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    const hasDifferentSelection =
      presetIds.length !== selectedIds.length || presetIds.some((id, index) => id !== selectedIds[index])

    if (presetIds.length > 0 && hasDifferentSelection) {
      replaceSelection(presetIds)
    }
  }, [presetIds, replaceSelection, selectedIds])

  const filteredCourses = searchFilter
    ? allCourses.filter((c) =>
        c.title.toLowerCase().includes(searchFilter.toLowerCase()),
      )
    : allCourses

  return (
    <div className="compare-page">
      <AppSidebar active="compare" />

      <main className="compare-main">
        <AppTopbar />

        <div className="compare-content">
          <header className="compare-header">
            <h1><AppFaIcon icon={appIcons.compare} /> So sánh khóa học</h1>
            <p>Chọn 2-4 khóa học để so sánh chi tiết về giá, độ khó, thời lượng và chứng chỉ.</p>
          </header>

          {errorText ? <div className="compare-error">{errorText}</div> : null}

          {result ? (
            <ComparisonTable
              courses={result.courses}
              aiSummary={result.ai_summary}
              onBack={clearSelection}
            />
          ) : isComparing ? (
            <div className="compare-loading">
              <div className="compare-loading__spinner" />
              <p>Đang phân tích và so sánh khóa học...</p>
            </div>
          ) : (
            <>
              <SelectionBar
                selectedCount={selectedIds.length}
                onCompare={() => void compareCourses()}
                onClear={clearSelection}
              />

              {selectedIds.length === 0 ? (
                <div className="compare-onboarding">
                  <strong>Bắt đầu từ 2 khóa học.</strong>
                  <p>
                    Bạn có thể chọn trực tiếp tại đây hoặc đi từ trang chi tiết và kết quả tìm kiếm để thêm nhanh vào
                    danh sách so sánh.
                  </p>
                </div>
              ) : null}

              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Lọc theo tên khóa học..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '0.7rem 1rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(226, 238, 244, 0.9)',
                    background: 'var(--color-surface)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {isLoadingCourses ? (
                <div className="compare-loading">
                  <div className="compare-loading__spinner" />
                  <p>Đang tải danh sách khóa học...</p>
                </div>
              ) : (
                <div className="course-grid">
                  {filteredCourses.map((course, index) => (
                    <div
                      key={course.id}
                      className={`course-card${selectedIds.includes(course.id) ? ' is-selected' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleCourseSelection(course.id)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && toggleCourseSelection(course.id)
                      }
                      style={{ border: selectedIds.includes(course.id) ? '2px solid var(--color-primary)' : '1px solid rgba(0, 0, 0, 0.03)' }}
                    >
                      <div className="course-card__image">
                        <img src={getCourseVisual(index, course)} alt={course.title} />
                        <div className="course-card__overlay">
                          <button>{selectedIds.includes(course.id) ? 'Bỏ chọn' : 'Chọn so sánh'}</button>
                        </div>
                        {selectedIds.includes(course.id) ? (
                           <div className="compare-course-item__check" style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', width: '24px', height: '24px', borderRadius: '6px', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                             <AppFaIcon icon={appIcons.check} />
                           </div>
                        ) : null}
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
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function parsePresetIds(searchParams: URLSearchParams) {
  const rawValue = searchParams.get('courseIds') ?? searchParams.get('add') ?? ''
  return rawValue
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0)
    .slice(0, 4)
}

function SelectionBar({
  selectedCount,
  onCompare,
  onClear,
}: {
  selectedCount: number
  onCompare: () => void
  onClear: () => void
}) {
  return (
    <div className="compare-selection">
      <div className="compare-selection__info">
        <span className="compare-selection__count">{selectedCount}</span>
        <span>
          {selectedCount === 0
            ? 'Chưa chọn khóa học nào'
            : selectedCount === 1
              ? '1 khóa được chọn — cần thêm ít nhất 1'
              : `${selectedCount} khóa được chọn`}
        </span>
      </div>
      <div className="compare-selection__actions">
        <button
          className="compare-btn--primary"
          type="button"
          disabled={selectedCount < 2}
          onClick={onCompare}
        >
          <AppFaIcon icon={appIcons.compare} /> So sánh ngay
        </button>
        {selectedCount > 0 ? (
          <button className="compare-btn--ghost" type="button" onClick={onClear}>
            Xóa chọn
          </button>
        ) : null}
      </div>
    </div>
  )
}

function ComparisonTable({
  courses,
  aiSummary,
  onBack,
}: {
  courses: ComparisonCourse[]
  aiSummary: string
  onBack: () => void
}) {
  const rows: { label: string; key: string }[] = [
    { label: 'Tên khóa học', key: 'title' },
    { label: 'Nhà cung cấp', key: 'provider' },
    { label: 'Mã khóa học', key: 'course_code' },
    { label: 'Giá', key: 'price_type' },
    { label: 'Độ khó', key: 'difficulty_level' },
    { label: 'Thời lượng (giờ)', key: 'estimated_hours' },
    { label: 'Chứng chỉ', key: 'certificate_type' },
    { label: 'Liên kết', key: 'course_url' },
  ]

  function renderCell(course: ComparisonCourse, key: string) {
    switch (key) {
      case 'title':
        return (
          <Link to={`/courses/${course.id}`} style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
            {course.title}
          </Link>
        )
      case 'price_type': {
        const label = PRICE_LABELS[course.price_type] || course.price_type
        const badgeClass = `compare-badge compare-badge--${course.price_type}`
        return <span className={badgeClass}>{label}</span>
      }
      case 'difficulty_level': {
        const label = DIFFICULTY_LABELS[course.difficulty_level] || course.difficulty_level
        const level = course.difficulty_level.toLowerCase()
        const badgeClass = `compare-badge compare-badge--${level}`
        return <span className={badgeClass}>{label}</span>
      }
      case 'estimated_hours':
        return course.estimated_hours ? `${course.estimated_hours} giờ` : 'Chưa cập nhật'
      case 'course_url':
        return course.course_url ? (
          <a href={course.course_url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
            Truy cập <AppFaIcon icon={appIcons.next} />
          </a>
        ) : (
          '—'
        )
      default:
        return (course as unknown as Record<string, unknown>)[key]?.toString() || '—'
    }
  }

  return (
    <div className="compare-table-wrapper">
      {aiSummary ? (
        <div className="compare-ai-summary">
          <div className="compare-ai-summary__head">
            <AppFaIcon icon={appIcons.ai} /> Nhận xét của AI
          </div>
          <p>{aiSummary}</p>
        </div>
      ) : null}

      <table className="compare-table">
        <thead>
          <tr>
            <th>Tiêu chí</th>
            {courses.map((course) => (
              <th key={course.id}>{course.title.slice(0, 30)}{course.title.length > 30 ? '...' : ''}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              {courses.map((course) => (
                <td key={course.id}>{renderCell(course, row.key)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <button className="compare-back-btn" type="button" onClick={onBack}>
        <AppFaIcon icon={appIcons.back} /> Chọn lại khóa học
      </button>
    </div>
  )
}
