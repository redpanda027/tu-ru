/* global supabase */
(function () {
  'use strict';

  const config = window.SUPABASE_CONFIG || {};
  const url = config.url || config.SUPABASE_URL;
  const key = config.publishableKey || config.anonKey || config.key || config.SUPABASE_KEY;
  if (!url || !key || !window.supabase) {
    window.BudgetStore = { ready: false, error: 'Supabase の設定がされていません。' };
    return;
  }

  const client = window.supabase.createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } });
  let channel;
  let currentBoardId = '';
  const clean = (row) => ({
    id: row.id, boardId: row.board_id, kind: row.kind, groupName: row.group_name || '',
    title: row.title, amount: Number(row.amount), people: Number(row.people || 0),
    person: row.person || '', note: row.note || '', occurredOn: row.occurred_on,
    createdAt: row.created_at
  });
  function broadcast() {
    if (channel && channel.state === 'joined') channel.send({ type: 'broadcast', event: 'changed', payload: {} }).catch(() => {});
  }
  async function getSettings(boardId) {
    const { data, error } = await client.from('budget_settings').select('*').eq('board_id', boardId).maybeSingle();
    if (error) throw error;
    return data || { board_id: boardId, class_budget: 0, class_name: '' };
  }
  async function saveSettings(boardId, values) {
    const { error } = await client.from('budget_settings').upsert({
      board_id: boardId, class_budget: Number(values.classBudget) || 0, class_name: values.className || '', updated_at: new Date().toISOString()
    }, { onConflict: 'board_id' });
    if (error) throw error;
    broadcast();
  }
  async function list(boardId) {
    const { data, error } = await client.from('budget_transactions').select('*').eq('board_id', boardId).order('occurred_on', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(clean);
  }
  async function create(boardId, values) {
    const { data, error } = await client.from('budget_transactions').insert({
      board_id: boardId, kind: values.kind, group_name: values.groupName || null,
      title: values.title, amount: Number(values.amount), people: Number(values.people) || 0,
      person: values.person || null, note: values.note || null, occurred_on: values.occurredOn
    }).select().single();
    if (error) throw error;
    broadcast();
    return clean(data);
  }
  async function remove(id) {
    const { error } = await client.from('budget_transactions').delete().eq('id', id);
    if (error) throw error;
    broadcast();
  }
  function subscribe(boardId, onChange, onStatus) {
    if (channel) client.removeChannel(channel);
    currentBoardId = boardId;
    channel = client.channel('budget:' + boardId, { config: { broadcast: { self: false } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_transactions', filter: 'board_id=eq.' + boardId }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_settings', filter: 'board_id=eq.' + boardId }, onChange)
      .on('broadcast', { event: 'changed' }, onChange)
      .subscribe((status) => {
        if (onStatus) onStatus(status);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setTimeout(() => subscribe(currentBoardId, onChange, onStatus), 3000);
      });
  }
  window.BudgetStore = { ready: true, getSettings, saveSettings, list, create, remove, subscribe };
})();
