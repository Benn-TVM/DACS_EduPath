import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { getCourseCategory, getCourseTags, type CourseRecord } from '../../student/student-core'
import { AdminPageHeader } from '../admin-layout'
import {
  createCourse,
  deleteCourse,
  fetchAdminCategories,
  fetchAdminCourses,
  fetchAdminTags,
  taxonomyUnavailableMessage,
  updateCourse,
  type AdminCategoryRow,
  type AdminTagRow,
  type CourseFormData,
} from '../services/admin-api'

const emptyForm: CourseFormData = {
  title: '',
  course_code: '',
  provider: '',
  course_url: '',
  normalized_title: '',
  search_document: '',
  tokenized_text: '',
  difficulty_level: '',
  estimated_hours: null,
  price_type: 'free',
  certificate_type: '',
  category_id: null,
  tag_ids: [],
  is_active: true,
}

function normalizeTitle(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [categories, setCategories] = useState<AdminCategoryRow[]>([])
  const [tags, setTags] = useState<AdminTagRow[]>([])
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Tất cả danh mục')
  const [sortBy, setSortBy] = useState('newest')
  const [isLoading, setIsLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [noticeText, setNoticeText] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<CourseRecord | null>(null)
  const [form, setForm] = useState<CourseFormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [courseToDelete, setCourseToDelete] = useState<CourseRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setErrorText('')
    setNoticeText('')

    const [courseResult, categoryResult, tagResult] = await Promise.allSettled([
      fetchAdminCourses(),
      fetchAdminCategories(),
      fetchAdminTags(),
    ])

    if (courseResult.status === 'fulfilled') {
      setCourses(courseResult.value)
    } else {
      setCourses([])
      setErrorText(courseResult.reason instanceof Error ? courseResult.reason.message : 'Không thể tải dữ liệu khóa học.')
    }

    const degradedMessages: string[] = []

    if (categoryResult.status === 'fulfilled') {
      setCategories(categoryResult.value)
    } else {
      setCategories([])
      degradedMessages.push(
        categoryResult.reason instanceof Error ? categoryResult.reason.message : taxonomyUnavailableMessage,
      )
    }

    if (tagResult.status === 'fulfilled') {
      setTags(tagResult.value)
    } else {
      setTags([])
      degradedMessages.push(tagResult.reason instanceof Error ? tagResult.reason.message : taxonomyUnavailableMessage)
    }

    if (degradedMessages.length > 0) {
      setNoticeText(Array.from(new Set(degradedMessages)).join(' '))
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const categoryOptions = useMemo(
    () => ['Tất cả danh mục', ...categories.map((category) => category.name)],
    [categories],
  )

  const visibleCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return [...courses]
      .filter((course) => {
        const tagsText = getCourseTags(course).join(' ')
        const matchesQuery =
          !normalizedQuery ||
          [
            course.title,
            course.course_code ?? '',
            course.provider,
            course.search_document,
            getCourseCategory(course),
            tagsText,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        const matchesCategory =
          categoryFilter === 'Tất cả danh mục' || getCourseCategory(course) === categoryFilter
        return matchesQuery && matchesCategory
      })
      .sort((first, second) => {
        if (sortBy === 'title') {
          return first.title.localeCompare(second.title, 'vi')
        }
        return (second.updated_at ?? '').localeCompare(first.updated_at ?? '')
      })
  }, [categoryFilter, courses, query, sortBy])

  function openCreateModal() {
    setEditingCourse(null)
    setForm({ ...emptyForm })
    setFormError('')
    setIsModalOpen(true)
  }

  function openEditModal(course: CourseRecord) {
    setEditingCourse(course)
    setForm({
      id: course.id,
      title: course.title,
      course_code: course.course_code ?? '',
      provider: course.provider ?? '',
      course_url: course.course_url ?? '',
      normalized_title: course.normalized_title ?? '',
      search_document: course.search_document ?? '',
      tokenized_text: course.tokenized_text ?? '',
      difficulty_level: course.difficulty_level ?? '',
      estimated_hours: course.estimated_hours ?? null,
      price_type: course.price_type ?? 'free',
      certificate_type: course.certificate_type ?? '',
      category_id: course.category?.id ?? null,
      tag_ids: course.tags?.map((tag) => tag.id) ?? [],
      is_active: course.is_active !== false,
    })
    setFormError('')
    setIsModalOpen(true)
  }

  function closeModal() {
    if (isSaving) {
      return
    }
    setIsModalOpen(false)
    setEditingCourse(null)
    setFormError('')
  }

  function updateField<Key extends keyof CourseFormData>(key: Key, value: CourseFormData[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggleTag(tagId: number) {
    setForm((current) => ({
      ...current,
      tag_ids: current.tag_ids.includes(tagId)
        ? current.tag_ids.filter((value) => value !== tagId)
        : [...current.tag_ids, tagId],
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.title.trim()) {
      setFormError('Tên khóa học là bắt buộc.')
      return
    }

    const payload: CourseFormData = {
      ...form,
      title: form.title.trim(),
      course_code: form.course_code.trim(),
      provider: form.provider.trim(),
      course_url: form.course_url.trim(),
      normalized_title: form.normalized_title.trim() || normalizeTitle(form.title),
      search_document: form.search_document.trim(),
      tokenized_text: form.tokenized_text.trim(),
      difficulty_level: form.difficulty_level.trim(),
      price_type: form.price_type.trim(),
      certificate_type: form.certificate_type.trim(),
    }

    setIsSaving(true)
    setFormError('')
    try {
      if (editingCourse) {
        await updateCourse(payload)
      } else {
        await createCourse(payload)
      }
      setIsModalOpen(false)
      await loadData()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu khóa học.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteCourse() {
    if (!courseToDelete) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteCourse(courseToDelete.id)
      setCourseToDelete(null)
      await loadData()
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Không thể xóa khóa học.')
    } finally {
      setIsDeleting(false)
    }
  }

  const taxonomyDisabled = categories.length === 0 && tags.length === 0 && noticeText.length > 0

  return (
    <>
      <AdminPageHeader
        title="Quản Lý Khóa Học"
        action={
          <button type="button" className="admin-primary-button" onClick={openCreateModal}>
            <AppFaIcon icon={appIcons.plus} /> Thêm Khóa Học
          </button>
        }
      />

      <section className="admin-toolbar admin-reveal">
        <label className="admin-toolbar__search">
          <AppFaIcon icon={appIcons.search} />
          <input
            type="search"
            placeholder="Tìm theo tên, mã, nhà cung cấp hoặc tag..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="newest">Mới Cập Nhật</option>
          <option value="title">Theo Tên</option>
        </select>
        <button type="button" className="admin-toolbar__icon" aria-hidden="true">
          <AppFaIcon icon={appIcons.filter} />
        </button>
      </section>

      {errorText ? <p className="dashboard-status dashboard-status--error">{errorText}</p> : null}
      {noticeText ? <p className="dashboard-status">{noticeText}</p> : null}
      {isLoading ? <p className="dashboard-status">Đang tải danh sách khóa học...</p> : null}

      {!isLoading ? (
        <section className="admin-panel admin-panel--table admin-reveal">
          <div className="admin-course-table">
            <div className="admin-course-table__head">
              <span>Tên Khóa Học</span>
              <span>Danh Mục</span>
              <span>Tag</span>
              <span>Nhà Cung Cấp</span>
              <span>Thao Tác</span>
            </div>
            {visibleCourses.map((course) => (
              <article key={course.id} className="admin-course-row">
                <div className="admin-course-row__title">
                  <div>
                    <strong>{course.title}</strong>
                    <p>
                      {course.course_code || 'Chưa có mã'} •{' '}
                      {course.updated_at
                        ? new Intl.DateTimeFormat('vi-VN').format(new Date(course.updated_at))
                        : 'Chưa rõ ngày cập nhật'}
                    </p>
                  </div>
                </div>
                <span className="admin-pill admin-pill--category">{getCourseCategory(course)}</span>
                <div className="admin-tag-list">
                  {getCourseTags(course).slice(0, 4).map((tag) => (
                    <span key={tag} className="admin-pill admin-pill--tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <span>{course.provider || 'Chưa có nhà cung cấp'}</span>
                <div className="admin-row-actions">
                  <button type="button" aria-label={`Chỉnh sửa ${course.title}`} onClick={() => openEditModal(course)}>
                    <AppFaIcon icon={appIcons.edit} />
                  </button>
                  <button type="button" aria-label={`Xóa ${course.title}`} onClick={() => setCourseToDelete(course)}>
                    <AppFaIcon icon={appIcons.delete} />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <footer className="admin-pagination">
            <span>
              Hiển thị {visibleCourses.length} trong {courses.length} khóa học
            </span>
          </footer>
        </section>
      ) : null}

      {isModalOpen ? (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <form className="admin-modal" onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
            <div className="admin-modal__header">
              <h2>{editingCourse ? 'Chỉnh Sửa Khóa Học' : 'Thêm Khóa Học Mới'}</h2>
              <button type="button" className="admin-modal__close" onClick={closeModal}>
                &times;
              </button>
            </div>
            <div className="admin-modal__body">
              {formError ? <p className="admin-modal__error">{formError}</p> : null}

              <label>
                <span>Tên Khóa Học</span>
                <input type="text" value={form.title} onChange={(event) => updateField('title', event.target.value)} />
              </label>

              <div className="admin-modal__row admin-modal__row--two">
                <label>
                  <span>Mã Khóa Học</span>
                  <input
                    type="text"
                    value={form.course_code}
                    onChange={(event) => updateField('course_code', event.target.value)}
                  />
                </label>
                <label>
                  <span>Nhà Cung Cấp</span>
                  <input type="text" value={form.provider} onChange={(event) => updateField('provider', event.target.value)} />
                </label>
              </div>

              <label>
                <span>URL Khóa Học</span>
                <input type="text" value={form.course_url} onChange={(event) => updateField('course_url', event.target.value)} />
              </label>

              <label>
                <span>Mô Tả / Search Document</span>
                <textarea
                  rows={4}
                  value={form.search_document}
                  onChange={(event) => updateField('search_document', event.target.value)}
                />
              </label>

              <label>
                <span>Tokenized Text</span>
                <textarea
                  rows={2}
                  value={form.tokenized_text}
                  onChange={(event) => updateField('tokenized_text', event.target.value)}
                />
              </label>

              <div className="admin-modal__row admin-modal__row--three">
                <label>
                  <span>Danh Mục</span>
                  <select
                    value={form.category_id ?? ''}
                    onChange={(event) => updateField('category_id', event.target.value ? Number(event.target.value) : null)}
                    disabled={taxonomyDisabled}
                  >
                    <option value="">Chưa gán</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Độ Khó</span>
                  <input
                    type="text"
                    value={form.difficulty_level}
                    onChange={(event) => updateField('difficulty_level', event.target.value)}
                  />
                </label>
                <label>
                  <span>Số Giờ</span>
                  <input
                    type="number"
                    min={0}
                    value={form.estimated_hours ?? ''}
                    onChange={(event) => updateField('estimated_hours', event.target.value ? Number(event.target.value) : null)}
                  />
                </label>
              </div>

              <div className="admin-modal__row admin-modal__row--three">
                <label>
                  <span>Loại Giá</span>
                  <select value={form.price_type} onChange={(event) => updateField('price_type', event.target.value)}>
                    <option value="free">Miễn Phí</option>
                    <option value="paid">Trả Phí</option>
                    <option value="freemium">Freemium</option>
                  </select>
                </label>
                <label>
                  <span>Chứng Chỉ</span>
                  <input
                    type="text"
                    value={form.certificate_type}
                    onChange={(event) => updateField('certificate_type', event.target.value)}
                  />
                </label>
                <label className="admin-checkbox-field">
                  <span>Hiển Thị</span>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => updateField('is_active', event.target.checked)}
                  />
                </label>
              </div>

              <div className="admin-tag-selector">
                <span className="admin-tag-selector__label">Tag</span>
                <div className="admin-tag-selector__options">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`admin-tag-selector__chip${form.tag_ids.includes(tag.id) ? ' is-selected' : ''}`}
                      onClick={() => toggleTag(tag.id)}
                      disabled={taxonomyDisabled}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="admin-modal__footer">
              <button type="button" className="admin-ghost-button" onClick={closeModal}>
                Hủy
              </button>
              <button type="submit" className="admin-primary-button" disabled={isSaving}>
                {isSaving ? 'Đang Lưu...' : editingCourse ? 'Lưu Thay Đổi' : 'Tạo Khóa Học'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {courseToDelete ? (
        <div className="admin-modal-backdrop" onClick={() => setCourseToDelete(null)}>
          <div className="admin-modal admin-modal--small" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal__header">
              <h2>Xóa Khóa Học</h2>
              <button type="button" className="admin-modal__close" onClick={() => setCourseToDelete(null)}>
                &times;
              </button>
            </div>
            <div className="admin-modal__body">
              <p>
                Bạn có chắc muốn xóa <strong>{courseToDelete.title}</strong>?
              </p>
            </div>
            <div className="admin-modal__footer">
              <button type="button" className="admin-ghost-button" onClick={() => setCourseToDelete(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="admin-primary-button admin-primary-button--danger"
                disabled={isDeleting}
                onClick={() => void handleDeleteCourse()}
              >
                {isDeleting ? 'Đang Xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
