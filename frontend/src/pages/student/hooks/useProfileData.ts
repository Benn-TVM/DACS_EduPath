import { useEffect, useState } from 'react'
import { getAuthUser, type AuthUser } from '../../../services/api'
import type { CourseRecord, OnboardingProfile, SavedCourseRecord } from '../student-core'
import {
  fetchCurrentUserWithProfile,
  fetchOptionalOnboardingProfile,
  fetchOptionalRecommendations,
  fetchOptionalSavedCourses,
} from '../services/student-api'

export function useProfileData() {
  const [user, setUser] = useState<AuthUser | null>(getAuthUser())
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)
  const [savedCourses, setSavedCourses] = useState<SavedCourseRecord[]>([])
  const [recommendations, setRecommendations] = useState<CourseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    async function loadProfileData() {
      setLoading(true)
      setErrorText('')

      try {
        const [meResponse, onboardingProfile, savedCoursesResponse, recommendationsResponse] = await Promise.all([
          fetchCurrentUserWithProfile(),
          fetchOptionalOnboardingProfile(),
          fetchOptionalSavedCourses(),
          fetchOptionalRecommendations(),
        ])

        setUser(meResponse)
        setProfile(onboardingProfile ?? meResponse.profile ?? null)
        setSavedCourses(savedCoursesResponse)
        setRecommendations(recommendationsResponse)
      } catch {
        setErrorText('Không thể tải dữ liệu hồ sơ cá nhân.')
      } finally {
        setLoading(false)
      }
    }

    void loadProfileData()
  }, [])

  return {
    user,
    profile,
    savedCourses,
    recommendations,
    loading,
    errorText,
  }
}
