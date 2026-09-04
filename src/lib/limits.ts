export function getLimitErrorMessage(error: { message?: string } | null): string | null {
  const msg = error?.message ?? "";
  if (msg.includes("daily_swipe_limit_reached")) {
    return "Limite de swipes atteinte pour aujourd'hui. Passez Plus ou Premium pour continuer.";
  }
  if (msg.includes("daily_super_like_limit_reached")) {
    return "Limite de Super Likes atteinte pour aujourd'hui.";
  }
  if (msg.includes("daily_boost_limit_reached")) {
    return "Limite de boosts atteinte pour aujourd'hui.";
  }
  if (msg.includes("daily_message_limit_reached")) {
    return "Limite de messages gratuits atteinte (15/jour). Passez Plus pour écrire sans limite.";
  }
  if (msg.includes("incognito_requires_vip")) {
    return "Le mode incognito est réservé au plan VIP.";
  }
    if (msg.includes("vip_weekly_spotlight_already_claimed")) {
      return "Spotlight VIP déjà utilisé cette semaine. Revenez dans quelques jours.";
    }
    if (msg.includes("vip_spotlight_requires_vip")) {
      return "Le Spotlight hebdomadaire gratuit est réservé au plan VIP.";
    }
    if (msg.includes("gender_locked")) {
      return "Le genre ne peut plus être modifié après validation.";
    }
    if (msg.includes("date_of_birth_locked")) {
      return "La date de naissance ne peut plus être modifiée après validation.";
    }
    if (msg.includes("must_be_18_or_older")) {
      return "Amova est réservé aux personnes majeures (18 ans et plus).";
    }
    return null;
}
