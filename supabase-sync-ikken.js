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

  // 端末IDをそのまま送らない(プライバシー保護)。決定論的ハッシュ化して送る。
  function hashId(raw) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }

  function deviceKey() {
    let id = localStorage.getItem('ikkenboard_device_id');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : 'd' + Math.random().toString(36).slice(2) + Date.now();
      localStorage.setItem('ikkenboard_device_id', id);
    }
    return hashId(id);
  }

  function init(h) {
    handlers = h;
    if (!url || !key || !window.supabase) return false;
    client = window.supabase.createClient(url, key, {
      realtime: { params: { eventsPerSecond: 10 } },
      global: { headers: { 'x-device-id': deviceKey() } }
    });
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
      created_by: deviceKey(),
      device_id: deviceKey()
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
