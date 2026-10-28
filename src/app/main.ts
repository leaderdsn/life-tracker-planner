import 'primeicons/primeicons.css'
import './styles/main.sass'

import { createApp } from 'vue'

import App from './App.vue'
import { installProviders } from './providers'

const app = createApp(App)

installProviders(app)

app.mount('#app')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
      console.error('Service worker registration failed', error)
    })
  })
}
