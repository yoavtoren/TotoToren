'use client'

import { GROUP_LETTERS } from '@/lib/constants'
import GroupCard from './GroupCard'
import type { GroupOrder } from '@/types'

interface GroupStageSectionProps {
  groupOrder: GroupOrder
  onReorder: (groupLetter: string, newOrder: number[]) => void
  disabled?: boolean
}

export default function GroupStageSection({ groupOrder, onReorder, disabled }: GroupStageSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-shadow">חלק 2 — דירוג הבתים</h2>
        <p className="text-sm text-white/50 mt-0.5">
          סדרו את 4 הנבחרות בכל בית לפי הסדר שאתם מנחשים (1 → 4).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {GROUP_LETTERS.map((g) => (
          <GroupCard
            key={g}
            groupLetter={g}
            teamIds={groupOrder[g] ?? []}
            onReorder={onReorder}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  )
}
