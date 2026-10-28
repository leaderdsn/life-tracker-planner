<template>
  <Card class="technology-card-skeleton" aria-hidden="true">
    <template #header>
      <div class="technology-card-skeleton__header">
        <Skeleton size="3rem" border-radius="0.75rem" />
        <Skeleton width="4rem" height="1.5rem" border-radius="1rem" />
      </div>
    </template>
    <template #content>
      <Skeleton width="60%" height="1.25rem" class="technology-card-skeleton__line" />
      <Skeleton width="35%" class="technology-card-skeleton__line" />
      <Skeleton class="technology-card-skeleton__line" />
      <Skeleton width="80%" />
    </template>
  </Card>
</template>

<style lang="sass" scoped>
@use './TechnologyCardSkeleton'
</style>
