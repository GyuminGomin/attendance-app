import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import type { ThemeDefinition } from 'vuetify'

const attendanceTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#F3F4F6',
    surface: '#FFFFFF',
    primary: '#4F46E5',
    secondary: '#7C3AED',
    success: '#16A34A',
    warning: '#FACC15',
    error: '#DC2626',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'attendanceTheme',
    themes: {
      attendanceTheme,
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
})

