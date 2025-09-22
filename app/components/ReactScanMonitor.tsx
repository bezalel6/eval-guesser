'use client'

import { useEffect } from 'react'

export default function ReactScanMonitor() {
  useEffect(() => {
    const loadReactScan = async () => {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        try {
          const { scan } = await import('react-scan')
          scan({
            enabled: true,
            log: false, // Set to true to see console logs of re-renders
            showToolbar: true, // Shows the floating toolbar
            includeChildren: true,
            playSound: false, // Set to true to hear sound on re-renders
          } as Parameters<typeof scan>[0])
        } catch (error) {
          console.error('Failed to load react-scan:', error)
        }
      }
    }
    
    loadReactScan()
  }, [])

  return null
}