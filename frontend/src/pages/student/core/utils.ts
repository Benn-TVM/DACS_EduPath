import { getAuthUser } from '../../../services/api'
import type { CourseRecord, OnboardingProfile } from './types'
import { categoryKeywords, categoryImages, defaultImages, dashboardBadges } from './constants'

export function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function buildCourseHaystack(course: CourseRecord) {
  return normalizeText(
    [
      course.title,
      course.course_code ?? '',
      course.provider,
      course.search_document,
      course.tokenized_text,
      course.matched_terms?.join(' ') ?? '',
    ].join(' '),
  )
}

export function getCourseCategory(course: CourseRecord) {
  if (course.category?.name) {
    return course.category.name
  }

  const haystack = buildCourseHaystack(course)

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return category
    }
  }

  return course.provider || 'SOICT MOOC'
}

export function matchesCourseFilter(course: CourseRecord, filter: string) {
  if (filter === 'Tất cả') {
    return true
  }

  const keywords = categoryKeywords[filter]
  if (!keywords) {
    return true
  }

  const haystack = buildCourseHaystack(course)
  return keywords.some((keyword) => haystack.includes(keyword))
}

export function getCourseDescription(course: CourseRecord) {
  const baseText = course.search_document?.trim() || course.title
  if (baseText.length <= 180) {
    return baseText
  }

  return `${baseText.slice(0, 177).trim()}...`
}

export function getCourseTags(course: CourseRecord) {
  if (course.tags?.length) {
    return course.tags
      .map((tag) => tag.name.trim())
      .filter(Boolean)
      .slice(0, 6)
  }

  const tags: string[] = []

  if (course.course_code) {
    tags.push(course.course_code)
  }

  if (course.matched_terms?.length) {
    tags.push(...course.matched_terms)
  } else if (course.tokenized_text) {
    tags.push(...course.tokenized_text.split(/\s+/))
  }

  if (course.provider) {
    tags.push(course.provider)
  }

  return Array.from(new Set(tags.filter((tag) => tag && tag.length > 2))).slice(0, 3)
}

export function getCourseBadge(index: number, source: 'catalog' | 'recommendation' | 'search') {
  if (source === 'search') {
    return index === 0 ? 'Kết quả tốt nhất' : 'Kết quả tìm kiếm'
  }

  if (source === 'recommendation') {
    return dashboardBadges[index % dashboardBadges.length]
  }

  return index === 0 ? 'Từ kho dữ liệu' : 'Đang mở'
}

export function getCourseVisual(indexOrId: number, course?: CourseRecord) {
  // Nếu có thông tin khóa học → lấy ảnh theo danh mục
  if (course?.category?.name) {
    const images = categoryImages[course.category.name]
    if (images) {
      // Dùng course.id để đảm bảo cùng khóa học luôn có cùng ảnh
      return images[course.id % images.length]
    }
  }

  // Nếu có course → thử detect danh mục từ title
  if (course) {
    const title = course.title.toLowerCase()
    for (const [cat, images] of Object.entries(categoryImages)) {
      const keywords = categoryKeywords[cat]
      if (keywords?.some((kw) => title.includes(kw))) {
        return images[course.id % images.length]
      }
    }
    return defaultImages[course.id % defaultImages.length]
  }

  // Fallback: dùng index (tương thích ngược)
  return defaultImages[indexOrId % defaultImages.length]
}

export function formatCourseScore(course: CourseRecord) {
  if (typeof course.score === 'number') {
    return `${Math.min(10, Math.max(0, course.score * 10)).toFixed(1)}/10`
  }

  return course.provider
}

export function getCourseLevel(course: CourseRecord) {
  const haystack = buildCourseHaystack(course)

  if (haystack.includes('nang cao') || haystack.includes('advanced')) {
    return 'Nâng cao'
  }

  if (haystack.includes('co ban') || haystack.includes('beginner')) {
    return 'Cơ bản'
  }

  return 'Trung cấp'
}

export function getCourseDescriptionParagraphs(course: CourseRecord) {
  const source = course.search_document?.trim()
  if (!source) {
    return ['Khóa học này hiện chưa có mô tả chi tiết trong hệ thống.']
  }

  const paragraphs = source
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (paragraphs.length > 1) {
    return paragraphs.slice(0, 3)
  }

  const sentences = source
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (sentences.length > 1) {
    const chunks: string[] = []
    for (let index = 0; index < Math.min(sentences.length, 6); index += 2) {
      chunks.push(sentences.slice(index, index + 2).join(' '))
    }
    return chunks
  }

  return [source]
}

export function getLearningFocus(course: CourseRecord) {
  const tags = getCourseTags(course)

  if (tags.length >= 4) {
    return tags.slice(0, 4)
  }

  const fallback = [course.provider, course.course_code ?? '', getCourseCategory(course), getCourseLevel(course)]
    .filter(Boolean)
    .map((item) => item.trim())

  return Array.from(new Set([...tags, ...fallback])).slice(0, 4)
}

export function getDisplayName() {
  const user = getAuthUser()
  if (!user) {
    return 'bạn'
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return fullName || user.username || 'bạn'
}

export function extractFirstMessage(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : ''
  }

  return typeof value === 'string' ? value : ''
}

export function parseProfileItems(value: string) {
  return value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getHistoryTags(queryText: string) {
  return Array.from(
    new Set(
      queryText
        .split(/[\s,/-]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 2),
    ),
  ).slice(0, 3)
}

export function getSkillLevelLabel(level: string) {
  const mapping: Record<string, string> = {
    beginner: 'Mới bắt đầu',
    intermediate: 'Trung cấp',
    advanced: 'Nâng cao',
  }

  return mapping[level] ?? 'Đang cập nhật'
}

export function getProfileCompletion(profile: OnboardingProfile | null) {
  if (!profile) {
    return 0
  }

  const fields = [profile.skill_level, profile.learning_goal, profile.interests, profile.learning_needs]
  const filled = fields.filter((item) => item && item.trim()).length
  const percent = Math.round((filled / fields.length) * 100)

  return profile.onboarding_completed ? Math.max(percent, 100) : percent
}
