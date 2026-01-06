/**
 * Detects if the app is running in standalone/installed mode (PWA).
 * Works on both iOS (navigator.standalone) and Android/desktop (display-mode media query).
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  // iOS Safari standalone mode
  const iosStandalone = 
    "standalone" in window.navigator && 
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  // Modern browsers / Android PWA
  const mediaStandalone = window.matchMedia?.("(display-mode: standalone)").matches;

  return Boolean(iosStandalone || mediaStandalone);
}

/**
 * Detects if the device is iOS (iPhone/iPad/iPod).
 */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return isIOSDevice || isIPadOS;
}

/**
 * Detects if the browser is Safari on iOS.
 */
export function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || 
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);

  return isIOSDevice && isSafari;
}
