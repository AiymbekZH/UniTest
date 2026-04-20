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
