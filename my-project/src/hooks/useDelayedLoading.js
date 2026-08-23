import { useState, useEffect } from 'react'

export function useDelayedLoading(loading, delay = 1500) {
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    if (!loading) return

    const timer = setTimeout(() => {
      setShowLoader(true)
    }, delay)

    return () => {
      clearTimeout(timer)
      setShowLoader(false)
    }
  }, [loading, delay])

  return loading && showLoader
}
