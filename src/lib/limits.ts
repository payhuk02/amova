export function getLimitErrorMessage(error: { message?: string } | null): string | null {
  const msg = error?.message ?? "";
  if (msg.includes("daily_swipe_limit_reached")) {
    return "Limite de swipes atteinte pour aujourd'hui. Passez Premium pour continuer.";
  }
  if (msg.includes("daily_super_like_limit_reached")) {
    return "Limite de Super Likes atteinte pour aujourd'hui.";
  }
  if (msg.includes("daily_boost_limit_reached")) {
    return "Limite de boosts atteinte pour aujourd'hui.";
  }
  if (msg.includes("incognito_requires_vip")) {
    return "Le mode incognito est réservé au plan VIP.";
  }
  return null;
}
