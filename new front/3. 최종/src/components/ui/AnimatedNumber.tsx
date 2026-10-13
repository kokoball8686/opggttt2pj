"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  refreshKey: string | number;
  decimals?: number;
  formatValue?: (value: number) => string;
};

export function useAnimatedNumber(
  value: number,
  refreshKey: string | number,
  decimals = 0,
) {
  const [displayValue, setDisplayValue] = useState(value);
  const displayValueRef = useRef(value);
  const previous = useRef({ value, refreshKey });

  useEffect(() => {
    const previousValue = previous.current.value;
    const shouldAnimate =
      previous.current.refreshKey !== refreshKey && previousValue !== value;
    previous.current = { value, refreshKey };
    if (previousValue === value) return;

    const startValue = displayValueRef.current;
    const startTime = performance.now();
    let frame = 0;

    const update = (now: number) => {
      const progress = Math.min((now - startTime) / 650, 1);
      const eased = shouldAnimate ? 1 - (1 - progress) ** 3 : 1;
      const nextValue = startValue + (value - startValue) * eased;
      const precision = 10 ** decimals;
      const roundedValue = Math.round(nextValue * precision) / precision;
      if (roundedValue !== displayValueRef.current) {
        displayValueRef.current = roundedValue;
        setDisplayValue(roundedValue);
      }

      if (progress < 1) {
        frame = requestAnimationFrame(update);
      } else if (displayValueRef.current !== value) {
        displayValueRef.current = value;
        setDisplayValue(value);
      }
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [decimals, refreshKey, value]);

  return displayValue;
}

export function AnimatedNumber({
  value,
  refreshKey,
  decimals = 0,
  formatValue,
}: AnimatedNumberProps) {
  const displayValue = useAnimatedNumber(value, refreshKey, decimals);
  const formattedValue = formatValue
    ? formatValue(displayValue)
    : new Intl.NumberFormat(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(displayValue);

  return <span className="tabular-nums">{formattedValue}</span>;
}
