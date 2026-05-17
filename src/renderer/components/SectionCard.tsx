import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/renderer/lib/utils";

interface SectionCardProps {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  icon?: LucideIcon;
  label?: string;
  title: string;
}

export const SectionCard = ({
  action,
  children,
  className,
  contentClassName,
  icon: Icon,
  label,
  title,
}: SectionCardProps) => (
  <section className={cn("section-card", className)}>
    <header className="section-card-header">
      {Icon && (
        <Icon className="section-card-icon" size={15} aria-hidden="true" />
      )}
      <div className="section-card-title">
        {label && <span className="ctrl-section-label">{label}</span>}
        <h2>{title}</h2>
      </div>
      {action && <div className="section-card-action">{action}</div>}
    </header>
    <div className={cn("section-card-content", contentClassName)}>
      {children}
    </div>
  </section>
);
