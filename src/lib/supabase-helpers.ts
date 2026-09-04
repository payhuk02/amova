import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type BoostInsert = TablesInsert<"boosts">;
export type LikeInsert = TablesInsert<"likes">;
export type PassInsert = TablesInsert<"profile_passes">;
export type ProfileUpdate = TablesUpdate<"profiles">;
export type BlockedUserInsert = TablesInsert<"blocked_users">;
export type ReportInsert = TablesInsert<"reports">;
export type StoryInsert = TablesInsert<"stories">;
export type StoryViewInsert = TablesInsert<"story_views">;
export type EventInsert = TablesInsert<"events">;
export type EventAttendeeInsert = TablesInsert<"event_attendees">;
export type MessageReactionInsert = TablesInsert<"message_reactions">;
export type MessageReactionUpdate = TablesUpdate<"message_reactions">;
export type VerificationRequestInsert = TablesInsert<"verification_requests">;
export type MessageInsert = TablesInsert<"messages">;
export type CallSignalInsert = TablesInsert<"call_signals">;
export type SpeedDatingQueueInsert = TablesInsert<"speed_dating_queue">;
export type SpeedDatingQueueUpdate = TablesUpdate<"speed_dating_queue">;

export function getErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "";

  const msg = raw.toLowerCase();

  if (msg.includes("email rate limit") || msg.includes("over_email_send_rate_limit")) {
    return "Trop d'e-mails envoyés. Réessayez dans environ 1 heure, ou connectez-vous avec Google.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Trop de tentatives. Patientez quelques minutes puis réessayez.";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Un compte existe déjà avec cet e-mail. Connectez-vous ou réinitialisez le mot de passe.";
  }
  if (msg.includes("invalid login credentials")) {
    return "E-mail ou mot de passe incorrect.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirmez votre e-mail avant de vous connecter, ou réessayez dans quelques minutes.";
  }

  if (raw) return raw;
  return "Une erreur est survenue";
}
