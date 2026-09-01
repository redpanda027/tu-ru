# Supabase リアルタイム同期 - 実装ガイド

## 📚 目次
1. [設定](#設定)
2. [いけんボードに統合](#いけんボードに統合)
3. [グループ活動ボードに統合](#グループ活動ボードに統合)
4. [トラブルシューティング](#トラブルシューティング)

---

## 設定

### 1. API キーを設定ファイルに記入

`supabase-config.js` を開いて、以下を置き換えます：

```javascript
const SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_ID.supabase.co',      // ← ここ
  anonKey: 'eyJhbGc...',                             // ← ここ
  debug: true  // 開発時は true、本番時は false に
};
```

**取得方法:**
- Supabase ダッシュボード → Settings → API から値をコピー

---

## いけんボードに統合

### ステップ 1：HTML に Supabase ライブラリとスクリプトを追加

`いけんボード.html` の `</body>` の直前に以下を追加：

```html
<!-- Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-config.js"></script>
<script src="supabase-sync-ikken.js"></script>
<script>
  // ページロード時に同期を開始
  document.addEventListener('DOMContentLoaded', function() {
    initializeIkkenBoardSync();
  });
</script>
</body>
```

### ステップ 2：いけんボード.js の先頭に注釈を追加

`いけんボード.js` の 先頭に以下の注釈を追加（これでコードが Supabase 対応になります）：

```javascript
// ⚠️ 注意: このファイルは Supabase と連動しています
// supabase-config.js が読み込まれていることを前提とします
```

### ステップ 3：完了！

これで以下の機能が有効になります：
- ✅ 複数デバイス間でリアルタイム同期
- ✅ ボード内容が自動保存される
- ✅ ページ再読み込み時にデータが復元される

---

## グループ活動ボードに統合

### ステップ 1：HTML に Supabase スクリプトを追加

`グループ活動ボード.html` の `</body>` の直前に以下を追加：

```html
<!-- Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-config.js"></script>
<script src="supabase-sync-group.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    initializeGroupBoardSync();
  });
</script>
</body>
```

### ステップ 2：グループボードで投稿保存時に Supabase に送信

グループ活動ボード.html の JavaScript で、投稿を保存するコードに以下を追加：

```javascript
// 投稿を追加する関数の中で、最後に以下を実行
if (typeof saveGroupPostToSupabase !== 'undefined') {
  saveGroupPostToSupabase(boardId, postData);
}
```

---

## 活動報告ボードに統合

同様に、`活動報告ボード.html` にも Supabase スクリプトを追加します。

```html
<!-- Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-config.js"></script>
<script src="supabase-sync-group.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    initializeGroupBoardSync();
  });
</script>
</body>
```

---

## トラブルシューティング

### ❌ エラー：`Supabase not available`

**原因:** API キーが正しく設定されていない

**解決:**
1. `supabase-config.js` の `url` と `anonKey` を確認
2. ブラウザの Developer Tools → Console でエラーを確認
3. Supabase ダッシュボードが稼働しているか確認

### ❌ リアルタイム同期が動作しない

**原因:** データベーステーブルが作成されていない

**解決:**
1. Supabase ダッシュボード → SQL Editor で以下を実行：
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```
2. `ikken_notes` と `group_posts` が表示されるか確認
3. 表示されなければ、SUPABASE_SETUP.md のステップ 3 を再実行

### ❌ CORS エラーが出る

**原因:** Supabase の CORS 設定が必要

**解決:**
Supabase ダッシュボード → Settings → API で、以下をホワイトリストに追加：
```
http://localhost:*
https://github.com/*
```

### ❌ データが同期されない

**原因:** RLS（Row Level Security）ポリシーが正しく設定されていない

**解決:**
Supabase ダッシュボード → SQL Editor で：
```sql
-- RLS ポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'ikken_notes';

-- 必要に応じてリセット
DROP POLICY "Anyone can read" ON ikken_notes;
DROP POLICY "Anyone can insert" ON ikken_notes;
DROP POLICY "Anyone can update" ON ikken_notes;
DROP POLICY "Anyone can delete" ON ikken_notes;

-- 再作成
CREATE POLICY "Anyone can read" ON ikken_notes FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can insert" ON ikken_notes FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update" ON ikken_notes FOR UPDATE USING (TRUE);
CREATE POLICY "Anyone can delete" ON ikken_notes FOR DELETE USING (TRUE);
```

---

## 🚀 デプロイ前チェックリスト

- [ ] Supabase API キーが正しく設定されている
- [ ] データベーステーブルが作成されている
- [ ] RLS ポリシーが有効になっている
- [ ] ブラウザ Dev Tools でエラーがない
- [ ] 複数タブで同時にアクセスして同期が動作する
- [ ] ページ再読み込み後もデータが残っている

---

## 📞 サポート

問題が生じた場合：
1. Supabase ダッシュボード → Logs で詳細なエラーを確認
2. ブラウザの Developer Tools → Network タブで API リクエストを確認
3. `SUPABASE_CONFIG.debug = true` にして console.log を確認
