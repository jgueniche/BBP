"use client";

import { motion, useReducedMotion } from "motion/react";

import {
  KemiaAvatar,
  type KemiaExpression,
} from "@/components/illustrations/kemia-avatar";
import { cn } from "@/lib/utils/cn";

export function CoachBubble({
  children,
  expression = "sourire",
  className,
}: {
  children: React.ReactNode;
  expression?: KemiaExpression;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={cn("flex items-end gap-3", className)}>
      <motion.div
        animate={reducedMotion ? undefined : { scale: [1, 1.03, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <KemiaAvatar expression={expression} size={56} />
      </motion.div>
      <motion.div
        initial={reducedMotion ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="max-w-[80%] rounded-lg rounded-bl-[4px] bg-boutargue px-4 py-3 text-[15px] font-medium text-[#0b0b0b] shadow-soft"
      >
        {children}
      </motion.div>
    </div>
  );
}
