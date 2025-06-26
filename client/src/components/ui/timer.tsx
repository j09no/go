import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TimerProps {
  initialTime: number; // in seconds
  onTimeUp?: () => void;
  className?: string;
  isRunning?: boolean;
}

export function Timer({ initialTime, onTimeUp, className, isRunning = true }: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, onTimeUp, isRunning]);

  useEffect(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isLowTime = timeRemaining <= 60;

  return (
    <span className={cn(
      "font-bold transition-colors",
      isLowTime ? "text-red-400" : "text-orange-400",
      className
    )}>
      {timeString}
    </span>
  );
}
