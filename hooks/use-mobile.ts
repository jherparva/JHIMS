import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isMobile
}

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine)
  const [lastChecked, setLastChecked] = React.useState<Date>(new Date())

  React.useEffect(() => {
    // Verificar conexión real con ping al servidor
    const checkRealConnection = async () => {
      try {
        // Intentar conectar con el servidor
        const response = await fetch('/', { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(2000)
        })
        if (response.ok) {
          setIsOnline(true)
        }
      } catch (error) {
        // Si falla el fetch, verificar si navigator.onLine dice que estamos online
        if (navigator.onLine) {
          // Podría ser un problema temporal, mantener online
          setIsOnline(true)
        } else {
          setIsOnline(false)
        }
      }
      setLastChecked(new Date())
    }

    // Verificar conexión inicial
    checkRealConnection()

    // Escuchar eventos del navegador
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verificar periódicamente
    const interval = setInterval(checkRealConnection, 10000) // cada 10 segundos

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return { isOnline, lastChecked }
}
