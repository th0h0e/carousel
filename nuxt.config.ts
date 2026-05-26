export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],

  devtools: { enabled: true },

  compatibilityDate: '2026-04-27',

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
