import { Star } from "lucide-react";

interface SuperLikeButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const SuperLikeButton = ({ onClick, disabled }: SuperLikeButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-14 h-14 rounded-full border-2 border-blue-400/50 flex items-center justify-center text-blue-400 hover:border-blue-400 hover:bg-blue-400/10 transition-all duration-200 active:scale-95 hover:shadow-lg hover:shadow-blue-400/10 disabled:opacity-40 disabled:pointer-events-none"
    >
      <Star size={22} strokeWidth={2.5} className="fill-current" />
    </button>
  );
};

export default SuperLikeButton;
