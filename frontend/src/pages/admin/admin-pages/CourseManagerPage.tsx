import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import {
  fetchAdminCourse,
  fetchAdminCourses,
  fetchAdminCategories,
  fetchAdminTags,
  createCourse,
  updateCourse,
  deleteCourse,
  type AdminCategoryRow,
  type AdminTagRow,
  type CourseFormData,
} from '../services/admin-api'
import type { CourseRecord } from '../../student/student-core'

type ModalMode = 'closed' | 'create' | 'edit'
type StatusFilter = 'all' | 'active' | 'hidden'
type QualityFilter = 'all' | 'good' | 'needs-work'

const ADMIN_COURSE_RENDER_BATCH_SIZE = 120

interface ImportPreviewRow {
  rowNumber: number
  data: CourseFormData
  issues: string[]
}

const EMPTY_FORM: CourseFormData = {
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

const difficultyLabels: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
}

const priceTypeLabels: Record<string, string> = {
  free: 'Miễn phí',
  paid: 'Trả phí',
  freemium: 'Freemium',
}

const tagKeywordCatalog: Record<string, string[]> = {
  aitaosinh: ['ai tao sinh', 'generative ai', 'genai', 'large language model', 'llm', 'chatgpt', 'prompt', 'foundation model'],
  baomat: ['bao mat', 'an ninh', 'security', 'cyber', 'cryptography', 'malware', 'pentest', 'firewall', 'soc'],
  bigdata: ['big data', 'hadoop', 'spark', 'data lake', 'warehouse', 'etl', 'distributed data'],
  cosodulieu: ['co so du lieu', 'database', 'sql', 'mysql', 'postgresql', 'oracle', 'sql server', 'mongodb', 'query'],
  computervision: ['computer vision', 'thi giac may tinh', 'xu ly anh', 'image processing', 'opencv', 'cnn', 'object detection'],
  datascience: ['data science', 'khoa hoc du lieu', 'phan tich du lieu', 'data analysis', 'analytics', 'pandas', 'visualization'],
  deeplearning: ['deep learning', 'hoc sau', 'neural network', 'tensorflow', 'pytorch', 'cnn', 'rnn', 'transformer'],
  devopsmlops: ['devops', 'mlops', 'ci cd', 'docker', 'kubernetes', 'deployment', 'pipeline', 'monitoring'],
  hephantan: ['he phan tan', 'distributed system', 'distributed systems', 'microservice', 'concurrency', 'parallel', 'cloud native'],
  iot: ['iot', 'internet of things', 'embedded', 'sensor', 'arduino', 'raspberry', 'edge computing'],
  machinelearning: ['machine learning', 'hoc may', 'classification', 'regression', 'clustering', 'model training', 'scikit'],
  mangmaytinh: ['mang may tinh', 'network', 'networking', 'tcp ip', 'routing', 'switching', 'cisco', 'lan', 'wan'],
  mobile: ['mobile', 'android', 'ios', 'react native', 'flutter', 'swift', 'kotlin', 'ung dung di dong'],
  nhapmon: ['nhap mon', 'co ban', 'intro', 'introduction', 'fundamental', 'foundation', 'overview', '101'],
  nlp: ['nlp', 'natural language processing', 'xu ly ngon ngu', 'language model', 'text mining', 'sentiment', 'tokenization'],
  phanmem: ['phan mem', 'software', 'software engineering', 'lap trinh', 'programming', 'web', 'frontend', 'backend', 'erp', 'system analysis'],
}

function getCourseWarnings(course: CourseRecord) {
  const warnings: string[] = []
  const searchDocumentLength = course.search_document_length ?? (course.search_document || '').trim().length
  const searchDocument = { length: searchDocumentLength }

  if (!course.category) warnings.push('Thiếu danh mục')
  if (!course.tags || course.tags.length === 0) warnings.push('Thiếu tag')
  if (searchDocument.length < 50) warnings.push('Mô tả AI quá ngắn')
  if (!course.difficulty_level) warnings.push('Thiếu mức độ')
  if (!course.provider) warnings.push('Thiếu đơn vị')

  return warnings
}

function getDifficultyLabel(value?: string) {
  if (!value) return 'Chưa xác định'
  return difficultyLabels[value] || value
}

function getPriceTypeLabel(value?: string) {
  if (!value) return 'Miễn phí'
  return priceTypeLabels[value] || value
}

function normalizeImportKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

function normalizeMatchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeTagLookup(value: string) {
  return normalizeMatchText(value).replace(/\s+/g, '')
}

function getImportValue(row: Record<string, unknown>, keys: string[]) {
  const normalizedKeys = new Map(Object.keys(row).map((key) => [normalizeImportKey(key), key]))

  for (const key of keys) {
    const matchedKey = normalizedKeys.get(normalizeImportKey(key))
    if (matchedKey) {
      const value = row[matchedKey]
      if (value !== null && value !== undefined) {
        return String(value).trim()
      }
    }
  }

  return ''
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let isQuoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"' && isQuoted && nextChar === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      isQuoted = !isQuoted
    } else if (char === ',' && !isQuoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current.trim())
  return cells
}

function parseCsvFile(text: string) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    return []
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim())

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line)
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = cells[index] ?? ''
      return record
    }, {})
  })
}

function parseImportFileContent(text: string, fileName: string) {
  if (fileName.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text) as unknown
    if (Array.isArray(parsed)) {
      return parsed as Record<string, unknown>[]
    }
    if (typeof parsed === 'object' && parsed !== null && 'courses' in parsed && Array.isArray((parsed as { courses: unknown }).courses)) {
      return (parsed as { courses: Record<string, unknown>[] }).courses
    }
    throw new Error('File JSON cần là một mảng khóa học hoặc object có trường courses.')
  }

  return parseCsvFile(text)
}

function parseImportNumber(value: string) {
  if (!value) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeDifficulty(value: string) {
  const normalized = normalizeImportKey(value)
  if (['beginner', 'basic', 'coban', 'cosoban'].includes(normalized)) return 'beginner'
  if (['intermediate', 'medium', 'trungcap'].includes(normalized)) return 'intermediate'
  if (['advanced', 'nangcao'].includes(normalized)) return 'advanced'
  return value
}

function normalizePriceType(value: string) {
  const normalized = normalizeImportKey(value)
  if (['paid', 'traphi', 'cost'].includes(normalized)) return 'paid'
  if (['freemium'].includes(normalized)) return 'freemium'
  return 'free'
}

function findImportCategoryId(value: string, categories: AdminCategoryRow[]) {
  if (!value) return null
  const numberValue = Number(value)
  if (Number.isFinite(numberValue) && categories.some((category) => category.id === numberValue)) {
    return numberValue
  }

  const normalized = normalizeImportKey(value)
  return categories.find((category) => normalizeImportKey(category.name) === normalized || normalizeImportKey(category.slug) === normalized)?.id ?? null
}

function findImportTagIds(value: string, tags: AdminTagRow[]) {
  if (!value) return []
  const parts = value.split(/[;,|]/).map((part) => part.trim()).filter(Boolean)

  return parts.reduce<number[]>((ids, part) => {
    const numberValue = Number(part)
    const matchedTag = Number.isFinite(numberValue)
      ? tags.find((tag) => tag.id === numberValue)
      : tags.find((tag) => {
        const normalized = normalizeImportKey(part)
        return normalizeImportKey(tag.name) === normalized || normalizeImportKey(tag.slug) === normalized
      })

    if (matchedTag && !ids.includes(matchedTag.id)) {
      ids.push(matchedTag.id)
    }
    return ids
  }, [])
}

function buildImportPreviewRow(row: Record<string, unknown>, rowNumber: number, categories: AdminCategoryRow[], tags: AdminTagRow[]): ImportPreviewRow {
  const title = getImportValue(row, ['title', 'ten_khoa_hoc', 'tên khóa học', 'course_title', 'name'])
  const courseCode = getImportValue(row, ['course_code', 'ma_khoa_hoc', 'mã khóa học', 'code'])
  const provider = getImportValue(row, ['provider', 'don_vi', 'đơn vị', 'source'])
  const courseUrl = getImportValue(row, ['course_url', 'url', 'link'])
  const categoryValue = getImportValue(row, ['category_id', 'category', 'danh_muc', 'danh mục'])
  const tagValue = getImportValue(row, ['tag_ids', 'tags', 'tag', 'tu_khoa', 'từ khóa'])
  const difficulty = normalizeDifficulty(getImportValue(row, ['difficulty_level', 'difficulty', 'muc_do', 'mức độ']))
  const estimatedHours = parseImportNumber(getImportValue(row, ['estimated_hours', 'hours', 'so_gio', 'số giờ']))
  const priceType = normalizePriceType(getImportValue(row, ['price_type', 'price', 'loai_gia', 'loại giá']))
  const categoryId = findImportCategoryId(categoryValue, categories)
  const tagIds = findImportTagIds(tagValue, tags)
  const searchDocument = getImportValue(row, ['search_document', 'description', 'mo_ta', 'mô tả', 'summary'])
  const normalizedTitle = getImportValue(row, ['normalized_title', 'tieu_de_chuan_hoa', 'tiêu đề chuẩn hóa'])
  const tokenizedText = getImportValue(row, ['tokenized_text', 'tokens', 'token'])
  const isActiveValue = getImportValue(row, ['is_active', 'active', 'trang_thai', 'trạng thái'])
  const issues: string[] = []

  if (!title) issues.push('Thiếu tên khóa học')
  if (courseUrl && !/^https?:\/\//i.test(courseUrl)) issues.push('URL không hợp lệ')
  if (categoryValue && !categoryId) issues.push(`Không tìm thấy danh mục "${categoryValue}"`)
  if (tagValue && tagIds.length === 0) issues.push('Không tìm thấy tag phù hợp')

  return {
    rowNumber,
    issues,
    data: {
      title,
      course_code: courseCode,
      provider,
      course_url: courseUrl,
      normalized_title: normalizedTitle,
      search_document: searchDocument,
      tokenized_text: tokenizedText,
      difficulty_level: difficulty,
      estimated_hours: estimatedHours,
      price_type: priceType,
      certificate_type: getImportValue(row, ['certificate_type', 'certificate', 'chung_chi', 'chứng chỉ']),
      category_id: categoryId,
      tag_ids: tagIds,
      is_active: !['false', '0', 'hidden', 'an', 'ẩn', 'inactive'].includes(normalizeImportKey(isActiveValue)),
    },
  }
}

function getCourseUpdatePayload(course: CourseRecord, tagIds?: number[]): CourseFormData {
  return {
    id: course.id,
    title: course.title,
    course_code: course.course_code || '',
    provider: course.provider || '',
    course_url: course.course_url || '',
    normalized_title: course.normalized_title || '',
    search_document: course.search_document || '',
    tokenized_text: course.tokenized_text || '',
    difficulty_level: course.difficulty_level || '',
    estimated_hours: course.estimated_hours ?? null,
    price_type: course.price_type || 'free',
    certificate_type: course.certificate_type || '',
    category_id: course.category?.id ?? null,
    tag_ids: tagIds ?? course.tags?.map((tag) => tag.id) ?? [],
    is_active: course.is_active !== false,
  }
}

function suggestTagIdsForCourse(course: CourseRecord, tags: AdminTagRow[]) {
  const courseText = normalizeMatchText([
    course.title,
    course.course_code,
    course.provider,
    course.normalized_title,
    course.search_document,
    course.tokenized_text,
    course.category?.name,
    course.category?.slug,
    course.category?.parent_name,
  ].filter(Boolean).join(' '))

  if (!courseText) return []

  const scoredTags = tags
    .map((tag) => {
      const tagName = normalizeMatchText(tag.name)
      const tagSlug = normalizeMatchText(tag.slug)
      const tagDescription = normalizeMatchText(tag.description || '')
      const catalogKeywords = tagKeywordCatalog[normalizeTagLookup(tag.name)] ?? []
      const keywords = [tagName, tagSlug, tagDescription, ...catalogKeywords]
        .map(normalizeMatchText)
        .filter((keyword) => keyword.length >= 2)

      const score = keywords.reduce((total, keyword) => {
        if (!keyword || !courseText.includes(keyword)) return total
        if (keyword === tagName || keyword === tagSlug) return total + 8
        if (keyword.length <= 3) return total + 2
        return total + 5
      }, 0)

      return { tag, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.tag.name.localeCompare(b.tag.name, 'vi-VN'))

  return scoredTags.slice(0, 3).map((item) => item.tag.id)
}

export function CourseManagerPage() {
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [categories, setCategories] = useState<AdminCategoryRow[]>([])
  const [tags, setTags] = useState<AdminTagRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all')
  const [courseRenderLimit, setCourseRenderLimit] = useState(ADMIN_COURSE_RENDER_BATCH_SIZE)

  const [modalMode, setModalMode] = useState<ModalMode>('closed')
  const [formData, setFormData] = useState<CourseFormData>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingCourseDetail, setIsLoadingCourseDetail] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CourseRecord | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [autoTagResult, setAutoTagResult] = useState<string | null>(null)
  const [autoTagError, setAutoTagError] = useState<string | null>(null)
  const [isAutoTagging, setIsAutoTagging] = useState(false)

  const loadData = useCallback(() => {
    setIsLoading(true)
    setError(null)
    Promise.all([fetchAdminCourses(), fetchAdminCategories().catch(() => []), fetchAdminTags().catch(() => [])])
      .then(([courseData, categoryData, tagData]) => {
        const tagById = new Map(tagData.map((tag) => [tag.id, tag]))
        const normalizedCourses = courseData.map((course) => ({
          ...course,
          tags: course.tags?.length
            ? course.tags
            : (course.tag_ids ?? [])
              .map((tagId) => tagById.get(tagId))
              .filter((tag): tag is AdminTagRow => Boolean(tag))
              .map((tag) => ({
                id: tag.id,
                name: tag.name,
                slug: tag.slug,
                description: tag.description,
              })),
        }))
        setCourses(normalizedCourses)
        setCategories(categoryData)
        setTags(tagData)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const courseStats = useMemo(() => {
    const active = courses.filter((course) => course.is_active !== false).length
    const needsWork = courses.filter((course) => getCourseWarnings(course).length > 0).length
    const categorized = courses.filter((course) => Boolean(course.category)).length
    const tagged = courses.filter((course) => course.tags && course.tags.length > 0).length

    return { active, hidden: courses.length - active, needsWork, categorized, tagged }
  }, [courses])

  const coursesMissingTags = useMemo(() => {
    return courses.filter((course) => !course.tags || course.tags.length === 0)
  }, [courses])

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return courses.filter((course) => {
      const warnings = getCourseWarnings(course)
      const matchesSearch = !q ||
        course.title.toLowerCase().includes(q) ||
        (course.course_code || '').toLowerCase().includes(q) ||
        (course.provider || '').toLowerCase().includes(q) ||
        (course.normalized_title || '').toLowerCase().includes(q)
      const matchesCategory = categoryFilter === 'all' || String(course.category?.id ?? '') === categoryFilter
      const matchesTag = tagFilter === 'all' || Boolean(course.tags?.some((tag) => String(tag.id) === tagFilter))
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && course.is_active !== false) ||
        (statusFilter === 'hidden' && course.is_active === false)
      const matchesQuality =
        qualityFilter === 'all' ||
        (qualityFilter === 'good' && warnings.length === 0) ||
        (qualityFilter === 'needs-work' && warnings.length > 0)

      return matchesSearch && matchesCategory && matchesTag && matchesStatus && matchesQuality
    })
  }, [categoryFilter, courses, qualityFilter, searchQuery, statusFilter, tagFilter])

  const renderedCourses = useMemo(
    () => filteredCourses.slice(0, courseRenderLimit),
    [courseRenderLimit, filteredCourses],
  )
  const hiddenCourseCount = Math.max(0, filteredCourses.length - renderedCourses.length)

  useEffect(() => {
    setCourseRenderLimit(ADMIN_COURSE_RENDER_BATCH_SIZE)
  }, [categoryFilter, qualityFilter, searchQuery, statusFilter, tagFilter])

  function openCreateModal() {
    setFormData(EMPTY_FORM)
    setFormError(null)
    setModalMode('create')
  }

  async function openEditModal(course: CourseRecord) {
    setFormData(getCourseUpdatePayload(course))
    setFormError(null)
    setModalMode('edit')
    setIsLoadingCourseDetail(true)

    try {
      const fullCourse = await fetchAdminCourse(course.id)
      setFormData(getCourseUpdatePayload(fullCourse))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'KhÃ´ng thá»ƒ táº£i chi tiáº¿t khÃ³a há»c.')
    } finally {
      setIsLoadingCourseDetail(false)
    }
  }

  function closeModal() {
    setModalMode('closed')
    setFormError(null)
    setIsLoadingCourseDetail(false)
  }

  function openImportModal() {
    setIsImportOpen(true)
    setImportFileName('')
    setImportRows([])
    setImportError(null)
    setImportResult(null)
    if (importInputRef.current) {
      importInputRef.current.value = ''
    }
  }

  function closeImportModal() {
    if (isImporting) return
    setIsImportOpen(false)
    setImportRows([])
    setImportError(null)
    setImportResult(null)
  }

  function updateField<K extends keyof CourseFormData>(key: K, value: CourseFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function toggleTag(tagId: number) {
    setFormData((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId) ? prev.tag_ids.filter((id) => id !== tagId) : [...prev.tag_ids, tagId],
    }))
  }

  async function handleSave() {
    if (!formData.title.trim()) {
      setFormError('Tên khóa học là bắt buộc.')
      return
    }

    if (formData.course_url && !/^https?:\/\//i.test(formData.course_url)) {
      setFormError('URL khóa học phải bắt đầu bằng http:// hoặc https://.')
      return
    }

    if (formData.estimated_hours !== null && formData.estimated_hours < 0) {
      setFormError('Số giờ ước tính không được âm.')
      return
    }

    setIsSaving(true)
    setFormError(null)
    try {
      if (modalMode === 'create') {
        await createCourse(formData)
      } else {
        await updateCourse(formData)
      }
      closeModal()
      loadData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Có lỗi xảy ra.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setImportFileName(file.name)
    setImportRows([])
    setImportError(null)
    setImportResult(null)

    try {
      const text = await file.text()
      const records = parseImportFileContent(text, file.name)
      if (records.length === 0) {
        setImportError('File không có dữ liệu khóa học để import.')
        return
      }

      setImportRows(records.map((record, index) => buildImportPreviewRow(record, index + 2, categories, tags)))
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Không thể đọc file import.')
    }
  }

  async function handleImportCourses() {
    const validRows = importRows.filter((row) => row.issues.length === 0)
    if (validRows.length === 0) {
      setImportError('Không có dòng hợp lệ để import.')
      return
    }

    setIsImporting(true)
    setImportError(null)
    setImportResult(null)

    let successCount = 0
    const failedRows: string[] = []

    for (const row of validRows) {
      try {
        await createCourse(row.data)
        successCount += 1
      } catch (err) {
        failedRows.push(`Dòng ${row.rowNumber}: ${err instanceof Error ? err.message : 'Import thất bại'}`)
      }
    }

    setIsImporting(false)
    setImportResult(`Đã import ${successCount}/${validRows.length} khóa học hợp lệ.`)
    if (failedRows.length > 0) {
      setImportError(failedRows.slice(0, 3).join('\n'))
    }
    loadData()
  }

  async function handleAutoTagMissingCourses() {
    if (tags.length === 0) {
      setAutoTagError('Chưa có tag nào để tự gắn. Hãy tạo tag trong trang Quản lý Danh mục trước.')
      return
    }

    const updateTargets = coursesMissingTags
      .map((course) => ({ course, tagIds: suggestTagIdsForCourse(course, tags) }))
      .filter((item) => item.tagIds.length > 0)

    if (updateTargets.length === 0) {
      setAutoTagError('Chưa tìm thấy tag đủ phù hợp cho các khóa học đang thiếu tag.')
      return
    }

    setIsAutoTagging(true)
    setAutoTagError(null)
    setAutoTagResult(null)

    let successCount = 0
    const failedCourses: string[] = []

    for (const item of updateTargets) {
      try {
        await updateCourse(getCourseUpdatePayload(item.course, item.tagIds))
        successCount += 1
      } catch (err) {
        failedCourses.push(`${item.course.title}: ${err instanceof Error ? err.message : 'Không cập nhật được'}`)
      }
    }

    setIsAutoTagging(false)
    setAutoTagResult(`Đã gắn tag cho ${successCount}/${updateTargets.length} khóa học thiếu tag.`)
    if (failedCourses.length > 0) {
      setAutoTagError(failedCourses.slice(0, 3).join('\n'))
    }
    loadData()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteCourse(deleteTarget.id)
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể xóa khóa học.')
      setDeleteTarget(null)
    }
  }

  async function handleToggleVisibility(course: CourseRecord) {
    await updateCourse({
      id: course.id,
      is_active: course.is_active === false,
    })
    loadData()
  }

  function renderAiValidationStatus(course: CourseRecord) {
    const warnings = getCourseWarnings(course)
    if (warnings.length === 0) {
      return <span className="admin-status-chip is-mint">Dữ liệu tốt</span>
    }

    return (
      <span className="admin-status-chip is-amber" title={warnings.join(', ')}>
        Cần bổ sung ({warnings.length})
      </span>
    )
  }

  return (
    <div className="admin-reveal">
      <section className="admin-mini-metrics admin-reveal" aria-label="Tổng quan dữ liệu khóa học">
        <article>
          <span>Đang mở</span>
          <strong>{courseStats.active.toLocaleString('vi-VN')}</strong>
        </article>
        <article>
          <span>Cần bổ sung AI</span>
          <strong>{courseStats.needsWork.toLocaleString('vi-VN')}</strong>
        </article>
        <article>
          <span>Có danh mục</span>
          <strong>{courseStats.categorized}/{courses.length}</strong>
        </article>
        <article>
          <span>Có tag</span>
          <strong>{courseStats.tagged}/{courses.length}</strong>
        </article>
      </section>

      <section className="admin-panel admin-reveal">
        <div className="admin-panel__head admin-panel__head--stack">
          <div className="admin-panel__headline">
            <div>
              <h2 className="admin-panel__title">Danh sách Khóa học ({filteredCourses.length})</h2>
              <p>Ẩn/mở khóa học để kiểm soát dữ liệu hiển thị mà không cần xóa vĩnh viễn.</p>
            </div>
            <div className="admin-panel__actions">
              <button
                type="button"
                className="admin-ghost-button"
                disabled={isAutoTagging || tags.length === 0 || coursesMissingTags.length === 0}
                onClick={() => void handleAutoTagMissingCourses()}
              >
                <AppFaIcon icon={appIcons.tags} /> {isAutoTagging ? 'Đang gắn tag...' : 'Gắn tag tự động'}
              </button>
              <button type="button" className="admin-ghost-button" onClick={openImportModal}>
                <AppFaIcon icon={appIcons.database} /> Import file
              </button>
              <button type="button" className="admin-primary-button" onClick={openCreateModal}>
                <AppFaIcon icon={appIcons.plus} /> Thêm khóa học
              </button>
            </div>
          </div>
          <div className="admin-filter-bar">
            <div className="admin-toolbar__search">
              <AppFaIcon icon={appIcons.search} />
              <input
                type="text"
                placeholder="Tìm tên, mã, đơn vị, mô tả..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Lọc danh mục">
              <option value="all">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} aria-label="Lọc tag">
              <option value="all">Tất cả tag</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Lọc trạng thái">
              <option value="all">Mọi trạng thái</option>
              <option value="active">Đang mở</option>
              <option value="hidden">Đã ẩn</option>
            </select>
            <select value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value as QualityFilter)} aria-label="Lọc chất lượng AI">
              <option value="all">Mọi chất lượng</option>
              <option value="good">Dữ liệu tốt</option>
              <option value="needs-work">Cần bổ sung</option>
            </select>
          </div>
        </div>

        {autoTagResult && <div className="admin-form-success">{autoTagResult}</div>}
        {autoTagError && <div className="admin-form-error" style={{ whiteSpace: 'pre-line' }}>{autoTagError}</div>}

        {isLoading ? (
          <div className="admin-empty-state">Đang tải dữ liệu khóa học...</div>
        ) : error ? (
          <div className="admin-empty-state is-error">{error}</div>
        ) : (
          <>
            {filteredCourses.length > 0 ? (
              <p className="admin-table-meta">
                Hiển thị <strong>{renderedCourses.length}</strong>/{filteredCourses.length} khóa học.
              </p>
            ) : null}
            <div className="admin-course-table-shell">
              <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Tên khóa học</th>
                  <th>Phân loại</th>
                  <th>Tags</th>
                  <th>Metadata AI</th>
                  <th>Chi tiết</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {renderedCourses.map((course) => {
                  const warnings = getCourseWarnings(course)
                  return (
                    <tr key={course.id}>
                      <td>
                        <strong>{course.title}</strong>
                        <div className="admin-table-muted">{course.course_code || 'Chưa có mã'} · {course.provider || 'Chưa có đơn vị'}</div>
                      </td>
                      <td>
                        <span className="admin-pill admin-pill--category">{course.category?.name || 'Chưa phân loại'}</span>
                      </td>
                      <td>
                        {course.tags && course.tags.length > 0 ? (
                          <div className="admin-tag-list">
                            {course.tags.slice(0, 3).map((tag) => (
                              <span key={tag.id} className="admin-pill admin-pill--tag">{tag.name}</span>
                            ))}
                            {course.tags.length > 3 && <span className="admin-table-muted">+{course.tags.length - 3}</span>}
                          </div>
                        ) : (
                          <span className="admin-table-warning">Chưa gán tag</span>
                        )}
                      </td>
                      <td>
                        {renderAiValidationStatus(course)}
                        {warnings.length > 0 ? <div className="admin-table-muted">{warnings.slice(0, 2).join(', ')}</div> : null}
                      </td>
                      <td>
                        <div className="admin-table-muted">
                          {getDifficultyLabel(course.difficulty_level)} · {course.estimated_hours ? `${course.estimated_hours} giờ` : 'Chưa có giờ'} · {getPriceTypeLabel(course.price_type)}
                        </div>
                      </td>
                      <td>
                        <span className={`admin-status-pill ${course.is_active !== false ? 'is-positive' : 'is-negative'}`}>
                          {course.is_active !== false ? 'Đang mở' : 'Đã ẩn'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" aria-label="Sửa" onClick={() => openEditModal(course)}>
                            <AppFaIcon icon={appIcons.edit} />
                          </button>
                          <button type="button" aria-label={course.is_active === false ? 'Mở khóa học' : 'Ẩn khóa học'} onClick={() => void handleToggleVisibility(course)}>
                            <AppFaIcon icon={appIcons.check} />
                          </button>
                          <button type="button" aria-label="Xóa" onClick={() => setDeleteTarget(course)}>
                            <AppFaIcon icon={appIcons.delete} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredCourses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="admin-empty-state">
                      {searchQuery || categoryFilter !== 'all' || tagFilter !== 'all' || statusFilter !== 'all' || qualityFilter !== 'all'
                        ? 'Không tìm thấy khóa học phù hợp với bộ lọc.'
                        : 'Chưa có dữ liệu khóa học nào.'}
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
            {hiddenCourseCount > 0 ? (
              <div className="admin-load-more">
                <button
                  type="button"
                  onClick={() => setCourseRenderLimit((current) => current + ADMIN_COURSE_RENDER_BATCH_SIZE)}
                >
                  Xem thêm {Math.min(ADMIN_COURSE_RENDER_BATCH_SIZE, hiddenCourseCount)} khóa học
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {isImportOpen && (
        <div className="admin-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeImportModal() }}>
          <div className="admin-modal admin-modal--wide">
            <div className="admin-modal__header">
              <h2>Import file khóa học</h2>
              <button type="button" className="admin-modal__close" onClick={closeImportModal}>×</button>
            </div>
            <div className="admin-modal__body">
              <div className="admin-import-dropzone">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  onChange={(event) => void handleImportFile(event)}
                />
                <div>
                  <strong>{importFileName || 'Chọn file CSV hoặc JSON'}</strong>
                  <p>Hỗ trợ các cột: title, course_code, provider, course_url, category, tags, difficulty_level, estimated_hours, price_type, certificate_type, search_document.</p>
                </div>
              </div>

              {importError && <div className="admin-form-error" style={{ whiteSpace: 'pre-line' }}>{importError}</div>}
              {importResult && <div className="admin-form-success">{importResult}</div>}

              {importRows.length > 0 && (
                <div className="admin-import-summary">
                  <article>
                    <span>Tổng dòng</span>
                    <strong>{importRows.length}</strong>
                  </article>
                  <article>
                    <span>Hợp lệ</span>
                    <strong>{importRows.filter((row) => row.issues.length === 0).length}</strong>
                  </article>
                  <article>
                    <span>Cần kiểm tra</span>
                    <strong>{importRows.filter((row) => row.issues.length > 0).length}</strong>
                  </article>
                </div>
              )}

              {importRows.length > 0 && (
                <div className="admin-import-preview">
                  {importRows.slice(0, 8).map((row) => (
                    <article key={`${row.rowNumber}-${row.data.title || 'empty'}`} className={row.issues.length > 0 ? 'has-issues' : ''}>
                      <div>
                        <strong>{row.data.title || `Dòng ${row.rowNumber}`}</strong>
                        <span>{row.data.course_code || 'Chưa có mã'} · {row.data.provider || 'Chưa có đơn vị'}</span>
                      </div>
                      <small>{row.issues.length > 0 ? row.issues.join(', ') : 'Sẵn sàng import'}</small>
                    </article>
                  ))}
                  {importRows.length > 8 && <p className="admin-table-muted">Đang hiển thị 8 dòng đầu tiên trong tổng {importRows.length} dòng.</p>}
                </div>
              )}

              <div className="admin-modal__footer">
                <button type="button" className="admin-ghost-button" onClick={closeImportModal}>Hủy</button>
                <button
                  type="button"
                  className="admin-primary-button"
                  disabled={isImporting || importRows.filter((row) => row.issues.length === 0).length === 0}
                  onClick={() => void handleImportCourses()}
                >
                  {isImporting ? 'Đang import...' : 'Import khóa học'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalMode !== 'closed' && (
        <div className="admin-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal() }}>
          <div className="admin-modal admin-modal--wide">
            <div className="admin-modal__header">
              <h2>{modalMode === 'create' ? 'Thêm khóa học mới' : 'Chỉnh sửa khóa học'}</h2>
              <button type="button" className="admin-modal__close" onClick={closeModal}>×</button>
            </div>
            <div className="admin-modal__body">
              {formError && <div className="admin-form-error">{formError}</div>}

              <label>
                <span>Tên khóa học *</span>
                <input type="text" value={formData.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Ví dụ: Lập trình Web Fullstack" />
              </label>

              <div className="admin-modal__row admin-modal__row--two">
                <label>
                  <span>Mã môn học</span>
                  <input type="text" value={formData.course_code} onChange={(event) => updateField('course_code', event.target.value)} placeholder="IT4172" />
                </label>
                <label>
                  <span>Đơn vị cung cấp</span>
                  <input type="text" value={formData.provider} onChange={(event) => updateField('provider', event.target.value)} placeholder="HUST / SoICT" />
                </label>
              </div>

              <label>
                <span>URL khóa học</span>
                <input type="url" value={formData.course_url} onChange={(event) => updateField('course_url', event.target.value)} placeholder="https://..." />
              </label>

              <div className="admin-modal__row admin-modal__row--three">
                <label>
                  <span>Danh mục</span>
                  <select value={formData.category_id ?? ''} onChange={(event) => updateField('category_id', event.target.value ? Number(event.target.value) : null)}>
                    <option value="">Chưa phân loại</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Mức độ khó</span>
                  <select value={formData.difficulty_level} onChange={(event) => updateField('difficulty_level', event.target.value)}>
                    <option value="">Chưa xác định</option>
                    <option value="beginner">Cơ bản</option>
                    <option value="intermediate">Trung cấp</option>
                    <option value="advanced">Nâng cao</option>
                  </select>
                </label>
                <label>
                  <span>Số giờ ước tính</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.estimated_hours ?? ''}
                    onChange={(event) => updateField('estimated_hours', event.target.value ? Number(event.target.value) : null)}
                    placeholder="12"
                  />
                </label>
              </div>

              <div className="admin-modal__row admin-modal__row--three">
                <label>
                  <span>Loại giá</span>
                  <select value={formData.price_type} onChange={(event) => updateField('price_type', event.target.value)}>
                    <option value="free">Miễn phí</option>
                    <option value="paid">Trả phí</option>
                    <option value="freemium">Freemium</option>
                  </select>
                </label>
                <label>
                  <span>Loại chứng chỉ</span>
                  <input type="text" value={formData.certificate_type} onChange={(event) => updateField('certificate_type', event.target.value)} placeholder="Certificate / Completion / None" />
                </label>
                <div className="admin-checkbox-field">
                  <span>Trạng thái</span>
                  <label>
                    <input type="checkbox" checked={formData.is_active} onChange={(event) => updateField('is_active', event.target.checked)} />
                    <span>Đang mở</span>
                  </label>
                </div>
              </div>

              <label>
                <span>Mô tả cho tìm kiếm và AI</span>
                <textarea rows={4} value={formData.search_document} onChange={(event) => updateField('search_document', event.target.value)} placeholder="Mô tả nội dung, kỹ năng, đầu ra học tập và đối tượng phù hợp..." />
              </label>

              <div className="admin-modal__row admin-modal__row--two">
                <label>
                  <span>Tiêu đề chuẩn hóa</span>
                  <input type="text" value={formData.normalized_title} onChange={(event) => updateField('normalized_title', event.target.value)} placeholder="lap trinh web fullstack" />
                </label>
                <label>
                  <span>Token đã xử lý</span>
                  <input type="text" value={formData.tokenized_text} onChange={(event) => updateField('tokenized_text', event.target.value)} placeholder="web fullstack react node..." />
                </label>
              </div>

              <div className="admin-tag-selector">
                <span className="admin-tag-selector__label">Tags / AI keywords</span>
                <div className="admin-tag-selector__options">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`admin-tag-selector__chip${formData.tag_ids.includes(tag.id) ? ' is-selected' : ''}`}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </button>
                  ))}
                  {tags.length === 0 && <span className="admin-table-muted">Chưa có tag nào. Hãy tạo tag trong trang Quản lý Danh mục.</span>}
                </div>
              </div>

              <div className="admin-modal__footer">
                <button type="button" className="admin-ghost-button" onClick={closeModal}>Hủy</button>
                <button type="button" className="admin-primary-button" disabled={isSaving || isLoadingCourseDetail} onClick={() => void handleSave()}>
                  {isSaving ? 'Đang lưu...' : modalMode === 'create' ? 'Tạo khóa học' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="admin-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null) }}>
          <div className="admin-modal admin-modal--small">
            <div className="admin-modal__header">
              <h2>Xác nhận xóa</h2>
              <button type="button" className="admin-modal__close" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <div className="admin-modal__body">
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                Bạn sắp xóa vĩnh viễn khóa học <strong>"{deleteTarget.title}"</strong>. Nếu chỉ muốn gỡ khỏi hệ thống gợi ý, hãy dùng nút ẩn khóa học ở bảng.
              </p>
              <div className="admin-modal__footer">
                <button type="button" className="admin-ghost-button" onClick={() => setDeleteTarget(null)}>Hủy</button>
                <button type="button" className="admin-primary-button" style={{ background: '#dc2626' }} onClick={() => void handleDelete()}>
                  Xóa vĩnh viễn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
