-- Add is_admin column
ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Add RLS policy so admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admins can update reports
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admins can delete users from profiles
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.user_id = auth.uid() AND p.is_admin = true
    )
  );
