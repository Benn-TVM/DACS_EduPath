import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons'
import {
  faArrowLeft,
  faArrowRight,
  faArrowTrendUp,
  faBars,
  faBell,
  faBookOpen,
  faBookmark,
  faBullseye,
  faChartColumn,
  faChartLine,
  faCheck,
  faChevronLeft,
  faChevronRight,
  faCircleDot,
  faCirclePlay,
  faClock,
  faDatabase,
  faDesktop,
  faEnvelope,
  faFlask,
  faGear,
  faGraduationCap,
  faHeart,
  faHouse,
  faKeyboard,
  faListCheck,
  faMagnifyingGlass,
  faMicrochip,
  faPenToSquare,
  faPlus,
  faRightFromBracket,
  faRobot,
  faRoute,
  faScaleBalanced,
  faShieldHalved,
  faSliders,
  faStar,
  faTrashCan,
  faUser,
  faUsers,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'

export const appIcons = {
  dashboard: faChartColumn,
  roadmap: faRoute,
  compare: faScaleBalanced,
  hub: faUsers,
  search: faMagnifyingGlass,
  saved: faBookmark,
  history: faClock,
  clock: faClock,
  profile: faUser,
  settings: faGear,
  logout: faRightFromBracket,
  notifications: faBell,
  back: faArrowLeft,
  next: faArrowRight,
  target: faBullseye,
  course: faBookOpen,
  stats: faChartLine,
  skills: faMicrochip,
  ai: faRobot,
  community: faGraduationCap,
  email: faEnvelope,
  home: faHouse,
  trend: faArrowTrendUp,
  security: faShieldHalved,
  edit: faPenToSquare,
  close: faXmark,
  plus: faPlus,
  menu: faBars,
  help: faCircleDot,
  filter: faSliders,
  delete: faTrashCan,
  database: faDatabase,
  desktop: faDesktop,
  check: faCheck,
  checklist: faListCheck,
  heart: faHeart,
  play: faCirclePlay,
  flask: faFlask,
  keyboard: faKeyboard,
  star: faStar,
  breadcrumb: faChevronRight,
  prev: faChevronLeft,
  chevron: faChevronRight,
  admin: faShieldHalved,
} satisfies Record<string, IconDefinition>

export function AppFaIcon({
  icon,
  className,
  title,
  fixedWidth = true,
}: {
  icon: IconDefinition
  className?: string
  title?: string
  fixedWidth?: boolean
}) {
  return <FontAwesomeIcon icon={icon} className={className} title={title} fixedWidth={fixedWidth} />
}

export function RatingStars({
  rating,
  max = 5,
  className,
}: {
  rating: number
  max?: number
  className?: string
}) {
  return (
    <span className={className} aria-label={`${rating} trên ${max} sao`}>
      {Array.from({ length: max }, (_, index) => (
        <FontAwesomeIcon
          key={index}
          icon={index < rating ? faStar : farStar}
          fixedWidth
        />
      ))}
    </span>
  )
}
