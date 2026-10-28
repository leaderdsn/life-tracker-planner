<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'

import { useScheduleStore } from '@/entities/schedule'
import { useUndoToast } from '@/shared/ui'

const props = defineProps<{ participantId: string }>()

const emit = defineEmits<{
  removed: []
}>()

const store = useScheduleStore()
const confirm = useConfirm()
const undoToast = useUndoToast()

function plural(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'занятие'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'занятия'
  return 'занятий'
}

function ask() {
  const participant = store.participantById(props.participantId)
  if (!participant) return
  const count = store.eventsOf(participant.id).length
  confirm.require({
    header: 'Удалить участника?',
    message: `${participant.name}: вместе с ним уйдёт ${count} ${plural(count)} и отметки о выполнении.`,
    icon: 'pi pi-trash',
    acceptLabel: 'Удалить',
    rejectLabel: 'Оставить',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', variant: 'text' },
    accept: () => {
      store.removeParticipant(participant.id)
      undoToast.show(`${participant.name} удалён(а)`)
      emit('removed')
    },
  })
}
</script>

<template>
  <Button
    label="Удалить участника"
    icon="pi pi-trash"
    severity="secondary"
    variant="text"
    size="small"
    @click="ask"
  />
</template>
