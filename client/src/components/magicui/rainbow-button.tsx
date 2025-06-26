
import * as React from "react";
import { cn } from "@/lib/utils";

interface RainbowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline";
  children: React.ReactNode;
}

const RainbowButton = React.forwardRef<HTMLButtonElement, RainbowButtonProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative inline-flex h-11 animate-rainbow cursor-pointer items-center justify-center rounded-xl border-0 bg-[length:200%] px-8 py-2 font-medium text-primary-foreground transition-colors [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.08*1rem)_solid_transparent]",
          variant === "default" && "bg-[linear-gradient(#121213,#121213),conic-gradient(from_180deg,#ff7a00,#ffd700,#00ff00,#00ffff,#0080ff,#8000ff,#ff0080,#ff7a00)] shadow-2xl",
          variant === "outline" && "bg-[linear-gradient(#000,#000),conic-gradient(from_180deg,#ff7a00,#ffd700,#00ff00,#00ffff,#0080ff,#8000ff,#ff0080,#ff7a00)]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

RainbowButton.displayName = "RainbowButton";

export { RainbowButton };
