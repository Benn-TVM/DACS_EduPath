import { useEffect, useState } from 'react'
import { getAuthUser, type AuthUser } from '../../../services/api'
import type { OnboardingProfile, SavedCourseRecord } from '../student-core'
import {
  fetchCurrentUserWithProfile,
  fetchOptionalOnboardingProfile,
  fetchOptionalSavedCourses,
} from '../services/student-api'

export function useProfileData() {
  const [user, setUser] = useState<AuthUser | null>(getAuthUser())
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)
  const [savedCourses, setSavedCourses] = useState<SavedCourseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  const loadProfileData = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const [meResponse, onboardingProfile, savedCoursesResponse] = await Promise.all([
        fetchCurrentUserWithProfile(),
        fetchOptionalOnboardingProfile(),
        fetchOptionalSavedCourses(),
      ])

      setUser(meResponse)
      setProfile(onboardingProfile ?? meResponse.profile ?? null)
      setSavedCourses(savedCoursesResponse)
    } catch {
      setErrorText('Không thể tải dữ liệu hồ sơ cá nhân.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProfileData()
  }, [])

  return {
    user,
    profile,
    savedCourses,
    loading,
    errorText,
    fetchProfile: loadProfileData,
  }
}
