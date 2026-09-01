// supabase-sync-group.js
// グループ活動ボードのリアルタイム同期機能

async function initializeGroupBoardSync() {
  await initSupabase();
  if (!supabase) {
    console.warn('Supabase not available. Using local mode.');
    return;
  }

  const boardId = getBoardId();
  const deviceId = getDeviceId();
  
  // リアルタイムリスナーを開始
  subscribeToGroupPosts(boardId);
}

async function subscribeToGroupPosts(boardId) {
  if (!supabase) return;
  
  // 初期データを読み込み
  await loadGroupPostsFromSupabase(boardId);
  
  // リアルタイムリスナーを設定
  supabase
    .channel(`group_${boardId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'group_posts',
        filter: `board_id=eq.${boardId}`
      },
      (payload) => {
        if (SUPABASE_CONFIG.debug) {
          console.log('📨 Group Realtime update:', payload);
        }
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          syncRemoteGroupPost(payload.new);
        } else if (payload.eventType === 'DELETE') {
          removeRemoteGroupPost(payload.old.id);
        }
      }
    )
    .subscribe((status) => {
      if (SUPABASE_CONFIG.debug) {
        console.log('📡 Group Channel status:', status);
      }
    });
}

async function loadGroupPostsFromSupabase(boardId) {
  if (!supabase) return;
  
  try {
    const { data, error } = await supabase
      .from('group_posts')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      data.forEach(post => syncRemoteGroupPost(post));
    }
  } catch (err) {
    console.error('❌ Failed to load group posts:', err);
  }
}

async function saveGroupPostToSupabase(boardId, post) {
  if (!supabase) return;
  
  const deviceId = getDeviceId();
  
  try {
    if (post.id) {
      // 更新
      const { error } = await supabase
        .from('group_posts')
        .update({
          group_name: post.groupName,
          activity: post.activity,
          person: post.person || null,
          purpose: post.purpose || null,
          status: post.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);
      
      if (error) throw error;
      if (SUPABASE_CONFIG.debug) console.log('✅ Post updated:', post.id);
    } else {
      // 新規作成
      const { error } = await supabase
        .from('group_posts')
        .insert({
          board_id: boardId,
          group_name: post.groupName,
          activity: post.activity,
          person: post.person || null,
          purpose: post.purpose || null,
          status: post.status || 'todo',
          created_by: deviceId,
          device_id: deviceId
        });
      
      if (error) throw error;
      if (SUPABASE_CONFIG.debug) console.log('✅ Post created');
    }
  } catch (err) {
    console.error('❌ Failed to save group post:', err);
  }
}

async function deleteGroupPostFromSupabase(postId) {
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('group_posts')
      .delete()
      .eq('id', postId);
    
    if (error) throw error;
    if (SUPABASE_CONFIG.debug) console.log('✅ Post deleted:', postId);
  } catch (err) {
    console.error('❌ Failed to delete post:', err);
  }
}

function syncRemoteGroupPost(remotePost) {
  // これはボードのレンダリング関数に統合する必要があります
  // リモートデータを DOM に反映
  console.log('🔄 Syncing remote group post:', remotePost);
}

function removeRemoteGroupPost(postId) {
  // これはボードのレンダリング関数に統合する必要があります
  // 削除イベントを処理
  console.log('🗑️ Removing group post:', postId);
}
