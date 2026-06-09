import api from '../../../services/api'
import type { CourseRecord } from '../../student/student-core'

export interface AdminStatsResponse {
  total_courses: number
  total_users: number
  total_searches: number
  total_saved: number
}

export interface AdminUserRow {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_superuser: boolean
  is_active: boolean
  date_joined: string
  last_login: string | null
}

export interface AdminCategoryRow {
  id: number
  name: string
  slug: string
  description: string
  parent: number | null
  parent_name: string | null
  course_count: number
  tag_count: number
}

export interface AdminTagRow {
  id: number
  name: string
  slug: string
  description: string
  course_count: number
}

export interface CourseFormData {
  id?: number
  title: string
  course_code: string
  provider: string
  course_url: string
  normalized_title: string
  search_document: string
  tokenized_text: string
  difficulty_level: string
  estimated_hours: number | null
  price_type: string
  certificate_type: string
  category_id: number | null
  tag_ids: number[]
  is_active: boolean
}

export type CourseUpdateData = Partial<CourseFormData> & { id?: number }

export interface TaxonomyFormData {
  id?: number
  name: string
  description: string
  parent_id?: number | null
}

export const taxonomyUnavailableMessage =
  'Danh mục và tag chưa sẵn sàng trong cơ sở dữ liệu. Trang vẫn mở được, nhưng các chức năng taxonomy sẽ tạm thời bị giới hạn.'

function unwrapError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: unknown } }).response
    const data = response?.data
    if (typeof data === 'object' && data !== null && 'detail' in data) {
      const detail = (data as { detail?: unknown }).detail
      if (typeof detail === 'string' && detail.trim()) {
        return detail
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export async function fetchAdminCourses() {
  try {
    const response = await api.get<CourseRecord[]>('admin/courses/', {
      params: {
        compact: true,
      },
    })
    return response.data ?? []
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể tải danh sách khóa học.'))
  }
}

export async function fetchAdminCourse(courseId: number) {
  try {
    const response = await api.get<CourseRecord>('admin/courses/', {
      params: {
        id: courseId,
      },
    })
    return response.data
  } catch (error) {
    throw new Error(unwrapError(error, 'KhÃ´ng thá»ƒ táº£i chi tiáº¿t khÃ³a há»c.'))
  }
}

export async function fetchAdminStats() {
  try {
    const response = await api.get<AdminStatsResponse>('admin/stats/')
    return response.data
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể tải thống kê quản trị.'))
  }
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  try {
    const response = await api.get<AdminUserRow[]>('admin/users/')
    return response.data ?? []
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể tải danh sách người dùng.'))
  }
}

export async function fetchAdminCategories(): Promise<AdminCategoryRow[]> {
  try {
    const response = await api.get<AdminCategoryRow[]>('admin/categories/')
    return response.data ?? []
  } catch (error) {
    throw new Error(unwrapError(error, taxonomyUnavailableMessage))
  }
}

export async function fetchAdminTags(): Promise<AdminTagRow[]> {
  try {
    const response = await api.get<AdminTagRow[]>('admin/tags/')
    return response.data ?? []
  } catch (error) {
    throw new Error(unwrapError(error, taxonomyUnavailableMessage))
  }
}

export async function createCourse(data: CourseFormData) {
  try {
    const response = await api.post<{ detail: string; course: CourseRecord }>('admin/courses/', data)
    return response.data
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể tạo khóa học.'))
  }
}

export async function updateCourse(data: CourseUpdateData) {
  try {
    const payload = { ...data }
    if (!payload.normalized_title?.trim()) {
      delete payload.normalized_title
    }
    if (!payload.search_document?.trim()) {
      delete payload.search_document
    }
    if (!payload.tokenized_text?.trim()) {
      delete payload.tokenized_text
    }

    const response = await api.put<{ detail: string; course: CourseRecord }>('admin/courses/', payload)
    return response.data
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể cập nhật khóa học.'))
  }
}

export async function deleteCourse(courseId: number) {
  try {
    const response = await api.delete<{ detail: string }>(`admin/courses/?id=${courseId}`)
    return response.data
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể xóa khóa học.'))
  }
}

export async function createCategory(data: TaxonomyFormData) {
  try {
    const response = await api.post<{ detail: string; category: AdminCategoryRow }>('admin/categories/', data)
    return response.data
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể tạo danh mục.'))
  }
}

export async function updateCategory(data: TaxonomyFormData) {
  try {
    const response = await api.put<{ detail: string; category: AdminCategoryRow }>('admin/categories/', data)
    return response.data
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể cập nhật danh mục.'))
  }
}

export async function deleteCategory(categoryId: number) {
  try {
    const response = await api.delete<{ detail: string }>(`admin/categories/?id=${categoryId}`)
    return response.data
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể xóa danh mục.'))
  }
}

export async function createTag(data: TaxonomyFormData) {
  try {
    const response = await api.post<{ detail: string; tag: AdminTagRow }>('admin/tags/', data)
    return response.data
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể tạo tag.'))
  }
}

export async function updateTag(data: TaxonomyFormData) {
  try {
    const response = await api.put<{ detail: string; tag: AdminTagRow }>('admin/tags/', data)
    return response.data
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể cập nhật tag.'))
  }
}

export async function deleteTag(tagId: number) {
  try {
    const response = await api.delete<{ detail: string }>(`admin/tags/?id=${tagId}`)
    return response.data
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể xóa tag.'))
  }
}

export interface RecommendationLogRow {
  id: number
  user: string
  user_id: number
  context: string
  query_text: string
  recommended_courses: string[]
  recommended_course_ids: number[]
  score_avg: number | null
  result_count: number
  created_at: string
}

export async function fetchRecommendationLogs(): Promise<RecommendationLogRow[]> {
  try {
    const response = await api.get<RecommendationLogRow[]>('admin/recommendation-logs/')
    return response.data ?? []
  } catch (error) {
    throw new Error(unwrapError(error, 'Không thể tải nhật ký gợi ý.'))
  }
}
