import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  /** Helper text shown below input */
  helperText?: string;
}

/**
 * Consistent input component with proper iOS behavior and enhanced animations.
 * Uses 16px font-size to prevent iOS zoom on focus.
 * Supports error state and helper text.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          type={type}
          className={cn(
            // Base styles - 16px font-size prevents iOS zoom
            "w-full px-4 py-3 text-base",
            "bg-white dark:bg-neutral-900",
            "text-neutral-900 dark:text-white",
            "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
            "border rounded-lg",
            "transition-all duration-200 ease-out",
            
            // Focus styles with smooth animation
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            
            // Normal vs error states
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-neutral-200 dark:border-neutral-800 focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-neutral-900/5 dark:focus:ring-white/5",
            
            // Disabled state
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:disabled:bg-neutral-800",
            
            // Minimum height for tap target
            "min-h-[44px]",
            
            className
          )}
          {...props}
        />
        {helperText && (
          <p
            className={cn(
              "mt-1.5 text-sm transition-colors duration-200",
              error ? "text-red-500" : "text-neutral-500 dark:text-neutral-400"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  helperText?: string;
}

/**
 * Consistent textarea component with proper iOS behavior and enhanced animations.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            // Base styles - 16px font-size prevents iOS zoom
            "w-full px-4 py-3 text-base resize-none",
            "bg-white dark:bg-neutral-900",
            "text-neutral-900 dark:text-white",
            "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
            "border rounded-lg",
            "transition-all duration-200 ease-out",
            
            // Focus styles with smooth animation
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            
            // Normal vs error states
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-neutral-200 dark:border-neutral-800 focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-neutral-900/5 dark:focus:ring-white/5",
            
            // Disabled state
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:disabled:bg-neutral-800",
            
            // Minimum height
            "min-h-[88px]",
            
            className
          )}
          {...props}
        />
        {helperText && (
          <p
            className={cn(
              "mt-1.5 text-sm transition-colors duration-200",
              error ? "text-red-500" : "text-neutral-500 dark:text-neutral-400"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
