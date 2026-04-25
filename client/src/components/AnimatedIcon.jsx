import { motion, useReducedMotion } from 'framer-motion';

const animateByPreset = {
  'soft-pulse': {
    animate: {
      scale: [1, 1.08, 1],
      opacity: [1, 0.85, 1]
    },
    transition: {
      duration: 2.8,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  'countdown-pulse': {
    animate: {
      scale: [1, 1.12, 1],
      rotate: [0, -3, 0, 3, 0]
    },
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  'attention-wiggle': {
    animate: {
      rotate: [0, -7, 7, -4, 0]
    },
    transition: {
      duration: 1.4,
      repeat: Infinity,
      repeatDelay: 2.4,
      ease: 'easeInOut'
    }
  },
  'flame-flicker': {
    animate: {
      scale: [1, 1.06, 0.98, 1.08, 1],
      y: [0, -1.5, 0, -2.5, 0],
      rotate: [0, -2, 2, -1, 0],
      opacity: [0.92, 1, 0.9, 1, 0.94]
    },
    transition: {
      duration: 1.6,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  'flame-flicker-strong': {
    animate: {
      scale: [1, 1.14, 0.94, 1.18, 1],
      y: [0, -3, 0, -4.5, 0],
      rotate: [0, -5, 5, -2.5, 0],
      opacity: [0.85, 1, 0.82, 1, 0.9]
    },
    transition: {
      duration: 1.1,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  'bell-ring': {
    animate: {
      rotate: [0, 0, -12, 12, -8, 8, 0],
      y: [0, 0, -1, 0, -1, 0, 0]
    },
    transition: {
      duration: 1.35,
      repeat: Infinity,
      repeatDelay: 2.2,
      ease: 'easeInOut'
    }
  },
  'trophy-pop': {
    animate: {
      scale: [1, 1.12, 1],
      y: [0, -2, 0]
    },
    transition: {
      duration: 2.1,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  'orbit-drift': {
    animate: {
      x: [0, 1.5, 0, -1.5, 0],
      y: [0, -1.5, 0, 1.5, 0],
      rotate: [0, 4, 0, -4, 0]
    },
    transition: {
      duration: 3.2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

export default function AnimatedIcon({
  icon: Icon,
  size = 18,
  className = '',
  iconClassName = '',
  preset = '',
  active = false,
  hover = true
}) {
  const reducedMotion = useReducedMotion();
  const presetMotion = !reducedMotion && active && preset ? animateByPreset[preset] : null;

  return (
    <motion.span
      className={`inline-flex items-center justify-center ${className}`}
      whileHover={hover && !reducedMotion ? { y: -2, scale: 1.06 } : undefined}
      whileTap={!reducedMotion ? { scale: 0.96 } : undefined}
      animate={presetMotion?.animate}
      transition={presetMotion?.transition}
    >
      <Icon size={size} className={iconClassName} />
    </motion.span>
  );
}
