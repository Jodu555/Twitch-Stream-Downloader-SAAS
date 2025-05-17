// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  debug: true,
  typescript: {
    strict: true
  },
  devtools: {
    enabled: true,
    timeline: {
      enabled: true,
    },
  },
  app: {
    head: {
      bodyAttrs: {
        'data-bs-theme': 'dark'
      },
      link: [
        {
          rel: 'stylesheet',
          href: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css'
        }
      ],
      script: [
        {
          src: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
          tagPosition: 'bodyClose'
        }
      ]
    }
  },
  modules: [
    '@nuxt/icon',
    '@nuxt/image',
    '@pinia/nuxt',
    '@formkit/auto-animate',
    '@vueuse/nuxt',
  ]
});
