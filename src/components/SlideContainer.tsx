import { ReactNode } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';

interface SlideContainerProps {
  currentStep: number;
  direction: number; // 1 = forward, -1 = backward
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const variants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
    scale: 0.98
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: 'spring', stiffness: 350, damping: 32 },
      opacity: { duration: 0.25 },
      scale: { duration: 0.2 }
    }
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -120 : 120,
    opacity: 0,
    scale: 0.98,
    transition: {
      x: { type: 'spring', stiffness: 350, damping: 32 },
      opacity: { duration: 0.2 }
    }
  })
};

export function SlideContainer({
  currentStep,
  direction,
  children,
  onSwipeLeft,
  onSwipeRight
}: SlideContainerProps) {
  // Mobile touch gesture handler
  let touchStartX = 0;
  let touchStartY = 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Only trigger if horizontal swipe is dominant and exceeds 50px
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // Swiped Left -> go to Next
        onSwipeLeft?.();
      } else {
        // Swiped Right -> go to Previous
        onSwipeRight?.();
      }
    }
  };

  return (
    <div
      id="slide-touch-area"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full flex-1 flex flex-col items-center justify-center relative overflow-hidden py-4 px-4 sm:px-6"
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="w-full flex justify-center"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
