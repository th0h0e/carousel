export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],

  devtools: { enabled: true },

  devServer: {
    port: 3002,
  },

  compatibilityDate: '2026-04-27',

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
