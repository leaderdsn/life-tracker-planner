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
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.color}',
      offset: '2px',
      shadow: 'none',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f8f6fb',
          100: '#f3f0f8',
          200: '#ebe6f1',
          300: '#d8d2e4',
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
          200: '#b3aecd',
          300: '#8f89ad',
          400: '#6d678f',
          500: '#4f4977',
          600: '#403b66',
          700: '#2e2a4b',
          800: '#1b1930',
          900: '#121022',
          950: '#0c0a18',
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
  components: {
    button: {
      root: {
        borderRadius: '{border.radius.md}',
        paddingX: '1rem',
        paddingY: '0.5rem',
        sm: { paddingX: '0.875rem', paddingY: '0.375rem' },
      },
    },
    dialog: {
      root: { borderRadius: '1.25rem' },
      title: { fontSize: '1.5rem', fontWeight: '750' },
    },
    toggleswitch: {
      root: { width: '2.75rem', height: '1.5rem' },
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
