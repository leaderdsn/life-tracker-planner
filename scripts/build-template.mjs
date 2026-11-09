import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ExcelJS from 'exceljs'

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/templates/raspisanie-shablon.xlsx')
const LAST_ROW = 500

const HEADERS = [
  ['Участники', 24], ['День', 7], ['Дата', 13], ['Начало', 10], ['Окончание', 12], ['Занятие', 30],
  ['Место', 18], ['Категория', 13], ['Напоминание, мин', 18], ['Во «Все»', 10], ['Заметка', 32],
]
const CATEGORIES = ['Занятие', 'Учёба', 'Режим', 'Дорога', 'Работа']
const LAVENDER = 'FFE4DDF7'
const GRAY = 'FFEEEEEE'
const INK = 'FF2B2540'

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const thin = { style: 'thin', color: { argb: 'FFCFC8E3' } }
const border = { top: thin, left: thin, bottom: thin, right: thin }

function styleHeader(row, argb) {
  row.font = { bold: true, color: { argb: INK } }
  row.fill = fill(argb)
  row.alignment = { vertical: 'middle', wrapText: true }
  row.height = 22
  row.eachCell((cell) => { cell.border = border })
}

const book = new ExcelJS.Workbook()

const events = book.addWorksheet('Расписание', { views: [{ state: 'frozen', ySplit: 1 }] })
events.columns = HEADERS.map(([header, width]) => ({ header, width }))
styleHeader(events.getRow(1), LAVENDER)
events.autoFilter = { from: 'A1', to: { row: 1, column: HEADERS.length } }
for (const letter of ['C', 'D', 'E']) events.getColumn(letter).numFmt = '@'

const rule = (letter, validation) => {
  for (let r = 2; r <= LAST_ROW; r++) events.getCell(`${letter}${r}`).dataValidation = validation
}
const list = (items) => ({
  type: 'list', allowBlank: true, formulae: [`"${items.join(',')}"`],
  showErrorMessage: true, errorStyle: 'warning', errorTitle: 'Не из списка', error: `Выберите: ${items.join(', ')}`,
})
const prompt = (promptTitle, text) => ({
  type: 'custom', allowBlank: true, formulae: ['TRUE'], showInputMessage: true, promptTitle, prompt: text,
})
rule('B', list(['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']))
rule('H', list(CATEGORIES))
rule('J', list(['да', 'нет']))
rule('I', list(['0', '5', '10', '15', '30', '60']))
rule('D', prompt('Время', 'Например 8:30 или 8.30'))
rule('E', prompt('Время', 'Например 8:30 или 8.30'))
rule('C', prompt('Дата', 'ДД.ММ.ГГГГ — только для разового занятия, иначе пусто'))

const people = book.addWorksheet('Участники', { views: [{ state: 'frozen', ySplit: 1 }] })
people.columns = [{ header: 'Имя', width: 24 }, { header: 'Цвет', width: 14 }]
styleHeader(people.getRow(1), LAVENDER)
people.getColumn('B').numFmt = '@'
people.getCell('B1').note = 'Цвет в формате hex, например #CFE2FF. Необязательно.'

const guide = book.addWorksheet('Как заполнять', { views: [{ showGridLines: false }] })
guide.columns = HEADERS.slice(0, 7).map(([, width], i) => ({ width: [24, 8, 13, 10, 12, 28, 18][i] ?? width }))
const steps = [
  'Как заполнять шаблон',
  '1. Одна строка — одно занятие.',
  '2. Несколько участников пишите через запятую: Аня, Миша. Новые имена добавятся сами.',
  '3. Еженедельное занятие: укажите День (ПН, ВТ, СР, ЧТ, ПТ, СБ, ВС). Дату оставьте пустой.',
  '4. Разовое занятие: укажите Дату (ДД.ММ.ГГГГ), а День оставьте пустым.',
  '5. Время можно писать как угодно: 8:30, 8.30, 830 или 08:30.',
  '6. Обязательны только участники, день или дата, начало и название занятия.',
  '7. Загрузка: ⚙ → Данные → Загрузить из файла → «Добавить к текущему» или «Заменить расписание».',
  '',
  'Пример (его не нужно переносить в таблицу):',
]
steps.forEach((text, i) => {
  const row = guide.addRow([text])
  if (i === 0) row.font = { bold: true, size: 14, color: { argb: INK } }
})
const exampleHeader = guide.addRow(HEADERS.slice(0, 7).map(([name]) => name))
styleHeader(exampleHeader, 'FFD9D9D9')
const examples = [
  ['Аня', 'ПН', '', '8:30', '9:15', 'Вокал', 'Студия'],
  ['Аня, Миша', 'СР', '', '17.00', '18:00', 'Плавание', 'Бассейн'],
  ['Миша', '', '08.03.2026', '10:00', '12:00', 'Концерт', 'Школа'],
]
for (const values of examples) {
  const row = guide.addRow(values)
  row.font = { color: { argb: 'FF555555' } }
  row.eachCell({ includeEmpty: true }, (cell) => { cell.fill = fill(GRAY); cell.border = border; cell.numFmt = '@' })
}

mkdirSync(dirname(out), { recursive: true })
await book.xlsx.writeFile(out)
console.log(`Шаблон сохранён: ${out}`)
