import type { IconDefinition } from \'@fortawesome/fontawesome-svg-core\'

export interface AppNavItem {
  id: string
  label: string
  path: string
  icon: IconDefinition
}

export interface CourseRecord {
  id: number
  title: string
  course_code: string | null
  provider: string
  course_url: string
  normalized_title: string
  search_document: string
  tokenized_text: string
  difficulty_level?: string
  estimated_hours?: number | null
  price_type?: string
  certificate_type?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
  category?: {
    id: number
    name: string
    slug: string
    description?: string
  } | null
  tags?: Array<{
    id: number
    name: string
    slug: string
    description?: string
  }>
  score?: number
  matched_terms?: string[]
}

export interface SavedCourseRecord {
  id: number
  course: CourseRecord
  saved_at: string
}

export interface SavedCourseResponse {
  count: number
  results: SavedCourseRecord[]
}

export interface SearchHistoryRecord {
  id: number
  query_text: string
  created_at: string
}

export interface SearchHistoryResponse {
  count: number
  results: SearchHistoryRecord[]
}

export interface OnboardingProfile {
  skill_level: string
  learning_goal: string
  interests: string
  learning_needs: string
  onboarding_completed: boolean
}

export interface CourseQueryResponse {
  count?: number
  query_text?: string
  results: CourseRecord[]
}
