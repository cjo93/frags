'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  retry?: 'auto' | 'never';
  'retry-interval'?: number;
}

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  onLoad?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

/**
 * Cloudflare Turnstile CAPTCHA widget.
 * 
 * Only renders if NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 * Fails open if the widget fails to load (calls onError).
 */
export function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
  onLoad,
  theme = 'auto',
  className = '',
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const hasCalledOnLoad = useRef(false);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;
    
    // Remove existing widget if any
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Ignore removal errors
      }
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => {
          // Widget successfully rendered and verified
          if (!hasCalledOnLoad.current) {
            hasCalledOnLoad.current = true;
            onLoad?.();
          }
          onVerify(token);
        },
        'error-callback': () => {
          setLoadError(true);
          onError?.();
        },
        'expired-callback': () => {
          onExpire?.();
        },
        theme,
        retry: 'auto',
        'retry-interval': 5000,
      });
      
      // Widget rendered successfully (even if not yet verified)
      if (!hasCalledOnLoad.current) {
        hasCalledOnLoad.current = true;
        onLoad?.();
      }
    } catch (err) {
      console.error('Turnstile render error:', err);
      setLoadError(true);
      onError?.();
    }
  }, [siteKey, onVerify, onError, onExpire, onLoad, theme]);

  useEffect(() => {
    let mounted = true;
    
    // Timeout to detect if script fails to load (5s is more reasonable)
    const timeout = setTimeout(() => {
      if (mounted && !window.turnstile) {
        console.warn('Turnstile script failed to load within timeout');
        setLoadError(true);
        onError?.();
      }
    }, 5000);

    // Check if Turnstile script is already loaded
    if (window.turnstile) {
      clearTimeout(timeout);
      renderWidget();
      return () => {
        mounted = false;
        if (widgetIdRef.current && window.turnstile) {
          try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        }
      };
    }

    // Set up callback for when script loads
    window.onTurnstileLoad = () => {
      if (!mounted) return;
      clearTimeout(timeout);
      renderWidget();
    };

    // Load Turnstile script if not already present
    const existingScript = document.querySelector('script[src*="turnstile"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        if (!mounted) return;
        console.error('Failed to load Turnstile script');
        setLoadError(true);
        onError?.();
      };
      document.head.appendChild(script);
    }

    return () => {
      mounted = false;
      clearTimeout(timeout);
      // Cleanup widget on unmount
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore
        }
      }
    };
  }, [renderWidget, onError]);

  // If load error, show nothing - form will work without captcha (fail open)
  if (loadError) {
    return null;
  }

  return <div ref={containerRef} className={className} />;
}

/**
 * Check if Turnstile is enabled (site key is configured).
 */
export function isTurnstileEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

/**
 * Get the Turnstile site key from environment.
 */
export function getTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
}
