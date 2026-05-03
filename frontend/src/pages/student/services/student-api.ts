import api, {
  saveAuthTokens,
  saveAuthUser,
  type AuthTokens,
  type AuthUser,
} from '../../../services/api'
import type {
  CourseQueryResponse,
  CourseRecord,
  OnboardingProfile,
  SavedCourseRecord,
  SavedCourseResponse,
  SearchHistoryResponse,
} from '../student-core'

export interface LoginRequest {
  username: string
  password: string
}

interface LoginResponse extends Partial<AuthTokens> {
  user?: AuthUser
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
}

interface RegisterResponse {
  tokens?: Partial<AuthTokens>
  user?: AuthUser
}

export interface OnboardingRequest {
  skill_level: string
  learning_goal: string
  interests: string
  learning_needs: string
}

export type CurrentUserWithProfile = AuthUser & { profile?: OnboardingProfile | null }

export async function loginStudent(request: LoginRequest) {
  const response = await api.post<LoginResponse>('auth/login/', request)

  if (response.data.access && response.data.refresh) {
    saveAuthTokens({
      access: response.data.access,
      refresh: response.data.refresh,
    })
  }

  if (response.data.user) {
    saveAuthUser(response.data.user)
  }

  return response.data
}

export async function registerStudent(request: RegisterRequest) {
  const response = await api.post<RegisterResponse>('auth/register/', request)

  if (response.data.tokens?.access && response.data.tokens?.refresh) {
    saveAuthTokens({
      access: response.data.tokens.access,
      refresh: response.data.tokens.refresh,
    })
  }

  if (response.data.user) {
    saveAuthUser(response.data.user)
  }

  return response.data
}

export async function submitOnboardingProfile(request: OnboardingRequest) {
  await api.put('auth/onboarding/', request)
}

export async function fetchCatalogCourses() {
  const response = await api.get<CourseRecord[]>('courses/')
  return response.data ?? []
}

export async function fetchSearchResults(queryText: string, topK = 24) {
  if (!queryText.trim()) {
    return [] as CourseRecord[]
  }

  const response = await api.get<CourseQueryResponse>('search/', {
    params: {
      q: queryText,
      top_k: topK,
    },
  })

  return response.data.results ?? []
}

export async function fetchRecommendations() {
  const response = await api.get<CourseQueryResponse>('recommendations/')
  return response.data.results ?? []
}

export async function fetchOptionalRecommendations() {
  try {
    return await fetchRecommendations()
  } catch {
    return [] as CourseRecord[]
  }
}

export async function fetchSavedCourses() {
  const response = await api.get<SavedCourseResponse>('saved-courses/')
  return response.data.results ?? []
}

export async function fetchOptionalSavedCourses() {
  try {
    return await fetchSavedCourses()
  } catch {
    return [] as SavedCourseRecord[]
  }
}

export async function saveCourse(courseId: number) {
  await api.post('saved-courses/', { course_id: courseId })
}

export async function removeSavedCourse(courseId: number) {
  await api.delete(`saved-courses/${courseId}/`)
}

export async function fetchSearchHistory() {
  const response = await api.get<SearchHistoryResponse>('search/history/')
  return response.data.results ?? []
}

export async function deleteSearchHistoryItem(historyId: number) {
  await api.delete(`search/history/${historyId}/`)
}

export async function clearSearchHistoryItems() {
  await api.delete('search/history/')
}

export async function fetchCourseDetail(courseId: number | string) {
  const response = await api.get<CourseRecord>(`courses/${courseId}/`)
  return response.data
}

export async function fetchCurrentUser() {
  const response = await api.get<AuthUser>('auth/me/')
  saveAuthUser(response.data)
  return response.data
}

export async function fetchCurrentUserWithProfile() {
  const response = await api.get<CurrentUserWithProfile>('auth/me/')
  saveAuthUser(response.data)
  return response.data
}

export async function fetchOnboardingProfile() {
  const response = await api.get<OnboardingProfile>('auth/onboarding/')
  return response.data
}

export async function fetchOptionalOnboardingProfile() {
  try {
    return await fetchOnboardingProfile()
  } catch {
    return null
  }
}

export function extractSavedCourseIds(savedCourses: SavedCourseRecord[]) {
  return savedCourses.map((item) => item.course.id)
}
