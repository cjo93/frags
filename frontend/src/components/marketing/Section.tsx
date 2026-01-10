import { cn } from "@/lib/cn";

type SectionProps = {
  className?: string;
  children: React.ReactNode;
};

export default function Section({ className, children }: SectionProps) {
  return (
    <section className={cn("relative overflow-hidden", className)}>
      <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-32">{children}</div>
    </section>
  );
}
