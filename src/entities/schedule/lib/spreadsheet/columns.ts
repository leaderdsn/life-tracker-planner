export type Column = 'participants' | 'day' | 'date' | 'start' | 'end' | 'title' | 'place' | 'category' | 'remind' | 'showInAll' | 'note'

export const EVENT_HEADERS: Record<Column, string> = {
  participants: 'Участники',
  day: 'День',
  date: 'Дата',
  start: 'Начало',
  end: 'Окончание',
  title: 'Занятие',
  place: 'Место',
  category: 'Категория',
  remind: 'Напоминание, мин',
  showInAll: 'Во «Все»',
  note: 'Заметка',
}

export const COLUMN_ORDER: Column[] = [
  'participants', 'day', 'date', 'start', 'end', 'title', 'place', 'category', 'remind', 'showInAll', 'note',
]

export const PARTICIPANT_HEADERS = { name: 'Имя', color: 'Цвет' } as const

export const EVENTS_SHEET = 'Расписание'
export const PARTICIPANTS_SHEET = 'Участники'
export const GUIDE_SHEET = 'Как заполнять'

export const headerKey = (value: unknown): string =>
  (typeof value === 'string' || typeof value === 'number' ? String(value) : '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, '')

const ALIASES: Record<Column, string[]> = {
  participants: ['участники', 'участник', 'кто', 'имя', 'имена', 'люди', 'для'],
  day: ['день', 'дни', 'деньнедели', 'днинедели', 'дн'],
  date: ['дата', 'датасобытия', 'числа'],
  start: ['начало', 'время', 'с', 'старт', 'началозанятия', 'времяначала'],
  end: ['окончание', 'конец', 'до', 'финиш', 'конецзанятия', 'времяокончания'],
  title: ['занятие', 'название', 'событие', 'предмет', 'что', 'дело'],
  place: ['место', 'кабинет', 'где', 'локация', 'адрес'],
  category: ['категория', 'тип', 'вид'],
  remind: ['напоминаниемин', 'напоминание', 'напомнить', 'напомнитьзамин', 'заминут'],
  showInAll: ['вовсе', 'показыватьвовсе', 'показывать', 'видимость', 'вовсехвкладке'],
  note: ['заметка', 'комментарий', 'примечание', 'заметки', 'описание'],
}

const COLUMN_BY_KEY = new Map<string, Column>(
  (Object.entries(ALIASES) as [Column, string[]][]).flatMap(([column, keys]) =>
    [...keys, headerKey(EVENT_HEADERS[column])].map((key): [string, Column] => [key, column]),
  ),
)

export const columnOf = (header: unknown): Column | undefined => COLUMN_BY_KEY.get(headerKey(header))
