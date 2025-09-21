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
            clearLog: false,
            showToolbar: true, // Shows the floating toolbar
            renderCountThreshold: 3, // Highlight components that re-render more than 3 times
            includeChildren: true,
            playSound: false, // Set to true to hear sound on re-renders
            reportOnly: undefined, // Can be set to specific component names to track
            onRender: (fiber: any, render: any) => {
              // Custom callback for each render if needed
              // You can log specific component re-renders here
              if (render.count > 10) {
                console.warn(`Component ${fiber.type?.name || 'Unknown'} re-rendered ${render.count} times`)
              }
            }
          })
        } catch (error) {
          console.error('Failed to load react-scan:', error)
        }
      }
    }
    
    loadReactScan()
  }, [])

  return null
}