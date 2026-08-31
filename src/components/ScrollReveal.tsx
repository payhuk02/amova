import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "fade";
}

const ScrollReveal = forwardRef<HTMLDivElement, ScrollRevealProps>(
  ({ children, className = "", delay = 0, direction = "up" }, _ref) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        },
        { threshold: 0.15 }
      );

      if (innerRef.current) observer.observe(innerRef.current);
      return () => observer.disconnect();
    }, []);

    const transforms = {
      up: "translateY(20px)",
      left: "translateX(-20px)",
      right: "translateX(20px)",
      fade: "translateY(0)",
    };

    return (
      <div
        ref={innerRef}
        className={className}
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translate(0)" : transforms[direction],
          filter: isVisible ? "blur(0)" : "blur(4px)",
          transition: `all 700ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        }}
      >
        {children}
      </div>
    );
  }
);

ScrollReveal.displayName = "ScrollReveal";

export default ScrollReveal;
