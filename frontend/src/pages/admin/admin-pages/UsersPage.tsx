import { useEffect, useMemo, useState } from 'react'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { AdminPageHeader } from '../admin-layout'
import { fetchAdminUsers, type AdminUserRow } from '../services/admin-api'

function getUserRole(user: AdminUserRow) {
  if (user.is_superuser) {
    return 'Quản trị viên'
  }
  if (user.is_staff) {
    return 'Nhân viên'
  }
  return 'Học viên'
}

function getUserStatus(user: AdminUserRow) {
  return user.is_active ? 'Hoạt động' : 'Tạm khóa'
}

function formatDate(dateValue: string | null) {
  if (!dateValue) {
    return 'Chưa đăng nhập'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateValue))
}

export function UsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('Tất cả vai trò')
  const [isLoading, setIsLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    async function loadUsers() {
      setIsLoading(true)
      setErrorText('')
      try {
        setUsers(await fetchAdminUsers())
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : 'Không thể tải danh sách người dùng.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadUsers()
  }, [])

  const roles = useMemo(() => ['Tất cả vai trò', ...Array.from(new Set(users.map(getUserRole)))], [users])

  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return users.filter((user) => {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
      const matchesQuery = !normalizedQuery || [fullName, user.username, user.email].join(' ').toLowerCase().includes(normalizedQuery)
      const matchesRole = roleFilter === 'Tất cả vai trò' || getUserRole(user) === roleFilter
      return matchesQuery && matchesRole
    })
  }, [query, roleFilter, users])

  return (
    <>
      <AdminPageHeader
        title="Quản lý người dùng"
      />

      <section className="admin-toolbar admin-reveal">
        <label className="admin-toolbar__search">
          <AppFaIcon icon={appIcons.search} />
          <input
            type="search"
            placeholder="Tìm theo tên, email hoặc username..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          {roles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </section>

      {errorText ? <p className="dashboard-status dashboard-status--error">{errorText}</p> : null}
      {isLoading ? <p className="dashboard-status">Đang tải danh sách người dùng...</p> : null}

      {!isLoading ? (
        <section className="admin-panel admin-panel--table admin-reveal">
          <div className="admin-user-table">
            <div className="admin-user-table__head">
              <span>Người dùng</span>
              <span>Vai trò</span>
              <span>Trạng thái</span>
              <span>Ngày tạo</span>
              <span>Đăng nhập gần nhất</span>
            </div>
            {visibleUsers.map((user) => {
              const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username
              const status = getUserStatus(user)
              return (
                <article key={user.id} className="admin-user-row">
                  <div>
                    <strong>{fullName}</strong>
                    <p>{user.email}</p>
                  </div>
                  <span>{getUserRole(user)}</span>
                  <span className={`admin-status-pill ${status === 'Hoạt động' ? 'is-positive' : 'is-negative'}`}>
                    {status}
                  </span>
                  <span>{formatDate(user.date_joined)}</span>
                  <span>{formatDate(user.last_login)}</span>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}
    </>
  )
}
