export type ScheduleView = 'day' | 'week' | 'month'

export const VIEW_OPTIONS = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
] as const satisfies readonly { value: ScheduleView; label: string }[]

export const isScheduleView = (value: unknown): value is ScheduleView =>
  VIEW_OPTIONS.some((option) => option.value === value)
