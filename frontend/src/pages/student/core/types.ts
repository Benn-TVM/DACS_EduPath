import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

export interface AppNavItem {
  id: string
  label: string
  path: string
  icon: IconDefinition
}

export interface CourseCategory {
  id: number
  name: string
  slug: string
  description?: string
  parent?: number | null
  parent_name?: string | null
  children?: CourseCategory[]
}

export interface CourseRecord {
  id: number
  title: string
  course_code: string | null
  provider: string
  course_url: string
  normalized_title?: string
  search_document?: string
  search_document_length?: number
  tokenized_text?: string
  difficulty_level?: string
  estimated_hours?: number | null
  price_type?: string
  certificate_type?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
  category?: CourseCategory | null
  tags?: Array<{
    id: number
    name: string
    slug: string
    description?: string
  }>
  tag_ids?: number[]
  score?: number
  baseline_score?: number
  ml_score?: number | null
  ranker?: string
  matched_terms?: string[]
  explanation?: string
  score_breakdown?: Record<string, number>
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
  avatar?: string
}

export interface CourseQueryResponse {
  count?: number
  query_text?: string
  results: CourseRecord[]
}
