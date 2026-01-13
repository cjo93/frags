import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

/**
 * Consistent button component with proper tap targets (44px min height).
 * Supports loading state, variants, and sizes with enhanced animations.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          // Base styles with enhanced transitions
          "inline-flex items-center justify-center font-medium rounded-full",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "-webkit-tap-highlight-color-transparent",
          "active:scale-[0.97]",
          "shadow-sm hover:shadow-md",
          
          // Size variants - all meet 44px minimum tap target
          {
            "h-9 px-3 text-sm min-h-[44px]": size === "sm",
            "h-11 px-4 text-sm min-h-[44px]": size === "md",
            "h-12 px-6 text-base min-h-[44px]": size === "lg",
          },
          
          // Color variants with enhanced hover states
          {
            // Primary - solid dark with smooth hover
            "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200":
              variant === "primary",
            // Secondary - outlined with subtle background on hover
            "border border-neutral-200 dark:border-neutral-700 bg-transparent text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-600":
              variant === "secondary",
            // Ghost - minimal with smooth transition
            "bg-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white":
              variant === "ghost",
            // Danger - red with enhanced feedback
            "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700":
              variant === "danger",
          },
          
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
