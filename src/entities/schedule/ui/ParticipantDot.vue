<script setup lang="ts">
defineProps<{ color: string }>()
</script>

<template>
  <span class="participant-dot" :style="{ background: color }" aria-hidden="true" />
</template>

<style lang="sass" scoped>
@use './ParticipantDot'
</style>
