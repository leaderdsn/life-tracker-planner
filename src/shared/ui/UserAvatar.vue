<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    color: string
    src?: string | null
    /** Overrides the initial shown when there is no photo. */
    label?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  { src: null, label: '', size: 'sm' },
)

const failed = ref(false)
watch(() => props.src, () => (failed.value = false))

const showImage = computed(() => Boolean(props.src) && !failed.value)
const text = computed(() => props.label || props.name.trim().charAt(0).toUpperCase())
</script>

<template>
  <span class="avatar" :class="`avatar--${size}`" :style="{ '--avatar-bg': color }" aria-hidden="true">
    <img v-if="showImage" class="avatar__img" :src="src ?? undefined" alt="" @error="failed = true">
    <span v-else class="avatar__text">{{ text }}</span>
  </span>
</template>

<style lang="sass" scoped>
@use './UserAvatar'
</style>
