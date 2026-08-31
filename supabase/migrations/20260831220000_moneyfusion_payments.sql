-- Payment orders for Moneyfusion (FusionPay) integration

CREATE TABLE public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  token_pay text UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  client_name text,
  client_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment orders"
ON public.payment_orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_payment_orders_updated_at
BEFORE UPDATE ON public.payment_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fulfill payment and activate subscription (service role / edge functions only)
CREATE OR REPLACE FUNCTION public.fulfill_payment_by_token(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.payment_orders%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_order
  FROM public.payment_orders
  WHERE token_pay = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_order.status = 'paid' THEN
    RETURN true;
  END IF;

  UPDATE public.payment_orders
  SET status = 'paid', updated_at = now()
  WHERE id = v_order.id;

  UPDATE public.subscriptions
  SET
    plan = v_order.plan,
    started_at = now(),
    expires_at = now() + interval '30 days',
    status = 'active',
    updated_at = now()
  WHERE user_id = v_order.user_id;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (user_id, plan, expires_at)
    VALUES (v_order.user_id, v_order.plan, now() + interval '30 days');
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_payment_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_payment_by_token(text) TO service_role;
