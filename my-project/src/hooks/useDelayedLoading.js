import { useState, useEffect } from 'react'

export function useDelayedLoading(loading, delay = 1500) {
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    let timer
    if (loading) {
      timer = setTimeout(() => {
        setShowLoader(true)
      }, delay)
    } else {
      setShowLoader(false)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [loading, delay])

  return showLoader
}
