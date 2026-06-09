import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import {
  fetchAdminCategories,
  fetchAdminTags,
  createCategory,
  updateCategory,
  deleteCategory,
  createTag,
  updateTag,
  deleteTag,
  type AdminCategoryRow,
  type AdminTagRow,
  type TaxonomyFormData,
} from '../services/admin-api'

type ModalTarget = 'category' | 'tag'
type ModalMode = 'closed' | 'create' | 'edit'

function sortByVietnameseName(a: AdminCategoryRow, b: AdminCategoryRow) {
  return a.name.localeCompare(b.name, 'vi-VN')
}

export function CategoryManagerPage() {
  const [categories, setCategories] = useState<AdminCategoryRow[]>([])
  const [tags, setTags] = useState<AdminTagRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalTarget, setModalTarget] = useState<ModalTarget>('category')
  const [modalMode, setModalMode] = useState<ModalMode>('closed')
  const [formData, setFormData] = useState<TaxonomyFormData>({ name: '', description: '', parent_id: null })
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<number>>(() => new Set())

  const [deleteInfo, setDeleteInfo] = useState<{ target: ModalTarget; id: number; name: string } | null>(null)

  const loadData = useCallback(() => {
    setIsLoading(true)
    Promise.all([fetchAdminCategories(), fetchAdminTags()])
      .then(([catData, tagData]) => {
        setCategories(catData)
        setTags(tagData)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const categoryIds = useMemo(() => new Set(categories.map((cat) => cat.id)), [categories])

  const childCategoriesByParent = useMemo(() => {
    const groups = new Map<number, AdminCategoryRow[]>()
    categories.forEach((cat) => {
      if (!cat.parent) return
      const children = groups.get(cat.parent) ?? []
      children.push(cat)
      groups.set(cat.parent, children)
    })
    groups.forEach((children) => children.sort(sortByVietnameseName))
    return groups
  }, [categories])

  const rootCategories = useMemo(() => {
    return categories
      .filter((cat) => !cat.parent || !categoryIds.has(cat.parent))
      .sort(sortByVietnameseName)
  }, [categories, categoryIds])

  function openCreate(target: ModalTarget, parentId: number | null = null) {
    setModalTarget(target)
    setFormData({ name: '', description: '', parent_id: target === 'category' ? parentId : null })
    setFormError(null)
    setModalMode('create')
  }

  function openEditCategory(cat: AdminCategoryRow) {
    setModalTarget('category')
    setFormData({ id: cat.id, name: cat.name, description: cat.description, parent_id: cat.parent ?? null })
    setFormError(null)
    setModalMode('edit')
  }

  function openEditTag(tag: AdminTagRow) {
    setModalTarget('tag')
    setFormData({ id: tag.id, name: tag.name, description: tag.description, parent_id: null })
    setFormError(null)
    setModalMode('edit')
  }

  function closeModal() {
    setModalMode('closed')
    setFormError(null)
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setFormError('Tên là bắt buộc.')
      return
    }
    setIsSaving(true)
    setFormError(null)
    try {
      if (modalTarget === 'category') {
        if (modalMode === 'create') await createCategory(formData)
        else await updateCategory(formData)
      } else {
        if (modalMode === 'create') await createTag(formData)
        else await updateTag(formData)
      }
      closeModal()
      loadData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Có lỗi xảy ra.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteInfo) return
    try {
      if (deleteInfo.target === 'category') await deleteCategory(deleteInfo.id)
      else await deleteTag(deleteInfo.id)
      setDeleteInfo(null)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể xóa.')
      setDeleteInfo(null)
    }
  }

  function toggleCategoryCollapse(categoryId: number) {
    setCollapsedCategoryIds((current) => {
      const next = new Set(current)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  function renderCategoryNode(cat: AdminCategoryRow, level: 'parent' | 'child') {
    const children = childCategoriesByParent.get(cat.id) ?? []
    const isParent = level === 'parent'
    const isCollapsed = collapsedCategoryIds.has(cat.id)

    return (
      <article
        key={cat.id}
        className={`admin-category-node ${isParent ? 'admin-category-node--parent' : 'admin-category-node--child'} ${isCollapsed ? 'is-collapsed' : ''}`}
      >
        <div className="admin-category-node__body">
          <div className="admin-category-node__main">
            <div className="admin-category-node__title">
              <strong>{cat.name}</strong>
              {cat.parent_name && <span>Con của {cat.parent_name}</span>}
            </div>
            <p>{cat.description || 'Chưa có mô tả'}</p>
          </div>
          <div className="admin-row-actions">
            {children.length > 0 && (
              <button
                type="button"
                className="admin-category-toggle"
                aria-label={isCollapsed ? 'Mở rộng danh mục con' : 'Thu gọn danh mục con'}
                aria-expanded={!isCollapsed}
                onClick={() => toggleCategoryCollapse(cat.id)}
              >
                <AppFaIcon icon={isCollapsed ? appIcons.chevron : appIcons.chevronDown} />
              </button>
            )}
            {isParent && (
              <button type="button" aria-label="Thêm danh mục con" onClick={() => openCreate('category', cat.id)}>
                <AppFaIcon icon={appIcons.plus} />
              </button>
            )}
            <button type="button" aria-label="Sửa" onClick={() => openEditCategory(cat)}>
              <AppFaIcon icon={appIcons.edit} />
            </button>
            <button type="button" aria-label="Xóa" onClick={() => setDeleteInfo({ target: 'category', id: cat.id, name: cat.name })}>
              <AppFaIcon icon={appIcons.delete} />
            </button>
          </div>
        </div>
        <footer className="admin-category-node__meta">
          <span>{cat.course_count} khóa học</span>
          <span>{cat.tag_count} tags liên quan</span>
          {children.length > 0 && <span>{children.length} danh mục con</span>}
        </footer>
        {children.length > 0 && !isCollapsed && (
          <div className="admin-category-children">
            {children.map((child) => renderCategoryNode(child, 'child'))}
          </div>
        )}
      </article>
    )
  }

  return (
    <div className="admin-reveal">
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Đang tải dữ liệu...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>{error}</div>
      ) : (
        <section className="admin-layout-grid admin-layout-grid--taxonomy admin-reveal">
          <article className="admin-panel">
            <div className="admin-panel__head">
              <div>
                <h2 className="admin-panel__title">Danh mục ({categories.length})</h2>
              </div>
              <div className="admin-panel__actions">
                <button type="button" className="admin-primary-button" onClick={() => openCreate('category')}>
                  <AppFaIcon icon={appIcons.plus} />
                  Thêm Danh mục
                </button>
              </div>
            </div>
            <div className="admin-category-tree">
              {rootCategories.map((cat) => renderCategoryNode(cat, 'parent'))}
              {categories.length === 0 && (
                <div className="admin-empty-state">Chưa có danh mục nào.</div>
              )}
            </div>
          </article>

          <article className="admin-panel">
            <div className="admin-panel__head">
              <h2 className="admin-panel__title">Tags / AI Keywords ({tags.length})</h2>
              <button type="button" className="admin-primary-button" onClick={() => openCreate('tag')}>
                <AppFaIcon icon={appIcons.plus} />
                Thêm Tag
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
                    <button type="button" aria-label="Sửa" onClick={() => openEditTag(tag)}>
                      <AppFaIcon icon={appIcons.edit} />
                    </button>
                    <button type="button" aria-label="Xóa" onClick={() => setDeleteInfo({ target: 'tag', id: tag.id, name: tag.name })}>
                      <AppFaIcon icon={appIcons.delete} />
                    </button>
                  </div>
                </article>
              ))}
              {tags.length === 0 && (
                <div className="admin-empty-state">Chưa có tag nào.</div>
              )}
            </div>
          </article>
        </section>
      )}

      {modalMode !== 'closed' && (
        <div className="admin-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="admin-modal admin-modal--small">
            <div className="admin-modal__header">
              <h2>{modalMode === 'create' ? 'Thêm' : 'Sửa'} {modalTarget === 'category' ? 'Danh mục' : 'Tag'}</h2>
              <button type="button" className="admin-modal__close" onClick={closeModal}>×</button>
            </div>
            <div className="admin-modal__body">
              {formError && <div className="admin-form-error">{formError}</div>}
              <label>
                <span>Tên *</span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={modalTarget === 'category' ? 'Ví dụ: Công nghệ thông tin' : 'Ví dụ: Machine Learning'}
                />
              </label>
              {modalTarget === 'category' && (
                <label>
                  <span>Danh mục cha</span>
                  <select
                    value={formData.parent_id ?? ''}
                    onChange={(e) => setFormData((prev) => ({
                      ...prev,
                      parent_id: e.target.value ? Number(e.target.value) : null,
                    }))}
                  >
                    <option value="">Không có - cấp cha</option>
                    {categories
                      .filter((cat) => cat.id !== formData.id)
                      .sort(sortByVietnameseName)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                  </select>
                </label>
              )}
              <label>
                <span>Mô tả</span>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả ngắn gọn..."
                />
              </label>
              <div className="admin-modal__actions">
                <button type="button" className="admin-ghost-button" onClick={closeModal}>Hủy</button>
                <button type="button" className="admin-primary-button" disabled={isSaving} onClick={() => void handleSave()}>
                  {isSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteInfo && (
        <div className="admin-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setDeleteInfo(null) }}>
          <div className="admin-modal admin-modal--small">
            <div className="admin-modal__header">
              <h2>Xác nhận xóa</h2>
              <button type="button" className="admin-modal__close" onClick={() => setDeleteInfo(null)}>×</button>
            </div>
            <div className="admin-modal__body">
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                Bạn có chắc chắn muốn xóa {deleteInfo.target === 'category' ? 'danh mục' : 'tag'} <strong>"{deleteInfo.name}"</strong>?
              </p>
              <div className="admin-modal__actions">
                <button type="button" className="admin-ghost-button" onClick={() => setDeleteInfo(null)}>Hủy</button>
                <button type="button" className="admin-primary-button" style={{ background: '#dc2626' }} onClick={() => void handleDelete()}>
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
