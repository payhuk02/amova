import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { differenceInDays, parseISO } from "date-fns";
import { Crown } from "lucide-react";

export default function SubscriptionBanner() {
  const { subscription, currentPlan, isExpired } = useSubscription();

  if (!subscription?.expires_at) return null;

  const daysLeft = differenceInDays(parseISO(subscription.expires_at), new Date());
  const wasPremium =
    subscription.plan === "plus" ||
    subscription.plan === "premium" ||
    subscription.plan === "vip";

  if (isExpired && wasPremium) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5">
        <div className="container flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left text-sm">
          <Crown size={16} className="text-destructive shrink-0 hidden sm:block" />
          <p className="text-foreground/90">Votre abonnement a expiré.</p>
          <Link
            to="/premium?renew=1"
            className="text-destructive font-medium hover:underline text-xs sm:text-sm"
          >
            Renouveler →
          </Link>
        </div>
      </div>
    );
  }

  if (currentPlan === "free" || daysLeft > 7) return null;

  return (
    <div className="bg-champagne/10 border-b border-champagne/20 px-4 py-2.5">
      <div className="container flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left text-sm">
        <Crown size={16} className="text-champagne shrink-0 hidden sm:block" />
        <p className="text-foreground/90">
          Votre abonnement {currentPlan.toUpperCase()} expire dans {daysLeft} jour{daysLeft > 1 ? "s" : ""}.
        </p>
        <Link
          to="/premium?renew=1"
          className="text-champagne font-medium hover:underline text-xs sm:text-sm"
        >
          Renouveler →
        </Link>
      </div>
    </div>
  );
}
