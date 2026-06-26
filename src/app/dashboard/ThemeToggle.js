'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('system')

  useEffect(() => {
    const savedTheme = localStorage.getItem('bill-spill-theme') || 'system'
    setTheme(savedTheme)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e) => {
      if (localStorage.getItem('bill-spill-theme') === 'system') {
        document.documentElement.classList.toggle('dark', e.matches)
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const applyTheme = (nextTheme) => {
    setTheme(nextTheme)
    localStorage.setItem('bill-spill-theme', nextTheme)
    
    const isDark = nextTheme === 'dark' || 
      (nextTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    document.documentElement.classList.toggle('dark', isDark)
  }

  return (
    <div className="px-4 py-2 mb-2">
      <div className="theme-toggle-pill">
        <button 
          onClick={() => applyTheme('light')}
          className={theme === 'light' ? 'active' : ''}
          title="Light"
        >
          <i className="ti ti-sun"></i>
        </button>
        <button 
          onClick={() => applyTheme('dark')}
          className={theme === 'dark' ? 'active' : ''}
          title="Dark"
        >
          <i className="ti ti-moon"></i>
        </button>
        <button 
          onClick={() => applyTheme('system')}
          className={theme === 'system' ? 'active' : ''}
          title="System"
        >
          <i className="ti ti-device-desktop"></i>
        </button>
      </div>
    </div>
  )
}
