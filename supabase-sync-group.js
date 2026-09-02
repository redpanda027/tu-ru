/* global supabase */
(function () {
  'use strict';

  const config = window.SUPABASE_CONFIG || {};
  const url = config.url || config.SUPABASE_URL;
  const key = config.publishableKey || config.anonKey || config.key || config.SUPABASE_KEY;

  if (!url || !key) {
    window.GroupBoardStore = { ready: false, error: 'Supabase の設定がされていません。' };
    return;
  }

  const client = window.supabase.createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } },
    global: { headers: { 'x-device-id': deviceKey() } }
  });
  const table = 'group_posts';
  let channel;
  let currentBoardId = '';

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
    let id = localStorage.getItem('group-board-device-id');
    if (!id) {
      id = crypto.randomUUID
        ? crypto.randomUUID()
        : 'device-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem('group-board-device-id', id);
    }
    return hashId(id);
  }

  function rowToPost(row) {
    return {
      id: row.id,
      groupName: row.group_name,
      activity: row.activity,
      person: row.person || '',
      purpose: row.purpose || '',
      status: row.status || 'todo',
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
      createdBy: row.created_by || '',
      deviceId: row.device_id || '',
      boardId: row.board_id || ''
    };
  }

  async function list(boardId) {
    const { data, error } = await client.from(table).select('*').eq('board_id', boardId).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(rowToPost);
  }

  function broadcast(boardId) {
    if (channel && channel.state === 'joined') {
      channel.send({ type: 'broadcast', event: 'changed', payload: { boardId } }).catch(() => {});
    }
  }

  async function create(boardId, values, deviceId) {
    const { data, error } = await client.from(table).insert({
      board_id: boardId,
      group_name: values.groupName,
      activity: values.activity,
      person: values.person || null,
      purpose: values.purpose || null,
      status: 'todo',
      created_by: values.createdBy || 'Web user',
      device_id: deviceKey()
    }).select().single();
    if (error) throw error;
    broadcast(boardId);
    return rowToPost(data);
  }

  async function update(id, values) {
    const { data, error } = await client.from(table).update({
      group_name: values.groupName,
      activity: values.activity,
      person: values.person || null,
      purpose: values.purpose || null,
      status: values.status,
      updated_at: new Date().toISOString()
    }).eq('id', id).select().single();
    if (error) throw error;
    broadcast(values.boardId || currentBoardId);
    return rowToPost(data);
  }

  async function remove(id) {
    const { error } = await client.from(table).delete().eq('id', id);
    if (error) throw error;
    broadcast(currentBoardId);
  }

  function subscribe(boardId, onChange, onStatus) {
    if (channel) client.removeChannel(channel);
    currentBoardId = boardId;
    channel = client
      .channel('group-posts:' + boardId, { config: { broadcast: { self: false }, presence: { key: '' } } })
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: 'board_id=eq.' + boardId }, onChange)
      .on('broadcast', { event: 'changed' }, onChange)
      .subscribe(status => {
        if (onStatus) onStatus(status);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setTimeout(() => { if (channel) subscribe(boardId, onChange, onStatus); }, 3000);
        }
      });
    return channel;
  }

  window.GroupBoardStore = { ready: true, list, create, update, remove, subscribe };
})();
