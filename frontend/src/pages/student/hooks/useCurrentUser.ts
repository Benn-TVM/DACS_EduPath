import { useEffect, useMemo, useState } from 'react'
import { getAuthUser, type AuthUser } from '../../../services/api'
import { fetchCurrentUser } from '../services/student-api'

export function useCurrentUser({
  silent = false,
}: {
  silent?: boolean
} = {}) {
  const [user, setUser] = useState<AuthUser | null>(getAuthUser())
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const nextUser = await fetchCurrentUser()
        setUser(nextUser)
        setErrorText('')
      } catch {
        if (!silent) {
          setErrorText('Không thể tải dữ liệu người dùng hiện tại.')
        }
      }
    }

    void loadCurrentUser()
  }, [silent])

  const displayName = useMemo(() => {
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
    return fullName || user?.username || 'Người học EduPath'
  }, [user])

  return {
    user,
    displayName,
    errorText,
  }
}
