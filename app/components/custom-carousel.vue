<script setup lang="ts">
import type { PortfolioProject } from '#shared/types/pocketbase-types'

// Fetch portfolio projects from PocketBase
const { data: projects } = await useFetch<PortfolioProject[]>('/api/portfolio', {
  key: 'portfolio',
})

// Fetch the saved order from our KV storage
const { data: savedOrder } = await useFetch<string[]>('/api/tableOrder', {
  key: 'table-order',
  query: { key: 'portfolio' },
  default: () => [],
})

// Sort projects to match the saved order
const sortedProjects = computed(() => {
  const projectsList = projects.value ?? []
  const order = savedOrder.value ?? []

  if (order.length === 0) return projectsList

  return [...projectsList].sort((a, b) => {
    const indexA = order.indexOf(a.id)
    const indexB = order.indexOf(b.id)
    // Projects not in the order array go to the end
    if (indexA === -1 && indexB === -1) return 0
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })
})

const projectTitles = computed(() => (projects.value ?? []).map(p => p.title))

const { pocketbaseUrl } = useRuntimeConfig().public

// Helper to get image URLs for a project
const getProjectImages = (project: PortfolioProject) => {
  if (!project.images || project.images.length === 0) return []
  return project.images.map(
    (image: string) =>
      `${pocketbaseUrl}/api/files/Portfolio_Projects/${project.id}/${image}?thumb=1200x800`,
  )
}
</script>

<template>
  <div class="snap-container h-screen overflow-y-scroll">
    <HamburgerMenu :project-titles="projectTitles" />

    <div class="snap-point">
      <HeroComponentsIndexHero />
    </div>

    <div
      v-for="project in sortedProjects"
      :key="project.id"
      class="snap-point"
    >
      <a :id="`project-${project.title.replace(/\s+/g, '-').toLowerCase()}`" />
      <ClientOnly>
        <CarouselNewCarousel
          :images="getProjectImages(project)"
          :project-title="project.title"
          :project-description="project.description"
          :project-responsibility="project.responsibility"
          :alt="project.title"
        />
      </ClientOnly>
    </div>

    <div class="snap-point">
      <ProjectIndex :project-titles="projectTitles" />
    </div>
  </div>
</template>

<style scoped>
.snap-container {
  scroll-snap-type: y mandatory;
}

.snap-point {
  scroll-snap-align: center;
  scroll-snap-stop: always;
}
</style>
