/**
 * @file useTimer.js
 * @description Custom React hook for a countdown timer with question expiry support.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * @param {number} seconds - Duration in seconds
 * @param {function} onExpire - Callback when timer reaches zero
 * @returns {{ timeLeft, percentLeft, isExpired, resetTimer, stopTimer }}
 */
export function useTimer(seconds, onExpire) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const startTimer = useCallback((initialSeconds) => {
    clearInterval(intervalRef.current);
    setTimeLeft(initialSeconds);
    setIsExpired(false);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsExpired(true);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(intervalRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    startTimer(seconds);
  }, [seconds, startTimer]);

  useEffect(() => {
    if (seconds > 0) startTimer(seconds);
    return () => clearInterval(intervalRef.current);
  }, [seconds, startTimer]);

  const percentLeft = seconds > 0 ? Math.round((timeLeft / seconds) * 100) : 0;

  return { timeLeft, percentLeft, isExpired, resetTimer, stopTimer };
}

