-- ============================================================
-- データプライバシー強化セットアップ
-- Supabase ダッシュボード → SQL Editor に貼り付けて実行してください。
-- ※ コード側はすでにハッシュ化済みの端末IDを送るように変更済みです。
-- ============================================================

-- ------------------------------------------------------------
-- 【手順 0】テスト段階なら既存データをリセット(任意)
-- 旧コードは生の端末IDを保存していたため、残しておくと
-- 「自分の投稿なのに編集・削除できない」行が残ります。
-- 必要なデータがなければコメントを外して実行:
--
-- DELETE FROM ikken_notes;
-- DELETE FROM group_posts;
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 【手順 1】いけんボード (ikken_notes) の RLS を作り直す
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read"   ON ikken_notes;
DROP POLICY IF EXISTS "Anyone can insert" ON ikken_notes;
DROP POLICY IF EXISTS "Anyone can update" ON ikken_notes;
DROP POLICY IF EXISTS "Anyone can delete" ON ikken_notes;
DROP POLICY IF EXISTS "read_all"    ON ikken_notes;
DROP POLICY IF EXISTS "insert_own"  ON ikken_notes;
DROP POLICY IF EXISTS "update_own"  ON ikken_notes;
DROP POLICY IF EXISTS "delete_own"  ON ikken_notes;

-- 読み取りは全員OK(クラスで共有するボードのため)
CREATE POLICY "read_all" ON ikken_notes
  FOR SELECT USING (true);

-- 投稿は自分の端末ID(ハッシュ)付きの行のみ許可
CREATE POLICY "insert_own" ON ikken_notes
  FOR INSERT WITH CHECK (
    length(device_id) = 16
    AND device_id = current_setting('request.headers', true)::json->>'x-device-id'
  );

-- 編集・削除は「自分の端末が投稿した行」のみ
CREATE POLICY "update_own" ON ikken_notes
  FOR UPDATE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "delete_own" ON ikken_notes
  FOR DELETE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- ------------------------------------------------------------
-- 【手順 2】グループ活動ボード (group_posts) の RLS を作り直す
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read"   ON group_posts;
DROP POLICY IF EXISTS "Anyone can insert" ON group_posts;
DROP POLICY IF EXISTS "Anyone can update" ON group_posts;
DROP POLICY IF EXISTS "Anyone can delete" ON group_posts;
DROP POLICY IF EXISTS "read_all"    ON group_posts;
DROP POLICY IF EXISTS "insert_own"  ON group_posts;
DROP POLICY IF EXISTS "update_own"  ON group_posts;
DROP POLICY IF EXISTS "delete_own"  ON group_posts;

CREATE POLICY "read_all" ON group_posts
  FOR SELECT USING (true);

CREATE POLICY "insert_own" ON group_posts
  FOR INSERT WITH CHECK (
    length(device_id) = 16
    AND device_id = current_setting('request.headers', true)::json->>'x-device-id'
  );

CREATE POLICY "update_own" ON group_posts
  FOR UPDATE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "delete_own" ON group_posts
  FOR DELETE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- ------------------------------------------------------------
-- 【手順 3】名前カラムの保護(個人情報対策・任意)
-- 本名を長く保存できないようにする。不要ならコメントを外さなくてOK
-- ------------------------------------------------------------
-- ALTER TABLE ikken_notes
--   ADD CONSTRAINT name_not_too_long CHECK (name IS NULL OR length(name) <= 20);
--
-- ALTER TABLE group_posts
--   ADD CONSTRAINT person_not_too_long CHECK (person IS NULL OR length(person) <= 20);

-- ------------------------------------------------------------
-- 【手順 4】古い投稿の自動削除(保持期間 90 日・任意)
-- pg_cron が使えるプランの場合のみ。使えない場合は月に一度
-- 手動で DELETE 文を実行すれば十分です:
--   DELETE FROM ikken_notes  WHERE created_at < now() - interval '90 days';
--   DELETE FROM group_posts  WHERE created_at < now() - interval '90 days';
-- ------------------------------------------------------------
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('delete-old-ikken', '0 3 * * *',
--   $$DELETE FROM ikken_notes WHERE created_at < now() - interval '90 days'$$);
-- SELECT cron.schedule('delete-old-group', '0 3 * * *',
--   $$DELETE FROM group_posts WHERE created_at < now() - interval '90 days'$$);
