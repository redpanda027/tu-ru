// supabase-sync-ikken.js
// いけんボードのリアルタイム同期機能
// 注: Supabase がない場合でもローカルで動作します

let ikkenSyncEnabled = false;

async function initializeIkkenBoardSync() {
  try {
    // Supabase を初期化（失敗してもコンティニュー）
    await initSupabase();
    
    if (!supabase) {
      console.log('📝 いけんボード: ローカルモードで動作します');
      return;
    }
    
    // ボード ID を取得
    const boardId = getBoardId('ikken');
    
    console.log('✅ いけんボード: Supabase リアルタイム同期を開始');
    ikkenSyncEnabled = true;
    
    // リアルタイムリスナーを開始
    subscribeToNotes(boardId);
    
  } catch (err) {
    console.warn('⚠️ Supabase 初期化に失敗:', err.message);
  }
}

async function subscribeToNotes(boardId) {
  if (!supabase) return;
  
  try {
    // 初期データを読み込み
    await loadNotesFromSupabase(boardId);
    
    // リアルタイムリスナーを設定
    const channel = supabase
      .channel(`ikken_${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ikken_notes',
          filter: `board_id=eq.${boardId}`
        },
        (payload) => {
          if (SUPABASE_CONFIG.debug) {
            console.log('📨 リアルタイム更新:', payload.eventType);
          }
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            syncRemoteNote(payload.new);
          } else if (payload.eventType === 'DELETE') {
            removeRemoteNote(payload.old.id);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ チャネル接続エラー');
        }
      });
  } catch (err) {
    console.warn('⚠️ リアルタイムリスナー設定に失敗:', err.message);
  }
}

async function loadNotesFromSupabase(boardId) {
  if (!supabase) return;
  
  try {
    const { data, error } = await supabase
      .from('ikken_notes')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: true });
    
    // テーブルが存在しない場合などはエラーを無視
    if (error && error.code === 'PGRST116') {
      console.log('ℹ️ ikken_notes テーブルがまだ作成されていません');
      return;
    }
    
    if (error) throw error;
    
    // ローカルに付箋がない場合のみ、Supabase から読み込む
    if (typeof notes !== 'undefined' && notes.length === 0 && data && data.length > 0) {
      data.forEach(note => syncRemoteNote(note));
      console.log(`✅ ${data.length} 件の付箋を読み込みました`);
    }
  } catch (err) {
    console.warn('ℹ️ Supabase から付箋を読み込めません:', err.message);
  }
}

async function saveNoteToSupabase(boardId, deviceId, note) {
  if (!supabase || !ikkenSyncEnabled) return;
  
  try {
    const { error } = await supabase
      .from('ikken_notes')
      .insert({
        board_id: boardId,
        name: note.name || '',
        text: note.text,
        category: note.category,
        x: note.x || 0,
        y: note.y || 0,
        z: note.z || 1,
        created_by: deviceId,
        device_id: deviceId
      });
    
    // テーブルが存在しない場合は無視
    if (error && error.code === 'PGRST116') {
      return;
    }
    
    if (error) throw error;
    
    if (SUPABASE_CONFIG.debug) {
      console.log('💾 付箋を保存:', note.id);
    }
  } catch (err) {
    console.warn('ℹ️ Supabase への保存に失敗（ローカルで動作）:', err.message);
  }
}

async function deleteNoteFromSupabase(noteId) {
  if (!supabase || !ikkenSyncEnabled) return;
  
  try {
    // ID から boardId を取得する必要がありますが、ここでは簡略化
    // 実際の実装では noteId から boardId を特定する必要があります
    const boardId = getBoardId('ikken');
    
    const { error } = await supabase
      .from('ikken_notes')
      .delete()
      .eq('id', noteId);
    
    if (error && error.code === 'PGRST116') {
      return;
    }
    
    if (error) throw error;
  } catch (err) {
    console.warn('ℹ️ Supabase から削除に失敗:', err.message);
  }
}

// リモートから同期した付箋をローカルに反映
function syncRemoteNote(remoteNote) {
  if (typeof notes === 'undefined') {
    console.warn('notes 配列が見つかりません');
    return;
  }
  
  // ローカルに同じ ID がなければ追加
  if (!notes.find(n => n.id === remoteNote.id)) {
    const note = {
      id: remoteNote.id,
      name: remoteNote.name || '',
      text: remoteNote.text,
      category: remoteNote.category,
      x: remoteNote.x || 0,
      y: remoteNote.y || 0,
      z: remoteNote.z || 1
    };
    notes.push(note);
    
    // レンダリング関数があれば実行
    if (typeof renderNote === 'function') {
      renderNote(note);
    }
    if (typeof updateCountBadges === 'function') {
      updateCountBadges();
    }
    if (typeof updateEmptyState === 'function') {
      updateEmptyState();
    }
    
    console.log('🔄 付箋を同期:', remoteNote.id);
  }
}

function removeRemoteNote(noteId) {
  if (typeof notes === 'undefined') return;
  
  const note = notes.find(n => n.id === noteId);
  if (note && note.el) {
    note.el.remove();
  }
  notes = notes.filter(n => n.id !== noteId);
  
  if (typeof updateCountBadges === 'function') {
    updateCountBadges();
  }
  if (typeof updateEmptyState === 'function') {
    updateEmptyState();
  }
  
  console.log('🗑️ 付箋を削除:', noteId);
}
