import { CheckCircle2, CircleDashed, EyeOff, XCircle } from 'lucide-react'

import type { CommentStatus } from '../types'

const STATUS_CONFIG: Record<
  CommentStatus,
  {
    icon: React.JSX.Element
    label: string
    className: string
  }
> = {
  approved: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: '已批准',
    className: 'text-green',
  },
  pending: {
    icon: <CircleDashed className="h-3.5 w-3.5" />,
    label: '待审核',
    className: 'text-yellow',
  },
  hidden: {
    icon: <EyeOff className="h-3.5 w-3.5" />,
    label: '已隐藏',
    className: 'text-text-tertiary',
  },
  rejected: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: '已拒绝',
    className: 'text-red',
  },
}

interface CommentStatusBadgeProps {
  status: CommentStatus
}

export function CommentStatusBadge({ status }: CommentStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${config.className}`}>
      {config.icon}
      <span>{config.label}</span>
    </span>
  )
}
