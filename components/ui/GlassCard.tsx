import { cn } from '@/lib/utils'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export default function GlassCard({ children, className, hover = false, ...props }: GlassCardProps) {
  return (
    <div
      className={cn('glass rounded-2xl p-4', hover && 'glass-hover cursor-pointer', className)}
      {...props}
    >
      {children}
    </div>
  )
}
