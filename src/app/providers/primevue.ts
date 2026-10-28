import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

import { DARK_MODE_CLASS } from '@/features/toggle-theme'

import type { PrimeVueConfiguration } from 'primevue/config'

const AppPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f1effd',
      100: '#e4e0fb',
      200: '#cdc6f7',
      300: '#b3a9f0',
      400: '#9488e6',
      500: '#7a6cdc',
      600: '#6657cc',
      700: '#5446b3',
      800: '#443993',
      900: '#382f78',
      950: '#231d4d',
    },
    borderRadius: {
      none: '0',
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '20px',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f7f5fc',
          100: '#efecf8',
          200: '#e1ddef',
          300: '#cdc8e0',
          400: '#a29cbd',
          500: '#78728f',
          600: '#5e5a78',
          700: '#4a4660',
          800: '#35324a',
          900: '#2a2840',
          950: '#1d1b2e',
        },
        primary: {
          color: '{primary.600}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.800}',
        },
      },
      dark: {
        surface: {
          0: '#ffffff',
          50: '#ece9f7',
          100: '#d4d0e6',
          200: '#b0abc8',
          300: '#8d88a8',
          400: '#6c6788',
          500: '#4f4a69',
          600: '#3a3850',
          700: '#2a2938',
          800: '#201f2b',
          900: '#17161f',
          950: '#100f17',
        },
        primary: {
          color: '{primary.300}',
          contrastColor: '{primary.950}',
          hoverColor: '{primary.200}',
          activeColor: '{primary.100}',
        },
      },
    },
  },
})

export const primeVueOptions: PrimeVueConfiguration = {
  ripple: true,
  theme: {
    preset: AppPreset,
    options: {
      darkModeSelector: `.${DARK_MODE_CLASS}`,
      cssLayer: {
        name: 'primevue',
        order: 'reset, primevue, app',
      },
    },
  },
}
