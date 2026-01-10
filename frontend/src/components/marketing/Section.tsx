import { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export default function Section({ children, className = '', id }: SectionProps) {
  return (
    <section id={id} className={`max-w-5xl mx-auto px-6 ${className}`}>
      {children}
    </section>
  );
}
