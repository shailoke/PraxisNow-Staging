-- Stores Razorpay order SKU server-side so verify/route.ts never has to trust
-- the client-supplied packId. The verified flag prevents replay attacks.

CREATE TABLE IF NOT EXISTS razorpay_orders (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id   TEXT        UNIQUE NOT NULL,
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  sku        TEXT        NOT NULL,
  amount     INTEGER     NOT NULL,
  verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_razorpay_orders_order_id ON razorpay_orders (order_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_user_id  ON razorpay_orders (user_id);
