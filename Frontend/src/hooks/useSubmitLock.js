import { useCallback, useRef, useState } from "react";

/**
 * useSubmitLock
 * -----------------
 * Ensures a submit handler only runs once at a time.
 * Useful for preventing double submissions when dealing with async actions.
 *
 * Usage:
 * const { isSubmitting, wrapSubmit } = useSubmitLock();
 * const onSubmit = wrapSubmit(async (data) => {...});
 * <form onSubmit={handleSubmit(onSubmit)}>
 *   <Button isLoading={isSubmitting} />
 */
export function useSubmitLock() {
  const lockRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runWithLock = useCallback(async (fn, ...args) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setIsSubmitting(true);
    try {
      return await fn(...args);
    } finally {
      lockRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  const wrapSubmit = useCallback(
    (fn) => {
      return async (...args) => {
        return runWithLock(fn, ...args);
      };
    },
    [runWithLock]
  );

  return {
    isSubmitting,
    wrapSubmit,
    runWithLock,
  };
}


