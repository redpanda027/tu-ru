// supabase-sync-ikken.js
// いけんボードのリアルタイム同期機能

async function initializeIkkenBoardSync() {
  await initSupabase();
  if (!supabase) {
    console.warn('Supabase not available. Using local mode.');
    return;
  }

  const boardId = getBoardId();
  const deviceId = getDeviceId();
  
  // リアルタイムリスナーを開始
  subscribeToNotes(boardId);
  
  // 新しい付箋を追加時に Supabase に保存
  const originalAddNote = window.addNote;
  window.addNote = async function() {
    // オリジナルの関数を実行
    if (originalAddNote) originalAddNote.call(this);
    
    // 最後に追加された付箋を Supabase に保存
    if (notes && notes.length > 0) {
      const lastNote = notes[notes.length - 1];
      await saveNoteToSupabase(boardId, deviceId, lastNote);
    }
  };
  
  // 付箋削除時に Supabase から削除
  const originalDeleteNote = window.deleteNote;
  window.deleteNote = async function(noteId) {
    if (originalDeleteNote) originalDeleteNote.call(this, noteId);
    await deleteNoteFromSupabase(boardId, noteId);
  };
}

async function subscribeToNotes(boardId) {
  if (!supabase) return;
  
  // 初期データを読み込み
  await loadNotesFromSupabase(boardId);
  
  // リアルタイムリスナーを設定
  supabase
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
          console.log('📨 Realtime update:', payload);
        }
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          syncRemoteNote(payload.new);
        } else if (payload.eventType === 'DELETE') {
          removeRemoteNote(payload.old.id);
        }
      }
    )
    .subscribe((status) => {
      if (SUPABASE_CONFIG.debug) {
        console.log('📡 Channel status:', status);
      }
    });
}

async function loadNotesFromSupabase(boardId) {
  if (!supabase) return;
  
  try {
    const { data, error } = await supabase
      .from('ikken_notes')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // 既存の付箋がなければ Supabase のデータを読み込む
    if (notes.length === 0 && data && data.length > 0) {
      data.forEach(note => syncRemoteNote(note));
    }
  } catch (err) {
    console.error('❌ Failed to load notes:', err);
  }
}

async function saveNoteToSupabase(boardId, deviceId, note) {
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('ikken_notes')
      .insert({
        board_id: boardId,
        name: note.name,
        text: note.text,
        category: note.category,
        x: note.x,
        y: note.y,
        z: note.z,
        created_by: deviceId,
        device_id: deviceId
      });
    
    if (error) throw error;
    
    if (SUPABASE_CONFIG.debug) {
      console.log('✅ Note saved to Supabase:', note.id);
    }
  } catch (err) {
    console.error('❌ Failed to save note:', err);
  }
}

async function deleteNoteFromSupabase(boardId, noteId) {
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('ikken_notes')
      .delete()
      .eq('id', noteId);
    
    if (error) throw error;
    
    if (SUPABASE_CONFIG.debug) {
      console.log('✅ Note deleted from Supabase:', noteId);
    }
  } catch (err) {
    console.error('❌ Failed to delete note:', err);
  }
}

// リモートから同期した付箋をローカルに反映
function syncRemoteNote(remoteNote) {
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
    renderNote(note);
    updateCountBadges();
    updateEmptyState();
    
    if (SUPABASE_CONFIG.debug) {
      console.log('🔄 Remote note synced:', note.id);
    }
  }
}

function removeRemoteNote(noteId) {
  const note = notes.find(n => n.id === noteId);
  if (note && note.el) {
    note.el.remove();
  }
  notes = notes.filter(n => n.id !== noteId);
  updateCountBadges();
  updateEmptyState();
  
  if (SUPABASE_CONFIG.debug) {
    console.log('🗑️ Remote note removed:', noteId);
  }
}
