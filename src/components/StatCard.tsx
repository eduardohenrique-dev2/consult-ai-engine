import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "accent" | "success" | "warning" | "critical";
}

const variantStyles = {
  default: "border-border/40 hover:border-primary/30",
  accent: "border-accent/20 hover:border-accent/40",
  success: "border-success/20 hover:border-success/40",
  warning: "border-warning/20 hover:border-warning/40",
  critical: "border-critical/20 hover:border-critical/40",
};

const iconVariants = {
  default: "text-primary bg-primary/10",
  accent: "text-accent bg-accent/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  critical: "text-critical bg-critical/10",
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`card-gradient rounded-xl border p-6 transition-all duration-300 hover:shadow-lg ${variantStyles[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          {trend && <p className="text-[11px] text-success font-medium">{trend}</p>}
        </div>
        <div className={`p-3 rounded-xl ${iconVariants[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
