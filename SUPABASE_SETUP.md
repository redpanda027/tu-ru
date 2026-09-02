# Supabase セットアップガイド

## 📋 ステップ 1：Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) にアクセス
2. **「Start your project」** をクリック
3. GitHub アカウントでサインアップ
4. 新しいプロジェクトを作成：
   - **Project Name**: `class-board-tool`
   - **Database Password**: 強いパスワードを設定
   - **Region**: `Asia Pacific (Tokyo)` を選択
5. プロジェクトが立ち上がるまで待機（約1分）

---

## 🔐 ステップ 2：API キーを取得

1. ダッシュボードで **「Settings」→「API」** を選択
2. 以下の2つをコピーして保存：
   - **Project URL**: `https://xxxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` で始まるキー

3. 📝 後で使うので、メモ帳に保存しておいてください：
   ```
   SUPABASE_URL=https://xxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   ```

---

## 📊 ステップ 3：データベーステーブルを作成

### タイプ A：意見ボード用テーブル

1. Supabase ダッシュボードで **「SQL Editor」** を開く
2. 新しい Query を作成して、以下を実行：

```sql
-- いけんボード用
CREATE TABLE ikken_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id TEXT NOT NULL,
  name TEXT,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  x FLOAT DEFAULT 0,
  y FLOAT DEFAULT 0,
  z INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT now(),
  created_by TEXT NOT NULL,
  device_id TEXT NOT NULL
);

CREATE INDEX idx_ikken_board_id ON ikken_notes(board_id);
CREATE INDEX idx_ikken_created_at ON ikken_notes(created_at DESC);

-- Real-time 購読を有効化
ALTER TABLE ikken_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read" ON ikken_notes FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can insert" ON ikken_notes FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update" ON ikken_notes FOR UPDATE USING (TRUE);
CREATE POLICY "Anyone can delete" ON ikken_notes FOR DELETE USING (TRUE);
```

### タイプ B：グループ活動ボード用テーブル

```sql
-- グループ活動ボード用
CREATE TABLE group_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  activity TEXT NOT NULL,
  person TEXT,
  purpose TEXT,
  status TEXT DEFAULT 'todo',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  created_by TEXT NOT NULL,
  device_id TEXT NOT NULL
);

CREATE INDEX idx_group_board_id ON group_posts(board_id);
CREATE INDEX idx_group_status ON group_posts(status);

ALTER TABLE group_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read" ON group_posts FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can insert" ON group_posts FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update" ON group_posts FOR UPDATE USING (TRUE);
CREATE POLICY "Anyone can delete" ON group_posts FOR DELETE USING (TRUE);
```

3. 各クエリを実行（✓ マークが出たら OK）

---

## ✅ ステップ 4：動作確認

以下の URL にアクセスして、Supabase が稼働しているか確認：
```
https://YOUR_SUPABASE_URL/rest/v1/ikken_notes?limit=1
```

`{"id":"..."}` のような JSON が返ってくれば OK です！

---

## 🔗 ステップ 5：アプリケーションに組み込む

次のファイルを作成して、各 HTML に読み込みます：
- `supabase-config.js` - API キーの設定
- `supabase-sync.js` - リアルタイム同期機能

詳しくはコード実装ガイドを参照してください。

---

## 📱 よくある質問

**Q: 認証ユーザーが必要ですか？**
A: いいえ。匿名認証を使うので、生徒はログインなしでアクセスできます。

**Q: データは保存されますか？**
A: はい。ボード内容は Supabase に永続保存されます。ページを再読み込みしても内容は消えません。

**Q: 複数の教室で使えますか？**
A: はい。ボード ID が違えば別のデータになります。

**Q: セキュリティは大丈夫ですか？**
A: 基本的には OK ですが、必要に応じて行レベルセキュリティ（RLS）を強化できます。

---

## 🔧 トラブルシューティング: 書き込みが 401 (RLS 違反) になる場合

`ikken_notes` への投稿が「new row violates row-level security policy」で失敗する場合は、
Supabase ダッシュボードの SQL Editor で以下を実行してポリシーを修復してください
（旧ポリシーが一部欠けている状態になります）:

```sql
-- 既存のポリシーを削除して作り直す
DROP POLICY IF EXISTS "Anyone can read" ON ikken_notes;
DROP POLICY IF EXISTS "Anyone can insert" ON ikken_notes;
DROP POLICY IF EXISTS "Anyone can update" ON ikken_notes;
DROP POLICY IF EXISTS "Anyone can delete" ON ikken_notes;

CREATE POLICY "Anyone can read"   ON ikken_notes FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can insert" ON ikken_notes FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update" ON ikken_notes FOR UPDATE USING (TRUE);
CREATE POLICY "Anyone can delete" ON ikken_notes FOR DELETE USING (TRUE);
```

実行後、もう一度ボードを開いて投稿できるか確認してください。

---

## 📂 いけんボード: 先生が作るカテゴリ機能（2026-09 追加）

先生がカテゴリを自由に作成・削除でき、生徒はそのカテゴリから選べるようにするには、
Supabase の SQL Editor で以下を **1回だけ** 実行してください:

```sql
CREATE TABLE IF NOT EXISTS ikken_categories (
  id text PRIMARY KEY,
  board_id text NOT NULL,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#f59e0b',
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ikken_categories_board ON ikken_categories(board_id);

ALTER TABLE ikken_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read"   ON ikken_categories FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can insert" ON ikken_categories FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update" ON ikken_categories FOR UPDATE USING (TRUE);
CREATE POLICY "Anyone can delete" ON ikken_categories FOR DELETE USING (TRUE);
```

※ このテーブルを作らなくてもボード自体は動きます（その場合は既定の
「賛成・反対・疑問・アイデア」の4カテゴリが使われ、カテゴリ編集は
その端末内でのみ有効になります）。
