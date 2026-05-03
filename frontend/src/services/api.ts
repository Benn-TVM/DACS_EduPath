import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/'
const AUTH_STORAGE_KEY = 'edupath_auth'
const AUTH_USER_KEY = 'edupath_user'

const baseConfig = {
  baseURL: API_BASE_URL,
  timeout: 60000, // Tăng lên 60s để AI có đủ thời gian xử lý
  headers: {
    'Content-Type': 'application/json',
  },
}

const api = axios.create(baseConfig)
const authClient = axios.create(baseConfig)

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthProfile {
  skill_level?: string
  learning_goal?: string
  interests?: string
  learning_needs?: string
  onboarding_completed?: boolean
}

export interface AuthUser {
  id: number
  username: string
  email: string
  first_name?: string
  last_name?: string
  is_staff?: boolean
  is_superuser?: boolean
  profile?: AuthProfile | null
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

function parseStorageValue<T>(storageKey: string): T | null {
  const rawValue = localStorage.getItem(storageKey)
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    localStorage.removeItem(storageKey)
    return null
  }
}

export function saveAuthTokens(tokens: AuthTokens) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens))
}

export function getAuthTokens(): AuthTokens | null {
  return parseStorageValue<AuthTokens>(AUTH_STORAGE_KEY)
}

export function clearAuthTokens() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export function saveAuthUser(user: AuthUser) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function getAuthUser(): AuthUser | null {
  return parseStorageValue<AuthUser>(AUTH_USER_KEY)
}

export function isAdminUser(user: AuthUser | null | undefined) {
  return Boolean(user?.is_staff || user?.is_superuser)
}

export function hasAuthSession() {
  const tokens = getAuthTokens()
  return Boolean(tokens?.access || tokens?.refresh)
}

function redirectToLogin() {
  if (typeof window === 'undefined') {
    return
  }

  const currentPath = `${window.location.pathname}${window.location.search}`
  if (currentPath.startsWith('/login') || currentPath.startsWith('/register')) {
    return
  }

  const nextPath = currentPath === '/' ? '/dashboard' : currentPath
  window.location.assign(`/login?next=${encodeURIComponent(nextPath)}`)
}

let refreshPromise: Promise<AuthTokens | null> | null = null

async function refreshAuthTokens() {
  const tokens = getAuthTokens()
  if (!tokens?.refresh) {
    return null
  }

  const response = await authClient.post<Partial<AuthTokens>>('auth/refresh/', {
    refresh: tokens.refresh,
  })

  if (!response.data.access) {
    throw new Error('Không nhận được access token mới từ máy chủ.')
  }

  const nextTokens: AuthTokens = {
    access: response.data.access,
    refresh: response.data.refresh ?? tokens.refresh,
  }

  saveAuthTokens(nextTokens)
  return nextTokens
}

api.interceptors.request.use((config) => {
  const tokens = getAuthTokens()
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined
    const requestUrl = originalRequest?.url ?? ''
    const isAuthRequest =
      requestUrl.includes('auth/login') ||
      requestUrl.includes('auth/register') ||
      requestUrl.includes('auth/refresh')

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthRequest
    ) {
      return Promise.reject(error)
    }

    const tokens = getAuthTokens()
    if (!tokens?.refresh) {
      clearAuthTokens()
      redirectToLogin()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      refreshPromise ??= refreshAuthTokens().finally(() => {
        refreshPromise = null
      })

      const nextTokens = await refreshPromise
      if (!nextTokens?.access) {
        throw new Error('Phiên đăng nhập không còn hợp lệ.')
      }

      originalRequest.headers.Authorization = `Bearer ${nextTokens.access}`
      return api(originalRequest)
    } catch {
      clearAuthTokens()
      redirectToLogin()
      return Promise.reject(error)
    }
  },
)

export default api
