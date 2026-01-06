"use client";

import { useState, useEffect } from "react";

const DISMISS_KEY = "defrag-install-prompt-dismissed";

function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  
  return isIOS && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check iOS standalone mode
  if ("standalone" in window.navigator) {
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  }
  
  // Check display-mode media query (Android PWA)
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on iOS Safari when not already installed
    if (!isIOSSafari()) return;
    if (isStandalone()) return;
    
    // Check if user previously dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) return;
    
    // Show after a short delay for better UX
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShow(false);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleDismiss}
    >
      <div 
        className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl p-6 shadow-2xl border border-white/10 animate-slide-up safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0a0a0a] flex items-center justify-center border border-white/10">
            <span className="text-3xl font-bold text-white">D</span>
          </div>
        </div>

        {/* Content */}
        <h2 className="text-xl font-semibold text-white text-center mb-2">
          Install Defrag
        </h2>
        <p className="text-sm text-gray-400 text-center mb-4">
          Get a faster, full-screen experience.
        </p>

        {/* Instructions */}
        <div className="bg-black/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-300 text-center">
            Tap{" "}
            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500/20 rounded">
              <ShareIcon className="w-4 h-4 text-blue-400" />
            </span>
            {" "}then <strong className="text-white">&quot;Add to Home Screen&quot;</strong>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDontShowAgain}
            className="flex-1 py-3 px-4 text-sm text-gray-400 hover:text-gray-300 transition-colors tap-target"
          >
            Don&apos;t show again
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 px-4 text-sm font-medium text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors tap-target"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// Safari share icon
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" 
      />
    </svg>
  );
}

// Export a function to manually trigger the prompt (for Settings page)
export function resetInstallPrompt() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(DISMISS_KEY);
  }
}
