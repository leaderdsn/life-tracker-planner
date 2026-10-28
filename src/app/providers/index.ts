import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'

import { primeVueOptions } from './primevue'
import { router } from './router'

import type { App } from 'vue'

export function installProviders(app: App) {
  app.use(createPinia())
  app.use(router)
  app.use(PrimeVue, primeVueOptions)
  app.use(ToastService)
  app.use(ConfirmationService)
}
