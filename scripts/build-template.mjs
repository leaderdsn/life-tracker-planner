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

const rule = (letter, validation, numFmt) => {
  for (let r = 2; r <= LAST_ROW; r++) {
    const cell = events.getCell(`${letter}${r}`)
    cell.dataValidation = validation
    if (numFmt) cell.numFmt = numFmt
  }
}
const list = (items) => ({
  type: 'list', allowBlank: true, formulae: [`"${items.join(',')}"`],
  showErrorMessage: true, errorStyle: 'warning', errorTitle: 'Не из списка', error: `Выберите: ${items.join(', ')}`,
})
const hint = (promptTitle, text) => ({ showInputMessage: true, promptTitle, prompt: text })
const timeRule = {
  type: 'decimal', operator: 'between', allowBlank: true, formulae: [0, 0.99999],
  showErrorMessage: true, errorStyle: 'warning', errorTitle: 'Время', error: 'Введите время, например 08:30',
  ...hint('Время', 'Время, например 08:30'),
}
const dateRule = {
  type: 'date', operator: 'greaterThan', allowBlank: true, formulae: [new Date(Date.UTC(2000, 0, 1))],
  showErrorMessage: true, errorStyle: 'warning', errorTitle: 'Дата', error: 'Введите дату, например 20.12.2026',
  ...hint('Дата', 'Только для разового занятия'),
}
rule('A', {
  type: 'list', allowBlank: true, formulae: ["'Участники'!$A$2:$A$100"],
  showErrorMessage: true, errorStyle: 'information', errorTitle: 'Участники', error: 'Можно указать несколько имён через запятую',
  ...hint('Участники', 'Можно указать несколько имён через запятую'),
})
rule('B', list(['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']))
rule('C', dateRule, 'dd.mm.yyyy')
rule('D', timeRule, 'hh:mm')
rule('E', timeRule, 'hh:mm')
rule('H', list(CATEGORIES))
rule('I', list(['0', '5', '10', '15', '30', '60']))
rule('J', list(['да', 'нет']))

const time = (h, m) => (h * 60 + m) / 1440
const day = (y, m, d) => new Date(Date.UTC(y, m - 1, d))
const SAMPLES = [
  ['Аня', 'ПН', null, time(17, 0), time(18, 0), 'Танцы', 'Студия', 'Занятие', 15, 'да', ''],
  ['Миша', 'СР', null, time(16, 30), time(17, 15), 'Бассейн', 'Бассейн', 'Занятие', null, 'да', 'Взять шапочку и полотенце'],
  ['Аня, Миша', 'СБ', null, time(10, 0), null, 'Английский', '', 'Учёба', null, 'да', ''],
  ['Миша', 'ВТ', null, time(18, 0), time(19, 0), 'Шахматы', 'Клуб', 'Занятие', null, 'нет', ''],
  ['Аня', '', day(2026, 12, 20), time(12, 0), time(13, 30), 'Показательное выступление', 'Дом культуры', 'Занятие', 30, 'да', 'Сменная обувь'],
  ['Аня, Миша', 'ПН', null, time(8, 0), time(8, 40), 'Дорога в школу', '', 'Дорога', 5, 'да', ''],
  ['Аня', 'ПТ', null, time(21, 0), null, 'Собираемся спать', '', 'Режим', null, 'да', ''],
]
SAMPLES.forEach((values, i) => {
  const row = events.getRow(i + 2)
  values.forEach((v, c) => { if (v !== null && v !== '') row.getCell(c + 1).value = v })
})

const people = book.addWorksheet('Участники', { views: [{ state: 'frozen', ySplit: 1 }] })
people.columns = [{ header: 'Имя', width: 24 }, { header: 'Цвет', width: 14 }]
styleHeader(people.getRow(1), LAVENDER)
people.getColumn('B').numFmt = '@'
people.getCell('B1').note = 'Цвет в формате hex, например #CFE2FF. Необязательно.'
people.addRow(['Аня', '#FCE8B2'])
people.addRow(['Миша', '#CFE2FF'])
for (let r = 2; r <= 100; r++) {
  people.getCell(`B${r}`).dataValidation = {
    type: 'custom', allowBlank: true, formulae: [`AND(LEN(B${r})=7,LEFT(B${r},1)="#")`],
    showErrorMessage: true, errorStyle: 'warning', errorTitle: 'Цвет', error: 'Цвет в формате #RRGGBB',
    showInputMessage: true, promptTitle: 'Цвет', prompt: 'Например #CFE2FF',
  }
}

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
  '7. Примеры в листе «Расписание» можно удалить или заменить своими.',
  '8. Загрузка: ⚙ → Данные → Загрузить из файла → «Добавить к текущему» или «Заменить расписание».',
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
  ['Аня', 'ПН', '', '8:30', '9:15', 'Танцы', 'Студия'],
  ['Аня, Миша', 'СР', '', '17.00', '18:00', 'Английский', 'Дом'],
  ['Миша', '', '20.12.2026', '10:00', '12:00', 'Шахматный турнир', 'Клуб'],
]
for (const values of examples) {
  const row = guide.addRow(values)
  row.font = { color: { argb: 'FF555555' } }
  row.eachCell({ includeEmpty: true }, (cell) => { cell.fill = fill(GRAY); cell.border = border; cell.numFmt = '@' })
}

mkdirSync(dirname(out), { recursive: true })
await book.xlsx.writeFile(out)
console.log(`Шаблон сохранён: ${out}`)
