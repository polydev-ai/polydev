'use client'

import { motion, type Variants } from 'framer-motion'
import { ReactNode } from 'react'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  }
}

const orbVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.3, 0.5, 0.3],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

interface AnimatedDashboardProps {
  children: ReactNode
}

export default function AnimatedDashboard({ children }: AnimatedDashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <motion.div
        className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-3xl opacity-30"
        variants={orbVariants}
        animate="animate"
      />
      <motion.div
        className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-pink-100 to-orange-100 rounded-full blur-3xl opacity-30"
        variants={orbVariants}
        animate="animate"
        transition={{ delay: 1 }}
      />

      <motion.div
        className="relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {children}
      </motion.div>
    </div>
  )
}

export function AnimatedCard({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      variants={itemVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
}
