
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  related_user_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime for messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification on match
CREATE OR REPLACE FUNCTION public.notify_on_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reverse_exists boolean;
  liker_name text;
  liked_name text;
BEGIN
  -- Check if the other person already liked back (mutual = match)
  SELECT EXISTS(
    SELECT 1 FROM public.likes
    WHERE from_user_id = NEW.to_user_id AND to_user_id = NEW.from_user_id
  ) INTO reverse_exists;

  IF reverse_exists THEN
    SELECT display_name INTO liker_name FROM public.profiles WHERE user_id = NEW.from_user_id;
    SELECT display_name INTO liked_name FROM public.profiles WHERE user_id = NEW.to_user_id;

    -- Notify both users
    INSERT INTO public.notifications (user_id, type, title, body, related_user_id)
    VALUES
      (NEW.from_user_id, 'match', 'Nouveau match !', 'Vous avez matché avec ' || COALESCE(liked_name, 'quelqu''un'), NEW.to_user_id),
      (NEW.to_user_id, 'match', 'Nouveau match !', 'Vous avez matché avec ' || COALESCE(liker_name, 'quelqu''un'), NEW.from_user_id);
  ELSE
    -- Notify liked user about the like
    SELECT display_name INTO liker_name FROM public.profiles WHERE user_id = NEW.from_user_id;
    INSERT INTO public.notifications (user_id, type, title, body, related_user_id)
    VALUES (NEW.to_user_id, 'like', 'Quelqu''un vous aime', COALESCE(liker_name, 'Quelqu''un') || ' a aimé votre profil', NEW.from_user_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_like_notify
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_match();

-- Notify on new message
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_name text;
BEGIN
  SELECT display_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, type, title, body, related_user_id)
  VALUES (NEW.receiver_id, 'message', 'Nouveau message', COALESCE(sender_name, 'Quelqu''un') || ' vous a envoyé un message', NEW.sender_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_message();
