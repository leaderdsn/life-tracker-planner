import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ImportPreviewDialog from './ImportPreviewDialog.vue'

import type { ImportMode, ImportSummary, ParsedImport, Participant } from '@/entities/schedule'

const ruslan: Participant = { id: 'r', name: 'Мирон', color: '#bde0fe', order: 0 }
const anya: Participant = { id: 'a', name: 'Аня', color: '#ffc8dd', order: 1 }

const event = (i: number): ParsedImport['events'][number] => ({
  participantIds: [i % 2 ? 'a' : 'r'],
  day: 'mon',
  start: '09:00',
  end: '10:00',
  title: `Занятие ${i}`,
  category: 'activity',
})

function summary(mode: ImportMode, patch: Partial<ImportSummary> = {}): ImportSummary {
  return { mode, added: 0, skipped: 0, removed: 0, newParticipants: 0, errors: [], ...patch }
}

function mountDialog(parsed: Partial<ParsedImport> = {}, skipped = 0) {
  const full: ParsedImport = {
    events: Array.from({ length: 12 }, (_, i) => event(i)),
    participants: [anya],
    errors: [{ row: 4, message: 'Не понимаю время «abc»' }],
    rows: 13,
    ...parsed,
  }
  return mount(ImportPreviewDialog, {
    props: {
      visible: true,
      fileName: 'raspisanie.xlsx',
      parsed: full,
      existing: [ruslan],
      summaries: { replace: summary('replace'), merge: summary('merge', { skipped }) },
    },
    global: { stubs: { AppDialog: { template: '<div><slot /><slot name="footer" /></div>' } } },
  })
}

describe('ImportPreviewDialog', () => {
  it('показывает счётчики и новых участников', () => {
    const wrapper = mountDialog()
    expect(wrapper.get('[data-test=events]').text()).toBe('12')
    expect(wrapper.get('[data-test=participants]').text()).toBe('1')
    expect(wrapper.get('[data-test=errors]').text()).toBe('1')
    expect(wrapper.text()).toContain('Новые участники: Аня')
  })

  it('в таблице только первые 10 строк и остаток', () => {
    const wrapper = mountDialog()
    expect(wrapper.findAll('tbody tr')).toHaveLength(10)
    expect(wrapper.text()).toContain('…и ещё 2')
  })

  it('перечисляет ошибки с номерами строк', () => {
    const wrapper = mountDialog()
    expect(wrapper.get('.import-preview__errors').text()).toContain('Строка 4: Не понимаю время «abc»')
  })

  it('сообщает о повторах при добавлении', () => {
    expect(mountDialog({}, 3).text()).toContain('3 повторов')
  })

  it('кнопки режимов отправляют выбранный режим', async () => {
    const wrapper = mountDialog()
    await wrapper.get('[data-test=replace]').trigger('click')
    await wrapper.get('[data-test=merge]').trigger('click')
    expect(wrapper.emitted('apply')).toEqual([['replace'], ['merge']])
  })

  it('«Отмена» закрывает диалог', async () => {
    const wrapper = mountDialog()
    await wrapper.get('[data-test=cancel]').trigger('click')
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
  })

  it('пустой файл: применить нельзя', () => {
    const wrapper = mountDialog({ events: [], participants: [], errors: [], rows: 0 })
    expect(wrapper.get('[data-test=replace]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test=merge]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('не нашлось занятий')
  })
})
