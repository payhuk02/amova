
-- Add audio support to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_url text;

-- Create voice-messages storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload voice messages
CREATE POLICY "Authenticated users can upload voice messages"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice-messages');

-- Anyone can read voice messages (public bucket)
CREATE POLICY "Anyone can read voice messages"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'voice-messages');

-- Users can delete their own voice messages
CREATE POLICY "Users can delete own voice messages"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'voice-messages' AND (storage.foldername(name))[1] = auth.uid()::text);
