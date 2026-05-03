import { useEffect, useState } from 'react'
import type { SearchHistoryRecord } from '../student-core'
import {
  clearSearchHistoryItems,
  deleteSearchHistoryItem,
  fetchSearchHistory,
} from '../services/student-api'

export function useSearchHistory() {
  const [historyItems, setHistoryItems] = useState<SearchHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    async function loadSearchHistory() {
      setLoading(true)
      setErrorText('')

      try {
        const nextHistory = await fetchSearchHistory()
        setHistoryItems(nextHistory)
      } catch {
        setErrorText('Không thể tải lịch sử tìm kiếm. Vui lòng đăng nhập lại hoặc thử lại sau.')
      } finally {
        setLoading(false)
      }
    }

    void loadSearchHistory()
  }, [])

  async function removeHistoryItem(historyId: number) {
    try {
      await deleteSearchHistoryItem(historyId)
      setHistoryItems((current) => current.filter((item) => item.id !== historyId))
      setErrorText('')
      return true
    } catch {
      setErrorText('Không thể xóa mục lịch sử này.')
      return false
    }
  }

  async function clearHistoryItems() {
    if (!historyItems.length || isClearing) {
      return false
    }

    setIsClearing(true)
    setErrorText('')

    try {
      await clearSearchHistoryItems()
      setHistoryItems([])
      return true
    } catch {
      setErrorText('Không thể xóa toàn bộ lịch sử tìm kiếm.')
      return false
    } finally {
      setIsClearing(false)
    }
  }

  return {
    historyItems,
    loading,
    isClearing,
    errorText,
    removeHistoryItem,
    clearHistoryItems,
  }
}
