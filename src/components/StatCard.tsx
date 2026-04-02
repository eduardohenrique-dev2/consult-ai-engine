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
  default: "border-border/30 hover:border-primary/40 hover:shadow-primary/5",
  accent: "border-accent/20 hover:border-accent/40 hover:shadow-accent/5",
  success: "border-success/20 hover:border-success/40 hover:shadow-success/5",
  warning: "border-warning/20 hover:border-warning/40 hover:shadow-warning/5",
  critical: "border-critical/20 hover:border-critical/40 hover:shadow-critical/5",
};

const iconVariants = {
  default: "text-primary bg-primary/10",
  accent: "text-accent bg-accent/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  critical: "text-critical bg-critical/10",
};

const glowVariants = {
  default: "drop-shadow-[0_0_8px_hsl(245,80%,65%,0.3)]",
  accent: "drop-shadow-[0_0_8px_hsl(200,100%,60%,0.3)]",
  success: "drop-shadow-[0_0_8px_hsl(145,65%,48%,0.3)]",
  warning: "drop-shadow-[0_0_8px_hsl(38,92%,55%,0.3)]",
  critical: "drop-shadow-[0_0_8px_hsl(0,80%,58%,0.3)]",
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      className={`glass rounded-2xl border p-5 transition-all duration-300 hover:shadow-xl cursor-default ${variantStyles[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
          <p className={`text-3xl font-extrabold tracking-tight ${glowVariants[variant]}`}>{value}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground/80">{subtitle}</p>}
          {trend && <p className="text-[10px] text-success font-semibold">{trend}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${iconVariants[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
