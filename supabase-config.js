// supabase-config.js
// ⚠️ 以下の値を自分の Supabase プロジェクトの値に置き換えてください

const SUPABASE_CONFIG = {
  // Supabase ダッシュボード → Settings → API から取得
  url: 'https://YOUR_PROJECT_ID.supabase.co',      // 例: https://abc123.supabase.co
  anonKey: 'eyJhbGc...',                             // 例: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  
  // 開発時は console.log を有効化
  debug: true
};

// Supabase クライアントの初期化
let supabase = null;

async function initSupabase() {
  if (supabase) return supabase;
  
  // Supabase JS ライブラリの動的読み込み
  if (!window.supabase) {
    return null; // ライブラリが読み込まれていない
  }
  
  const { createClient } = window.supabase;
  
  supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  
  if (SUPABASE_CONFIG.debug) {
    console.log('✅ Supabase initialized', SUPABASE_CONFIG.url);
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
