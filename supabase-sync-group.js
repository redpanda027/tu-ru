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
    realtime: { params: { eventsPerSecond: 10 } }
  });
  const table = 'group_posts';
  let channel;
  let currentBoardId = '';

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
      device_id: deviceId
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
