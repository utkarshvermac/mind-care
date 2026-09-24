"use client"

import { useEffect } from "react"

/** Registers the offline app-shell service worker (public/sw.js). Renders
 * nothing — this is a side-effect-only component, kept separate from
 * app/layout.tsx (a server component) since service worker registration
 * needs the browser's `navigator`. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is a nice-to-have — a failed registration should never break the app */
    })
  }, [])
  return null
}
