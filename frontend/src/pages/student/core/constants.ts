import { appIcons } from '../../../components/icons/font-awesome'

export const partnerNames = ['SOICT MOOC', 'HUST ACADEMY', 'EDUTECH LAB', 'VIETTEL ACADEMY']

export const avatarImages = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBxIjK1CF0NrgyAD7oFIidFTI99EvXgZ9Rmt71WVQvYbUv1-5E1OXxXpKiT1cf8hRwaIcM32et2Pth2ObUr03JX7dGMAOwTbSq9k9dTAQqywewMM_afS69VIoSvR94_P9jHPGcB3mer6M1QkweeUlNssXwaz4RDCWkhSM4kkf7qknSO2ffaoBCaAK7NjUYcGUfSR57I82maJ1tlAhT12zoEsCEEx--fAbTSMXnb_kETIuybGAzCBCZNZZ5CsSdFYM_34SgeDL3__o_e',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAfUeWduOkFA4wWujPE-wqeuwlAOrDXw-TX5IwyUdv91K3AuwZjCiPwQZygrVRSHRpc5atUkuU7iUAQMUOW2R9fQKpTrauSyWQevVw04q7ThGzzFQxTfIMld2LgXDzaVgfOdW6hLO7NcD-gGcJn00NAL4-gW7DjLEvNyXEIkDYNy9MMacYO28iR2X4GCCSE8UF_N3l998wgOhKuFeIyhTcnFZxbGmRfLD0B6oV7VKOsK3-appYklxB8OqpxcG3yUXL7wQrR-cBM0AQy',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAoKNKPIi138DPpVHlTqcUMENOW_p9_dRL8L0E5y3sMqmhn-HBXEM3aQlS-zIZgORaebD5vLSKG_JXrxTOoWphZMvlF8pF5To-zme5GBumuuoXt5bXhFqMNJnOg6YRtUhuGi16aA6qi30MvNQmoZ86v2Gkp__ybV4QuJA6ybKQpOTrLAWYOkg-xrbuB9JvUsL4-Kmpl_DEmFiG7o843sKftaIXx_UQpfQtdREp0rpcjK8_xkGqlwJvTOF1CUnqk9xVICvheaJgoHNwi',
]

export const loginAvatars = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBrW5RdDfnVooiLwr06K-bL64JC048TixQQo653YkTbDJ9zkdnH0uZ5zuihT0PnREj6YT8kPW5ylQ7kk2MlDIfW3D-1NFUlxhYN3bmUhPXn3SAFuf2zTDs-XVX8DDSLvdMDxngthuGXsW-5H1Fxnf-P_8k0qb0VVVTG01zIUgELibLfXo1Kll9thxrVWGm-ovJZ0MPX1s7euY0BBCvC2jW6wFplIFxmznDinLm0cvzdWHGcIhbb2H3ra6Ku72b3SnskGm3fyTXGeiq-',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuACaKwWRAtUozvcSVBXXuHLrcyW5ck9_rJGOmwG9DIuM6H3gV3cDUMPF3s55Y3P9keXqKgnl-F6cBAOVIbmtXkVwTDmUARRJltRH8lxtuXo7MAvimc_whF_J4qbnb-pUXtY1M9HUxoM7nyU09l1nX9FQJSaUJl_bGLdeg0H6x8nCA0HyRub5ZjedjuNxkrEqyRolZZszADbVt1cOJmsWgk3OjvAZ9r9SJud8N3HnhrADo1Qmus6bqJCVa0ugP1fW5O0l7rgBKFNNmPP',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCHpoLy-k6ojySTU57NmA0JIz50Nv1xehT-BTcwcGbVPaGxktEOLJWNxVmpbAoElFzCjsCnRauwJTF1JJJ2jw_HdZ0t-RNaxbAht1ba_NNkJ6c8fdpke_0KaZZ12M2inr-CBnhYVFZ_QZue1O-L-d87JbLGt-K84ORXsaHejEeFMH5GjvUc5WvZZTuALt10-LpBn7lsowQPyoKAS83p7IRzbBHd1mhaSGC1E1XbuqbjmOEwmcRJx_jaXeuZG1ETcDjAsXR8NVHj97Kj',
]

export const dashboardFilters = [
  'Tất cả',
  'AI & Data Science',
  'Phát triển phần mềm',
  'An toàn thông tin',
  'Hệ thống máy tính',
]

/** Ảnh phù hợp theo chủ đề danh mục */
const categoryImages: Record<string, string[]> = {
  // AI, Machine Learning, Deep Learning
  'Trí tuệ Nhân tạo & Học máy': [
    'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1677756119517-756a188d2d94?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=640&h=360&fit=crop',
  ],
  // Web, Mobile development
  'Phát triển Web & Di động': [
    'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1547658719-da2b51169166?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1581276879432-15e50529f34b?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=640&h=360&fit=crop',
  ],
  // Security, Network Security
  'An toàn Thông tin & Mạng': [
    'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=640&h=360&fit=crop',
  ],
  // Data Science, Big Data
  'Khoa học Dữ liệu & Big Data': [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=640&h=360&fit=crop',
  ],
  // Software Engineering
  'Phát triển Phần mềm': [
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1605379399642-870262d3d051?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=640&h=360&fit=crop',
  ],
  // Networks, Distributed Systems
  'Mạng & Hệ phân tán': [
    'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1506399558188-acca6f8cbf41?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=640&h=360&fit=crop',
  ],
  // Hardware, Embedded Systems
  'Hệ thống & Phần cứng': [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1562408590-e32931084e23?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1601132359864-c974e79890ac?w=640&h=360&fit=crop',
  ],
  // Computer Science, Algorithms
  'Khoa học Máy tính & Thuật toán': [
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1453733190371-0a9bedd82893?w=640&h=360&fit=crop',
  ],
  // Databases
  'Cơ sở Dữ liệu': [
    'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=640&h=360&fit=crop',
  ],
  // Introductory courses
  'Nhập môn & Đại cương': [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=640&h=360&fit=crop',
    'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=640&h=360&fit=crop',
  ],
}

/** Fallback ảnh cho khóa học không có danh mục */
const defaultImages = [
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=640&h=360&fit=crop',
]

export const categoryKeywords: Record<string, string[]> = {
  'AI & Data Science': ['ai', 'data', 'machine', 'learning', 'python', 'neural', 'deep'],
  'Phát triển phần mềm': ['web', 'react', 'node', 'software', 'lap trinh', 'java', 'php', 'frontend'],
  'An toàn thông tin': ['bao mat', 'security', 'an toan', 'attack', 'crypt', 'mang'],
  'Hệ thống máy tính': ['he thong', 'database', 'sql', 'computer', 'operating', 'system', 'query'],
}

export const dashboardBadges = ['Phù hợp nhất', 'Mới cập nhật', 'Đề xuất hôm nay', 'Nên học tiếp', 'Khóa học nổi bật']
export const appTopbarAvatar =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAfkG9uuyAAbVkgZXtkmYcxv8QqNCN1qwctckrq_1Kb4Uxn5QiXeAS313HY7Q3yOvLsdpJ2gqfBTqXMRoZvWW-fMAkoyLp3kwtR7QYpTCoB6DnbAySAQMa9xLApkmOAAjk2EZa6ZTxsTCvL1M14Uhn50tukHayzzewpeUa-qC5jDVxV_FDexBy90q8i8tlt0haaG4qvfFwOha31-LScsK37siW0pyxIsvBP9h_RO4haxa7UpPF9v4syyFQGU1hd4mhctmqHiCtt90wV'

export const appNavItems = [
  { id: 'dashboard', label: 'Trang chủ', path: '/dashboard', icon: appIcons.dashboard },
  { id: 'roadmap', label: 'Lộ trình AI', path: '/roadmap', icon: appIcons.roadmap },
  { id: 'compare', label: 'So sánh', path: '/compare', icon: appIcons.compare },
  { id: 'hub', label: 'Cộng đồng', path: '/hub', icon: appIcons.hub },
] as const