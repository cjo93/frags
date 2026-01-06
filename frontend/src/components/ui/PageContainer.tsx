import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  /** Maximum width constraint */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  /** Apply safe-area padding */
  safeArea?: boolean;
}

/**
 * Consistent page container with proper spacing and max-width.
 * Use for auth pages (sm), dashboards (lg), etc.
 */
export function PageContainer({ 
  children, 
  size = "md", 
  className,
  safeArea = false 
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-6",
        {
          "max-w-sm": size === "sm",
          "max-w-md": size === "md",
          "max-w-2xl": size === "lg",
          "max-w-4xl": size === "xl",
          "max-w-full": size === "full",
        },
        safeArea && "safe-x",
        className
      )}
    >
      {children}
    </div>
  );
}
