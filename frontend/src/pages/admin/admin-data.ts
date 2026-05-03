import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { appIcons } from '../../components/icons/font-awesome'

export type Tone = 'violet' | 'sky' | 'mint' | 'amber'

export interface AdminMetric {
  label: string
  value: string
  delta: string
  icon: IconDefinition
  tone: Tone
}

export interface AdminCourseRow {
  id: number
  title: string
  summary: string
  category: string
  tags: string[]
  updatedAt: string
  popularity: number
  lessons: number
  hours: string
  thumbnail: string
}

export interface AdminUserRow {
  id: number
  name: string
  email: string
  role: string
  status: 'Hoạt động' | 'Chờ duyệt' | 'Tạm khóa'
  progress: string
  lastSeen: string
}

export interface AdminCategory {
  name: string
  slug: string
  description: string
  courseCount: number
  tagCount: number
}

export const adminAvatar =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAfkG9uuyAAbVkgZXtkmYcxv8QqNCN1qwctckrq_1Kb4Uxn5QiXeAS313HY7Q3yOvLsdpJ2gqfBTqXMRoZvWW-fMAkoyLp3kwtR7QYpTCoB6DnbAySAQMa9xLApkmOAAjk2EZa6ZTxsTCvL1M14Uhn50tukHayzzewpeUa-qC5jDVxV_FDexBy90q8i8tlt0haaG4qvfFwOha31-LScsK37siW0pyxIsvBP9h_RO4haxa7UpPF9v4syyFQGU1hd4mhctmqHiCtt90wV'

export const courseVisuals = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuClfVesIOIeoaMdKBaM3YFIRrqoUsgcLtiFHhb0ALebRChimfAdOYe7uQoTBeHNIWykw4VRSNEOMeE6GD9edqQdXST7-rGsGJhdoj_NCMAQA6qK_BoY7JOZBrdoTP9AcxeMckQx7600iPXRjCGwS4xe2P0tTqb-UW4n3W9eKTCqZWq5F24l8PzDu7o2ddR9mtP97mP-gmec_NRTBE5QpS2Y0ofCOKBJzwbNCxpYddQocced4_9C-M72l1QS-ouC4XxKOL9Eftgst8mN',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAMAS6unvLx7VXcUMHLyP9fdXhUo9JnJxa4RXaRXJTF7bfeDaO-kkI-1_m1AcHyVX4iIOU8bLqZ5rON8y-_YLE-Ix74WtoDe8tDNa8I_zWMOFN7MbNAQLfna6NYjJjQyml-9_nlMpH_KUVEPJqFROZVtGzfrIi15krX3eVPQW4MSFNEPBNsZLQwJIC8-HzJZNRKpMYBwhyXIJOvT6tDbfgLgXiJr9bXt2Goyj27k4vDeYIbnn9PFgDDrXlx3_a_HE6nPS6Szm3O29M1',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDXDOwC431zDsnJphk_niYHIpepDaqeQB-0nQDVUCcuH0Y0DyNlTFsDftRo23khE6w1t9--IOZN6rEmliL1vFDrut_NGTJ4ceLSbtQoVwjTz1HvrDf1woCZKarDQjtpSaPpIAp4UVmGnJOHnnFOjCJzKE8iA6e7JX8s_SBUZdgS1nAwkro4xA5ej_RlbXeEIAhI9Vf_-x93JRRwfhC6ALh3CmqkR5UjCIama8P2OdAp10_P9HTSJekDeowZDQlZ-jjeYFIjceCTMe5x',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBaNrCN-FfdSUk_KV4O8Zs0iq0JvPVJp0cZWf-4-7KvyWplFs7aUpaIU6Ah4sHlStWBPgUNE0p-7RSeg-Hti23DB5vbvUYRn20x8KTdRdQLFgbnfVtOeWopkCTvhflZs_2LxIz2qx8fIy9NYVEznLkeee9jraMpx7TGADS4vj3lb0GkCIAr4v2y185z4qeTwjKFsRnbG7W7KjDsPM72UIknsdUTu-xK0vtP281eOCAPiBCWOJrdpH1nIVX0Ci2bdCEsqHwSwm32YG9x',
]

export const sidebarItems = [
  { label: 'Tổng quan', path: '/admin/overview', icon: appIcons.dashboard },
  { label: 'Khóa học', path: '/admin/courses', icon: appIcons.course },
  { label: 'Danh Mục & Tag', path: '/admin/taxonomy', icon: appIcons.filter },
  { label: 'Người dùng', path: '/admin/users', icon: appIcons.hub },
  { label: 'Báo cáo', path: '/admin/reports', icon: appIcons.trend },
]

export const overviewMetrics: AdminMetric[] = [
  { label: 'Người dùng hoạt động', value: '1.245', delta: '+12% tháng này', icon: appIcons.hub, tone: 'violet' },
  { label: 'Lượt tìm kiếm', value: '8.902', delta: '+5% tuần qua', icon: appIcons.search, tone: 'sky' },
  { label: 'Lượt lưu khóa học', value: '3.420', delta: '+18% tháng này', icon: appIcons.saved, tone: 'mint' },
  { label: 'Khóa chờ duyệt', value: '27', delta: '4 cần xử lý ngay', icon: appIcons.course, tone: 'amber' },
]

export const overviewBars = [
  { label: 'T2', value: 38 },
  { label: 'T3', value: 61 },
  { label: 'T4', value: 76 },
  { label: 'T5', value: 49 },
  { label: 'T6', value: 88 },
  { label: 'T7', value: 58 },
  { label: 'CN', value: 69 },
]

export const adminCourses: AdminCourseRow[] = [
  { id: 1, title: 'Lập trình ReactJS Nâng cao', summary: 'Thiết kế giao diện thực chiến.', category: 'Công nghệ', tags: ['Frontend', 'React', 'UI'], updatedAt: '2026-04-07', popularity: 1204, lessons: 24, hours: '12 giờ', thumbnail: courseVisuals[2] },
  { id: 2, title: 'Tư duy thiết kế Product Design', summary: 'Nghiên cứu người dùng và luồng sản phẩm.', category: 'Thiết kế', tags: ['UI/UX', 'Figma'], updatedAt: '2026-04-05', popularity: 982, lessons: 18, hours: '8.5 giờ', thumbnail: courseVisuals[1] },
  { id: 3, title: 'Phân tích dữ liệu với Python', summary: 'Làm sạch dữ liệu và trực quan hóa.', category: 'Công nghệ', tags: ['Data', 'Python', 'AI'], updatedAt: '2026-04-03', popularity: 856, lessons: 32, hours: '15 giờ', thumbnail: courseVisuals[0] },
  { id: 4, title: 'Kỹ năng Quản lý Tài chính cá nhân', summary: 'Xây dựng kế hoạch tài chính.', category: 'Kinh doanh', tags: ['Finance', 'SoftSkills'], updatedAt: '2026-03-28', popularity: 621, lessons: 12, hours: '5 giờ', thumbnail: courseVisuals[3] },
  { id: 5, title: 'An toàn thông tin thực hành', summary: 'Các kỹ thuật phòng thủ và giám sát.', category: 'Bảo mật', tags: ['Security', 'Network', 'SOC'], updatedAt: '2026-04-02', popularity: 593, lessons: 20, hours: '11 giờ', thumbnail: courseVisuals[2] },
]

export const topCourses = [
  { title: 'Phát triển Web Fullstack', category: 'Kỹ thuật phần mềm', interest: 1204, status: 'Ổn định' },
  { title: 'Trí tuệ nhân tạo căn bản', category: 'AI & Data Science', interest: 982, status: 'Tăng nhanh' },
  { title: 'Phân tích dữ liệu với Python', category: 'Data Analysis', interest: 856, status: 'Cần theo dõi' },
  { title: 'Thiết kế UI/UX nâng cao', category: 'Design', interest: 743, status: 'Ổn định' },
]

export const adminUsers: AdminUserRow[] = [
  { id: 1, name: 'Nguyễn Minh Anh', email: 'minhanh@hust.edu.vn', role: 'Học viên', status: 'Hoạt động', progress: '88%', lastSeen: '2 phút trước' },
  { id: 2, name: 'Lê Thu Hà', email: 'thuha@hust.edu.vn', role: 'Giảng viên', status: 'Hoạt động', progress: 'Đã xác minh', lastSeen: '18 phút trước' },
  { id: 3, name: 'Phạm Quang Duy', email: 'quangduy@hust.edu.vn', role: 'Học viên', status: 'Chờ duyệt', progress: '34%', lastSeen: '1 giờ trước' },
  { id: 4, name: 'Trần Mai Linh', email: 'mailinh@hust.edu.vn', role: 'Quản trị nội dung', status: 'Hoạt động', progress: '5 khóa chờ duyệt', lastSeen: 'Vừa xong' },
  { id: 5, name: 'Đào Quốc Bảo', email: 'quocbao@hust.edu.vn', role: 'Học viên', status: 'Tạm khóa', progress: '12%', lastSeen: '2 ngày trước' },
]

export const adminCategories: AdminCategory[] = [
  { name: 'Công nghệ', slug: 'technology', description: 'Lập trình, hệ thống và dữ liệu.', courseCount: 64, tagCount: 18 },
  { name: 'Thiết kế', slug: 'design', description: 'Trải nghiệm người dùng và thiết kế sản phẩm.', courseCount: 21, tagCount: 12 },
  { name: 'Kinh doanh', slug: 'business', description: 'Quản trị, vận hành và tài chính.', courseCount: 18, tagCount: 9 },
  { name: 'Bảo mật', slug: 'security', description: 'An toàn thông tin và giám sát hệ thống.', courseCount: 15, tagCount: 11 },
]

export const adminTags = [
  { label: 'React', usage: 24 },
  { label: 'Python', usage: 19 },
  { label: 'Data', usage: 16 },
  { label: 'UI/UX', usage: 14 },
  { label: 'Security', usage: 12 },
  { label: 'SoftSkills', usage: 10 },
  { label: 'Cloud', usage: 8 },
  { label: 'SQL', usage: 7 },
]

export const reportMetrics: AdminMetric[] = [
  { label: 'Tỷ lệ đăng ký mới', value: '24.6%', delta: '+3.1%', icon: appIcons.trend, tone: 'mint' },
  { label: 'Hoàn thành onboarding', value: '72%', delta: '+6.4%', icon: appIcons.profile, tone: 'sky' },
  { label: 'CTR khuyến nghị', value: '18.2%', delta: '-1.2%', icon: appIcons.target, tone: 'amber' },
  { label: 'Phản hồi API', value: '284ms', delta: 'Ổn định', icon: appIcons.clock, tone: 'violet' },
]

export const reportSources = [
  { label: 'Search', value: 42 },
  { label: 'Recommendations', value: 31 },
  { label: 'Saved', value: 18 },
  { label: 'Profile', value: 9 },
]

export const alertItems = [
  { title: '12 yêu cầu phê duyệt khóa học mới', description: 'Nội dung từ giảng viên SOICT đang chờ rà soát metadata.' },
  { title: '3 tài khoản cần kiểm tra truy cập', description: 'Hệ thống phát hiện tần suất đăng nhập bất thường.' },
]

export function toneClass(tone: Tone) {
  return `is-${tone}`
}

export function formatDateLabel(dateValue: string) {
  return new Intl.DateTimeFormat('vi-VN').format(new Date(dateValue))
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}
