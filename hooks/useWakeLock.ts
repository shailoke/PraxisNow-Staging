'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Custom hook to manage Screen Wake Lock API
 * Prevents screen from sleeping during active sessions
 */
export function useWakeLock() {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null)
    const [isLocked, setIsLocked] = useState(false)
    const isActiveRef = useRef(false)

    const requestWakeLock = useCallback(async () => {
        // Check if Wake Lock API is supported
        if (!('wakeLock' in navigator)) {
            console.warn('[WAKE_LOCK] API not supported, continuing without wake lock')
            return
        }

        try {
            // Request wake lock
            const wakeLock = await navigator.wakeLock.request('screen')
            wakeLockRef.current = wakeLock
            isActiveRef.current = true
            setIsLocked(true)
            console.log('[WAKE_LOCK] Acquired successfully')

            // Listen for release (can happen if tab becomes hidden)
            wakeLock.addEventListener('release', () => {
                console.log('[WAKE_LOCK] Released by system')
                setIsLocked(false)
            })
        } catch (err: any) {
            console.warn('[WAKE_LOCK] Failed to acquire:', err.message)
            // Don't throw - gracefully continue without wake lock
        }
    }, [])

    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release()
                wakeLockRef.current = null
                isActiveRef.current = false
                setIsLocked(false)
                console.log('[WAKE_LOCK] Released')
            } catch (err: any) {
                console.warn('[WAKE_LOCK] Failed to release:', err.message)
            }
        }
    }, [])

    // Handle visibility changes - re-acquire wake lock when tab becomes visible again
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && isActiveRef.current && !wakeLockRef.current) {
                console.log('[WAKE_LOCK] Re-acquiring after visibility change')
                await requestWakeLock()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [requestWakeLock])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wakeLockRef.current) {
                wakeLockRef.current.release()
                wakeLockRef.current = null
                isActiveRef.current = false
            }
        }
    }, [])

    return {
        requestWakeLock,
        releaseWakeLock,
        isLocked
    }
}
