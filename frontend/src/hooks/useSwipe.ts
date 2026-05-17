import { useState, useCallback, useRef, type TouchEvent, type MouseEvent } from 'react';

interface SwipeState {
  currentPage: number;
  totalPages: number;
  isSwiping: boolean;
  swipeOffset: number;
}

interface SwipeHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseDown: (e: MouseEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}

interface UseSwipeReturn extends SwipeState {
  handlers: SwipeHandlers;
  goToPage: (pageIndex: number) => void;
}

interface UseSwipeOptions {
  totalPages: number;
  threshold?: number;
  initialPage?: number;
}

export function useSwipe({
  totalPages,
  threshold = 50,
  initialPage = 0,
}: UseSwipeOptions): UseSwipeReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const startX = useRef(0);
  const isDragging = useRef(false);

  const goToPage = useCallback(
    (pageIndex: number) => {
      const clampedIndex = Math.max(0, Math.min(pageIndex, totalPages - 1));
      setCurrentPage(clampedIndex);
      setSwipeOffset(0);
    },
    [totalPages]
  );

  const handleStart = useCallback((clientX: number) => {
    startX.current = clientX;
    isDragging.current = true;
    setIsSwiping(true);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging.current) return;

    const diff = clientX - startX.current;

    // Apply resistance at boundaries
    const isAtStart = currentPage === 0 && diff > 0;
    const isAtEnd = currentPage === totalPages - 1 && diff < 0;

    if (isAtStart || isAtEnd) {
      // Rubber band effect - reduce movement at boundaries
      setSwipeOffset(diff * 0.3);
    } else {
      setSwipeOffset(diff);
    }
  }, [currentPage, totalPages]);

  const handleEnd = useCallback(() => {
    if (!isDragging.current) return;

    isDragging.current = false;
    setIsSwiping(false);

    const diff = swipeOffset;

    if (Math.abs(diff) > threshold) {
      if (diff < 0 && currentPage < totalPages - 1) {
        // Swiped left - go to next page
        setCurrentPage((prev) => prev + 1);
      } else if (diff > 0 && currentPage > 0) {
        // Swiped right - go to previous page
        setCurrentPage((prev) => prev - 1);
      }
    }

    setSwipeOffset(0);
  }, [swipeOffset, threshold, currentPage, totalPages]);

  // Touch event handlers
  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleStart(touch.clientX);
      }
    },
    [handleStart]
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX);
      }
    },
    [handleMove]
  );

  const onTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse event handlers (for desktop testing)
  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      handleStart(e.clientX);
    },
    [handleStart]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientX);
    },
    [handleMove]
  );

  const onMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const onMouseLeave = useCallback(() => {
    if (isDragging.current) {
      handleEnd();
    }
  }, [handleEnd]);

  return {
    currentPage,
    totalPages,
    isSwiping,
    swipeOffset,
    goToPage,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
    },
  };
}
