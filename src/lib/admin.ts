export interface AdminStats {
  users_count: number;
  reports_pending: number;
  likes_count: number;
  messages_count: number;
  matches_count: number;
  events_count: number;
  stories_active: number;
  verifications_pending: number;
  payments_paid: number;
  revenue_total: number;
  premium_users: number;
  speed_dating_active: number;
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  failed: "Échoué",
  cancelled: "Annulé",
  approved: "Approuvé",
  rejected: "Rejeté",
  resolved: "Résolu",
  active: "Actif",
  exhausted: "Crédits épuisés",
  error: "Erreur",
  waiting: "En attente",
  matched: "Matché",
};

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
    case "waiting":
      return "bg-orange-500/20 text-orange-500";
    case "paid":
    case "approved":
    case "resolved":
    case "active":
    case "matched":
      return "bg-emerald-500/20 text-emerald-500";
    case "exhausted":
      return "bg-amber-500/20 text-amber-500";
    case "error":
    case "failed":
    case "rejected":
    case "cancelled":
      return "bg-red-500/20 text-red-500";
    default:
      return "bg-secondary text-muted-foreground";
  }
}

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}
