
-- Attach trigger for notifications on new messages
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_message();

-- Attach trigger for notifications on new likes/matches
CREATE TRIGGER on_new_like_notify
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_match();

-- Enable realtime for notifications table
-- ALREADY ADDED IN PREVIOUS MIGRATION
