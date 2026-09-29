"use client";

import { motion, useReducedMotion } from "motion/react";

import { CopineAvatar } from "@/components/illustrations/copine-avatar";
import { cn } from "@/lib/utils/cn";

export function CoachBubble({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={cn("flex items-end gap-3", className)}>
      <CopineAvatar size={40} />
      <motion.div
        initial={reducedMotion ? false : { y: 4, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="min-w-0 max-w-[80%] rounded-lg rounded-bl-[4px] bg-lilas px-4 py-3 text-[15px] break-words whitespace-pre-wrap text-ink"
      >
        {children}
      </motion.div>
    </div>
  );
}
