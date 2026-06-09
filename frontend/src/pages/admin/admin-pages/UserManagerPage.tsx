import { Fragment, useEffect, useMemo, useState } from 'react'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { fetchAdminUsers, type AdminUserRow } from '../services/admin-api'

type RoleFilter = 'all' | 'admin' | 'user'
type UserStatusFilter = 'all' | 'active' | 'locked'

const hiddenAdminUsernames = new Set(['codex_admin_verify'])

function isAdminUser(user: AdminUserRow) {
  return user.is_staff || user.is_superuser
}

export function UserManagerPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all')
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null)

  useEffect(() => {
    fetchAdminUsers()
      .then((data) => {
        setUsers(data)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [])

  const visibleUsers = useMemo(() => {
    return users.filter((user) => !hiddenAdminUsernames.has(user.username.toLowerCase()))
  }, [users])

  const stats = useMemo(() => {
    const active = visibleUsers.filter((user) => user.is_active).length
    const admins = visibleUsers.filter(isAdminUser).length
    const standardUsers = visibleUsers.length - admins

    return { active, locked: visibleUsers.length - active, admins, standardUsers }
  }, [visibleUsers])

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return visibleUsers.filter((user) => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase()
      const matchesSearch = !q ||
        user.username.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        fullName.includes(q)
      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'admin' && isAdminUser(user)) ||
        (roleFilter === 'user' && !isAdminUser(user))
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'locked' && !user.is_active)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [roleFilter, searchQuery, statusFilter, visibleUsers])

  function getDisplayName(user: AdminUserRow) {
    const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
    return full || user.username
  }

  function getRoleBadge(user: AdminUserRow) {
    if (isAdminUser(user)) return <span className="admin-status-pill is-positive">Admin</span>
    return <span className="admin-status-pill" style={{ color: '#4656d0', background: '#eef0ff' }}>User</span>
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Chưa đăng nhập'
    try {
      return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
    } catch {
      return dateStr
    }
  }

  function toggleExpand(userId: number) {
    setExpandedUserId((prev) => (prev === userId ? null : userId))
  }

  return (
    <div className="admin-reveal">
      <section className="admin-mini-metrics admin-reveal" aria-label="Tổng quan người dùng">
        <article>
          <span>Người dùng</span>
          <strong>{visibleUsers.length.toLocaleString('vi-VN')}</strong>
        </article>
        <article>
          <span>Đang hoạt động</span>
          <strong>{stats.active.toLocaleString('vi-VN')}</strong>
        </article>
        <article>
          <span>Admin</span>
          <strong>{stats.admins.toLocaleString('vi-VN')}</strong>
        </article>
        <article>
          <span>Tạm khóa</span>
          <strong>{stats.locked.toLocaleString('vi-VN')}</strong>
        </article>
      </section>

      <section className="admin-panel admin-reveal">
        <div className="admin-panel__head admin-panel__head--stack">
          <div>
            <h2 className="admin-panel__title">Danh sách Người dùng ({filteredUsers.length})</h2>
            <p>Lọc nhanh theo vai trò và trạng thái để kiểm tra quyền truy cập admin.</p>
          </div>
          <div className="admin-filter-bar admin-filter-bar--users">
            <div className="admin-toolbar__search">
              <AppFaIcon icon={appIcons.search} />
              <input
                type="text"
                placeholder="Tìm tên, username, email..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)} aria-label="Lọc vai trò">
              <option value="all">Mọi vai trò</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as UserStatusFilter)} aria-label="Lọc trạng thái">
              <option value="all">Mọi trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="locked">Tạm khóa</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="admin-empty-state">Đang tải danh sách người dùng...</div>
        ) : error ? (
          <div className="admin-empty-state is-error">{error}</div>
        ) : (
          <div className="admin-user-table-shell">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tham gia</th>
                  <th>Lần đăng nhập cuối</th>
                  <th aria-label="Mở rộng" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <Fragment key={user.id}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => toggleExpand(user.id)}>
                      <td data-label="Người dùng">
                        <strong>{getDisplayName(user)}</strong>
                        <div className="admin-table-muted">{user.email || 'Chưa có email'} · @{user.username}</div>
                      </td>
                      <td data-label="Vai trò">{getRoleBadge(user)}</td>
                      <td data-label="Trạng thái">
                        <span className={`admin-status-pill ${user.is_active ? 'is-positive' : 'is-negative'}`}>
                          {user.is_active ? 'Hoạt động' : 'Tạm khóa'}
                        </span>
                      </td>
                      <td data-label="Ngày tham gia">{formatDate(user.date_joined)}</td>
                      <td data-label="Đăng nhập cuối">{formatDate(user.last_login)}</td>
                      <td className="admin-user-table__expand-cell">
                        <button
                          type="button"
                          aria-label="Mở chi tiết người dùng"
                          style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748b', transform: expandedUserId === user.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                        >
                          <AppFaIcon icon={appIcons.chevronDown} />
                        </button>
                      </td>
                    </tr>
                    {expandedUserId === user.id && (
                      <tr className="admin-user-table__detail-row">
                        <td colSpan={6} className="admin-user-table__detail-cell">
                          <div className="admin-inline-detail">
                            <div>
                              <div className="admin-inline-detail__label">Thông tin tài khoản</div>
                              <div className="admin-inline-detail__body">
                                <div><strong>Username:</strong> {user.username}</div>
                                <div><strong>Email:</strong> {user.email || 'Chưa có'}</div>
                                <div><strong>Vai trò:</strong> {isAdminUser(user) ? 'Admin' : 'User'}</div>
                              </div>
                            </div>
                            <div>
                              <div className="admin-inline-detail__label">Hồ sơ AI / Onboarding</div>
                              <div className="admin-inline-detail__body is-muted">
                                Cần bổ sung endpoint user detail để xem sở thích, lịch sử tìm kiếm, khóa đã lưu, roadmap và log gợi ý theo từng người dùng.
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-empty-state">
                      {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                        ? 'Không tìm thấy người dùng phù hợp với bộ lọc.'
                        : 'Chưa có người dùng nào.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
