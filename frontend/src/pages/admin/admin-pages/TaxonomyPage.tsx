import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { AdminPageHeader } from '../admin-layout'
import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  fetchAdminCategories,
  fetchAdminTags,
  taxonomyUnavailableMessage,
  updateCategory,
  updateTag,
  type AdminCategoryRow,
  type AdminTagRow,
} from '../services/admin-api'

type TaxonomyMode = 'create-category' | 'edit-category' | 'create-tag' | 'edit-tag' | null

export function TaxonomyPage() {
  const [categories, setCategories] = useState<AdminCategoryRow[]>([])
  const [tags, setTags] = useState<AdminTagRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [noticeText, setNoticeText] = useState('')
  const [isTaxonomyUnavailable, setIsTaxonomyUnavailable] = useState(false)

  const [modalMode, setModalMode] = useState<TaxonomyMode>(null)
  const [editingCategory, setEditingCategory] = useState<AdminCategoryRow | null>(null)
  const [editingTag, setEditingTag] = useState<AdminTagRow | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [categoryToDelete, setCategoryToDelete] = useState<AdminCategoryRow | null>(null)
  const [tagToDelete, setTagToDelete] = useState<AdminTagRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setErrorText('')
    setNoticeText('')
    setIsTaxonomyUnavailable(false)

    const [categoryResult, tagResult] = await Promise.allSettled([
      fetchAdminCategories(),
      fetchAdminTags(),
    ])

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
      setIsTaxonomyUnavailable(true)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function openCreateCategory() {
    if (isTaxonomyUnavailable) {
      return
    }
    setModalMode('create-category')
    setEditingCategory(null)
    setEditingTag(null)
    setFormName('')
    setFormDescription('')
    setFormError('')
  }

  function openEditCategory(category: AdminCategoryRow) {
    if (isTaxonomyUnavailable) {
      return
    }
    setModalMode('edit-category')
    setEditingCategory(category)
    setEditingTag(null)
    setFormName(category.name)
    setFormDescription(category.description)
    setFormError('')
  }

  function openCreateTag() {
    if (isTaxonomyUnavailable) {
      return
    }
    setModalMode('create-tag')
    setEditingCategory(null)
    setEditingTag(null)
    setFormName('')
    setFormDescription('')
    setFormError('')
  }

  function openEditTag(tag: AdminTagRow) {
    if (isTaxonomyUnavailable) {
      return
    }
    setModalMode('edit-tag')
    setEditingTag(tag)
    setEditingCategory(null)
    setFormName(tag.name)
    setFormDescription(tag.description)
    setFormError('')
  }

  function closeModal() {
    if (isSaving) {
      return
    }
    setModalMode(null)
    setEditingCategory(null)
    setEditingTag(null)
    setFormError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formName.trim()) {
      setFormError('Tên là bắt buộc.')
      return
    }

    setIsSaving(true)
    setFormError('')
    try {
      if (modalMode === 'create-category') {
        await createCategory({ name: formName.trim(), description: formDescription.trim() })
      } else if (modalMode === 'edit-category' && editingCategory) {
        await updateCategory({ id: editingCategory.id, name: formName.trim(), description: formDescription.trim() })
      } else if (modalMode === 'create-tag') {
        await createTag({ name: formName.trim(), description: formDescription.trim() })
      } else if (modalMode === 'edit-tag' && editingTag) {
        await updateTag({ id: editingTag.id, name: formName.trim(), description: formDescription.trim() })
      }

      closeModal()
      await loadData()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu dữ liệu.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteCategory() {
    if (!categoryToDelete) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteCategory(categoryToDelete.id)
      setCategoryToDelete(null)
      await loadData()
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Không thể xóa danh mục.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleDeleteTag() {
    if (!tagToDelete) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteTag(tagToDelete.id)
      setTagToDelete(null)
      await loadData()
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Không thể xóa tag.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Quản Lý Danh Mục Và Tag"
      />

      {errorText ? <p className="dashboard-status dashboard-status--error">{errorText}</p> : null}
      {noticeText ? <p className="dashboard-status">{noticeText}</p> : null}
      {isLoading ? <p className="dashboard-status">Đang tải danh mục và tag...</p> : null}

      {!isLoading && isTaxonomyUnavailable ? (
        <section className="admin-panel admin-reveal">
          <div className="admin-panel__head">
            <div>
              <h2>Danh Mục Và Tag Chưa Sẵn Sàng</h2>
              <p>
                Cơ sở dữ liệu hiện chưa có đủ bảng hoặc cột taxonomy để trang này tải dữ liệu thật. Khi migrate xong,
                trang sẽ hiển thị lại bình thường.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!isLoading && !isTaxonomyUnavailable ? (
        <section className="admin-layout-grid admin-layout-grid--taxonomy">
          <article className="admin-panel admin-reveal">
            <div className="admin-panel__head">
              <div>
                <h2>Danh Mục Khóa Học</h2>
                <p>Dữ liệu lấy trực tiếp từ API quản lý danh mục.</p>
              </div>
              <button type="button" className="admin-primary-button" onClick={openCreateCategory}>
                <AppFaIcon icon={appIcons.plus} /> Thêm Danh Mục
              </button>
            </div>
            <div className="admin-category-list">
              {categories.map((category) => (
                <article key={category.id}>
                  <div>
                    <strong>{category.name}</strong>
                    <span>{category.slug}</span>
                  </div>
                  <p>{category.description || 'Chưa có mô tả.'}</p>
                  <footer>
                    <span>{category.course_count} khóa học</span>
                    <span>{category.tag_count} tag</span>
                    <div className="admin-row-actions">
                      <button type="button" aria-label={`Chỉnh sửa ${category.name}`} onClick={() => openEditCategory(category)}>
                        <AppFaIcon icon={appIcons.edit} />
                      </button>
                      <button type="button" aria-label={`Xóa ${category.name}`} onClick={() => setCategoryToDelete(category)}>
                        <AppFaIcon icon={appIcons.delete} />
                      </button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          </article>

          <article className="admin-panel admin-reveal">
            <div className="admin-panel__head">
              <div>
                <h2>Tag Phổ Biến</h2>
                <p>Dữ liệu lấy trực tiếp từ API quản lý tag.</p>
              </div>
              <button type="button" className="admin-primary-button" onClick={openCreateTag}>
                <AppFaIcon icon={appIcons.plus} /> Thêm Tag
              </button>
            </div>
            <div className="admin-tag-cloud admin-tag-cloud--grid">
              {tags.map((tag) => (
                <article key={tag.id} className="admin-taxonomy-chip">
                  <div>
                    <strong>{tag.name}</strong>
                    <span>{tag.course_count} khóa học</span>
                  </div>
                  <div className="admin-row-actions">
                    <button type="button" aria-label={`Chỉnh sửa tag ${tag.name}`} onClick={() => openEditTag(tag)}>
                      <AppFaIcon icon={appIcons.edit} />
                    </button>
                    <button type="button" aria-label={`Xóa tag ${tag.name}`} onClick={() => setTagToDelete(tag)}>
                      <AppFaIcon icon={appIcons.delete} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {modalMode ? (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <form className="admin-modal admin-modal--small" onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
            <div className="admin-modal__header">
              <h2>
                {modalMode === 'create-category' && 'Thêm Danh Mục'}
                {modalMode === 'edit-category' && 'Chỉnh Sửa Danh Mục'}
                {modalMode === 'create-tag' && 'Thêm Tag'}
                {modalMode === 'edit-tag' && 'Chỉnh Sửa Tag'}
              </h2>
              <button type="button" className="admin-modal__close" onClick={closeModal}>
                &times;
              </button>
            </div>
            <div className="admin-modal__body">
              {formError ? <p className="admin-modal__error">{formError}</p> : null}
              <label>
                <span>Tên</span>
                <input type="text" value={formName} onChange={(event) => setFormName(event.target.value)} />
              </label>
              <label>
                <span>Mô Tả</span>
                <textarea rows={4} value={formDescription} onChange={(event) => setFormDescription(event.target.value)} />
              </label>
            </div>
            <div className="admin-modal__footer">
              <button type="button" className="admin-ghost-button" onClick={closeModal}>
                Hủy
              </button>
              <button type="submit" className="admin-primary-button" disabled={isSaving}>
                {isSaving ? 'Đang Lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {categoryToDelete ? (
        <div className="admin-modal-backdrop" onClick={() => setCategoryToDelete(null)}>
          <div className="admin-modal admin-modal--small" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal__header">
              <h2>Xóa Danh Mục</h2>
              <button type="button" className="admin-modal__close" onClick={() => setCategoryToDelete(null)}>
                &times;
              </button>
            </div>
            <div className="admin-modal__body">
              <p>
                Bạn có chắc muốn xóa danh mục <strong>{categoryToDelete.name}</strong>?
              </p>
            </div>
            <div className="admin-modal__footer">
              <button type="button" className="admin-ghost-button" onClick={() => setCategoryToDelete(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="admin-primary-button admin-primary-button--danger"
                disabled={isDeleting}
                onClick={() => void handleDeleteCategory()}
              >
                {isDeleting ? 'Đang Xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tagToDelete ? (
        <div className="admin-modal-backdrop" onClick={() => setTagToDelete(null)}>
          <div className="admin-modal admin-modal--small" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal__header">
              <h2>Xóa Tag</h2>
              <button type="button" className="admin-modal__close" onClick={() => setTagToDelete(null)}>
                &times;
              </button>
            </div>
            <div className="admin-modal__body">
              <p>
                Bạn có chắc muốn xóa tag <strong>{tagToDelete.name}</strong>?
              </p>
            </div>
            <div className="admin-modal__footer">
              <button type="button" className="admin-ghost-button" onClick={() => setTagToDelete(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="admin-primary-button admin-primary-button--danger"
                disabled={isDeleting}
                onClick={() => void handleDeleteTag()}
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
