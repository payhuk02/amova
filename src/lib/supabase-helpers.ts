import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type BoostInsert = TablesInsert<"boosts">;
export type LikeInsert = TablesInsert<"likes">;
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
export type CallSignalInsert = TablesInsert<"call_signals">;
export type SpeedDatingQueueInsert = TablesInsert<"speed_dating_queue">;
export type SpeedDatingQueueUpdate = TablesUpdate<"speed_dating_queue">;

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Une erreur est survenue";
}
