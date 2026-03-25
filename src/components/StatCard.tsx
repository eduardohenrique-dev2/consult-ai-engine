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
  default: "from-primary/10 to-primary/5 border-primary/20",
  accent: "from-accent/10 to-accent/5 border-accent/20",
  success: "from-success/10 to-success/5 border-success/20",
  warning: "from-warning/10 to-warning/5 border-warning/20",
  critical: "from-critical/10 to-critical/5 border-critical/20",
};

const iconVariants = {
  default: "text-primary bg-primary/15",
  accent: "text-accent bg-accent/15",
  success: "text-success bg-success/15",
  warning: "text-warning bg-warning/15",
  critical: "text-critical bg-critical/15",
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border bg-gradient-to-br p-5 ${variantStyles[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && <p className="text-xs text-success font-medium">{trend}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${iconVariants[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
