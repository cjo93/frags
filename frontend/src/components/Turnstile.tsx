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
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

/**
 * Cloudflare Turnstile CAPTCHA widget.
 * 
 * Only renders if NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 * Fails open if the widget fails to load.
 */
export function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  className = '',
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState(false);

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
        callback: onVerify,
        'error-callback': () => {
          setLoadError(true);
          // On error, call onVerify with empty string to allow form submission
          // Backend will handle missing token appropriately
          onError?.();
        },
        'expired-callback': () => {
          onExpire?.();
        },
        theme,
        retry: 'auto',
        'retry-interval': 5000,
      });
    } catch (err) {
      console.error('Turnstile render error:', err);
      setLoadError(true);
    }
  }, [siteKey, onVerify, onError, onExpire, theme]);

  useEffect(() => {
    // Timeout to detect if script fails to load
    const timeout = setTimeout(() => {
      if (!window.turnstile) {
        console.warn('Turnstile script failed to load');
        setLoadError(true);
      }
    }, 10000);

    // Check if Turnstile script is already loaded
    if (window.turnstile) {
      clearTimeout(timeout);
      renderWidget();
      return () => {
        if (widgetIdRef.current && window.turnstile) {
          try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        }
      };
    }

    // Set up callback for when script loads
    window.onTurnstileLoad = () => {
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
        console.error('Failed to load Turnstile script');
        setLoadError(true);
      };
      document.head.appendChild(script);
    }

    return () => {
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
  }, [renderWidget]);

  // If load error, show nothing - form will work without captcha
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
