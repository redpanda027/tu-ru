-- 予算ダッシュボード用：Supabase の SQL Editor で一度だけ実行してください。

CREATE TABLE IF NOT EXISTS budget_settings (
  board_id TEXT PRIMARY KEY,
  class_budget NUMERIC NOT NULL DEFAULT 0 CHECK (class_budget >= 0),
  class_name TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  group_name TEXT,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  people INTEGER NOT NULL DEFAULT 0 CHECK (people >= 0),
  person TEXT,
  note TEXT,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_transactions_board ON budget_transactions(board_id);
CREATE INDEX IF NOT EXISTS idx_budget_transactions_board_date ON budget_transactions(board_id, occurred_on DESC);

ALTER TABLE budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read budget settings" ON budget_settings FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can insert budget settings" ON budget_settings FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update budget settings" ON budget_settings FOR UPDATE USING (TRUE);
CREATE POLICY "Anyone can delete budget settings" ON budget_settings FOR DELETE USING (TRUE);
CREATE POLICY "Anyone can read budget transactions" ON budget_transactions FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can insert budget transactions" ON budget_transactions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update budget transactions" ON budget_transactions FOR UPDATE USING (TRUE);
CREATE POLICY "Anyone can delete budget transactions" ON budget_transactions FOR DELETE USING (TRUE);

-- リアルタイム同期を有効にします（すでに追加済みでも安全です）。
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE budget_settings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE budget_transactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
