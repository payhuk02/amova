import { Loader2 } from "lucide-react";

interface Props {
  pullDistance: number;
  isRefreshing: boolean;
}

const PullToRefreshIndicator = ({ pullDistance, isRefreshing }: Props) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all duration-200"
      style={{ height: isRefreshing ? 48 : pullDistance }}
    >
      <div
        className={`w-8 h-8 flex items-center justify-center ${isRefreshing ? "animate-spin" : ""}`}
        style={{
          opacity: Math.min(1, pullDistance / 60),
          transform: `rotate(${pullDistance * 3}deg)`,
        }}
      >
        <Loader2 size={20} className="text-primary" />
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;
