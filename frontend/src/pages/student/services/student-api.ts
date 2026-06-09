import api, {
  getAuthUser,
  saveAuthTokens,
  saveAuthUser,
  type AuthTokens,
  type AuthUser,
} from '../../../services/api'
import type {
  CourseCategory,
  CourseQueryResponse,
  CourseRecord,
  OnboardingProfile,
  SavedCourseRecord,
  SavedCourseResponse,
  SearchHistoryResponse,
} from '../student-core'

const CATALOG_PAGE_CACHE_TTL_MS = 5 * 60 * 1000
const RECOMMENDATION_CACHE_TTL_MS = 60 * 1000

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

export interface CatalogCoursePage {
  count: number
  next_offset: number | null
  results: CourseRecord[]
}

interface CacheEntry<T> {
  expiresAt: number
  value: T
}

const catalogPageCache = new Map<string, CacheEntry<CatalogCoursePage>>()
const catalogPageRequests = new Map<string, Promise<CatalogCoursePage>>()
let categoryCache: CacheEntry<CourseCategory[]> | null = null
const recommendationsCache = new Map<string, CacheEntry<CourseRecord[]>>()
const recommendationsRequests = new Map<string, Promise<CourseRecord[]>>()

function recommendationCacheKey(topK: number) {
  const userId = getAuthUser()?.id ?? 'anonymous'
  return `${userId}:${topK}`
}

export function clearStudentApiCaches() {
  recommendationsCache.clear()
  recommendationsRequests.clear()
}

export async function loginStudent(request: LoginRequest) {
  clearStudentApiCaches()
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
  clearStudentApiCaches()
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
  clearStudentApiCaches()
}

export async function fetchCatalogCoursePage(limit = 240, offset = 0): Promise<CatalogCoursePage> {
  const cacheKey = `${limit}:${offset}`
  const cached = catalogPageCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const pendingRequest = catalogPageRequests.get(cacheKey)
  if (pendingRequest) {
    return pendingRequest
  }

  const request = api
    .get<CatalogCoursePage>('courses/', {
      params: {
        compact: true,
        limit,
        offset,
      },
    })
    .then((response) => {
      const value = {
        count: response.data?.count ?? 0,
        next_offset: response.data?.next_offset ?? null,
        results: response.data?.results ?? [],
      }
      catalogPageCache.set(cacheKey, {
        expiresAt: Date.now() + CATALOG_PAGE_CACHE_TTL_MS,
        value,
      })
      return value
    })
    .finally(() => {
      catalogPageRequests.delete(cacheKey)
    })

  catalogPageRequests.set(cacheKey, request)
  return request
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

export async function fetchRecommendations(topK = 10) {
  const cacheKey = recommendationCacheKey(topK)
  const cached = recommendationsCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const pendingRequest = recommendationsRequests.get(cacheKey)
  if (pendingRequest) {
    return pendingRequest
  }

  const request = api
    .get<CourseQueryResponse>('recommendations/', {
      params: {
        top_k: topK,
      },
    })
    .then((response) => {
      const value = response.data.results ?? []
      recommendationsCache.set(cacheKey, {
        expiresAt: Date.now() + RECOMMENDATION_CACHE_TTL_MS,
        value,
      })
      return value
    })
    .finally(() => {
      recommendationsRequests.delete(cacheKey)
    })

  recommendationsRequests.set(cacheKey, request)
  return request
}

export async function fetchOptionalRecommendations() {
  try {
    return await fetchRecommendations()
  } catch {
    return [] as CourseRecord[]
  }
}

export function getCachedRecommendations(topK = 10) {
  const cached = recommendationsCache.get(recommendationCacheKey(topK))
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  return [] as CourseRecord[]
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
export async function fetchCategories() {
  if (categoryCache && categoryCache.expiresAt > Date.now()) {
    return categoryCache.value
  }

  const response = await api.get<CourseCategory[]>('categories/')
  const value = response.data ?? []
  categoryCache = {
    expiresAt: Date.now() + CATALOG_PAGE_CACHE_TTL_MS,
    value,
  }
  return value
}

export function extractSavedCourseIds(savedCourses: SavedCourseRecord[]) {
  return savedCourses.map((item) => item.course.id)
}
