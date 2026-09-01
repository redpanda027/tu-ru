// supabase-config.js
// ⚠️ 以下の値を自分の Supabase プロジェクトの値に置き換えてください

const SUPABASE_CONFIG = {
  // Supabase ダッシュボード → Settings → API から取得
  // 📌 重要: URL のみを指定（REST API エンドポイントではなく）
  // 例: https://abc123.supabase.co
  url: 'https://YOUR_PROJECT_ID.supabase.co',
  
  // anon public key（公開可）
  // 注意: service_role key ではなく anon public key を使用
  anonKey: 'YOUR_ANON_KEY',
  
  // 開発時は console.log を有効化
  debug: true
};

// 🔒 セキュリティチェック
if (SUPABASE_CONFIG.url.includes('YOUR_PROJECT_ID')) {
  console.warn('⚠️ Supabase API キーが未設定です。');
  console.warn('📖 SUPABASE_SETUP.md を参照してください。');
  console.warn('💡 APIキーなしでも、ローカルモードで動作します。');
}

// Supabase クライアントの初期化
let supabase = null;

async function initSupabase() {
  if (supabase) return supabase;
  
  // API キーが設定されていない場合はスキップ
  if (SUPABASE_CONFIG.url.includes('YOUR_PROJECT_ID')) {
    console.log('📝 Supabase: Local mode (no API key configured)');
    return null;
  }
  
  // Supabase JS ライブラリの動的読み込み
  if (!window.supabase) {
    console.warn('⚠️ Supabase library not loaded');
    return null;
  }
  
  try {
    const { createClient } = window.supabase;
    supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    
    if (SUPABASE_CONFIG.debug) {
      console.log('✅ Supabase initialized:', SUPABASE_CONFIG.url);
    }
  } catch (err) {
    console.error('❌ Failed to initialize Supabase:', err);
    return null;
  }
  
  return supabase;
}

// デバイス ID を生成・取得
function getDeviceId() {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'd' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

// グローバルに使える getBoardId（URL パラメータ対応）
function getBoardId(boardType = 'default') {
  // URL パラメータから boardId を取得
  const params = new URLSearchParams(window.location.search);
  const urlBoardId = params.get('boardId');
  if (urlBoardId) {
    localStorage.setItem(`board_${boardType}_id`, urlBoardId);
    return urlBoardId;
  }
  
  // localStorage から取得
  const key = `board_${boardType}_id`;
  let boardId = localStorage.getItem(key);
  if (!boardId) {
    boardId = boardType.charAt(0).toUpperCase() + Math.random().toString(36).substr(2, 9).toUpperCase();
    localStorage.setItem(key, boardId);
  }
  return boardId;
}
