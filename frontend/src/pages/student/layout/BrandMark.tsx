import { Link } from 'react-router-dom'

export function BrandMark({
  to = '/',
  variant = 'site',
}: {
  to?: string
  variant?: 'site' | 'app'
}) {
  return (
    <Link className={`brand-mark${variant === 'app' ? ' brand-mark--app' : ''}`} to={to}>
      EduPath
    </Link>
  )
}
