// supabase-sync-ikken.js
// いけんボードのリアルタイム同期機能（Broadcast + postgres_changes）
(function () {
  'use strict';

  const config = window.SUPABASE_CONFIG || {};
  const url = config.url || config.SUPABASE_URL;
  const key = config.publishableKey || config.anonKey || config.key || config.SUPABASE_KEY;
  const table = 'ikken_notes';

  let client = null;
  let channel = null;
  let currentBoardId = '';
  let handlers = null;

  function init(h) {
    handlers = h;
    if (!url || !key || !window.supabase) return false;
    client = window.supabase.createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } });
    return true;
  }

  async function list(boardId) {
    if (!client) return [];
    const { data, error } = await client.from(table).select('*').eq('board_id', boardId).order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  function broadcast() {
    if (channel && channel.state === 'joined') {
      channel.send({ type: 'broadcast', event: 'changed', payload: { boardId: currentBoardId } }).catch(() => {});
    }
  }

  async function save(boardId, note, deviceId) {
    if (!client) return;
    const { error } = await client.from(table).insert({
      id: note.id,
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
    if (error) throw error;
    broadcast();
  }

  async function update(noteId, fields) {
    if (!client) return;
    const { error } = await client.from(table).update(fields).eq('id', noteId);
    if (error) throw error;
    broadcast();
  }

  async function remove(noteId) {
    if (!client) return;
    const { error } = await client.from(table).delete().eq('id', noteId);
    if (error) throw error;
    broadcast();
  }

  function subscribe(boardId) {
    if (!client) return;
    currentBoardId = boardId;
    if (channel) client.removeChannel(channel);
    channel = client
      .channel('ikken:' + boardId, { config: { broadcast: { self: false }, presence: { key: '' } } })
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: 'board_id=eq.' + boardId }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          if (handlers && handlers.upsert) handlers.upsert(payload.new);
        } else if (payload.eventType === 'DELETE') {
          if (handlers && handlers.remove) handlers.remove(payload.old.id);
        }
      })
      .on('broadcast', { event: 'changed' }, () => { if (handlers && handlers.reload) handlers.reload(); })
      .subscribe((status) => {
        if (handlers && handlers.onStatus) handlers.onStatus(status);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setTimeout(() => { if (channel) subscribe(boardId); }, 3000);
        }
      });
  }

  async function listCategories(boardId) {
    if (!client) return null;
    try {
      const { data, error } = await client.from('ikken_categories').select('*').eq('board_id', boardId).order('sort', { ascending: true });
      if (error) return null; // テーブル未作成などはデフォルトを使用
      return data || [];
    } catch { return null; }
  }

  async function addCategory(boardId, cat) {
    if (!client) return;
    const { error } = await client.from('ikken_categories').insert({
      id: cat.id,
      board_id: boardId,
      label: cat.label,
      color: cat.color,
      sort: cat.sort || 0
    });
    if (error) throw error;
    broadcast();
  }

  async function removeCategory(catId) {
    if (!client) return;
    const { error } = await client.from('ikken_categories').delete().eq('id', catId);
    if (error) throw error;
    broadcast();
  }

  window.IkkenSync = { init, list, save, update, remove, subscribe, listCategories, addCategory, removeCategory };
})();
