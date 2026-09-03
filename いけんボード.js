(function(){
  const DEFAULT_CATEGORIES = [
    { id: 'agree',    label: '賛成',        color: '#10b981' },
    { id: 'disagree', label: '反対',        color: '#f43f5e' },
    { id: 'question', label: '疑問',        color: '#3b82f6' },
    { id: 'idea',     label: 'アイデア・意見', color: '#f59e0b' }
  ];

  // ===== 共有機能 =====
  function generateBoardId(){
    return 'ik' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  function getBoardId(){
    // 共有URLの ?boardId= を最優先（他端末と同じボードを見る）
    const params = new URLSearchParams(location.search);
    let boardId = params.get('boardId');
    if (boardId) {
      localStorage.setItem('ikkenboard_id', boardId);
      return boardId;
    }
    boardId = localStorage.getItem('ikkenboard_id');
    if(!boardId){
      boardId = generateBoardId();
      localStorage.setItem('ikkenboard_id', boardId);
    }
    // URL に反映して共有リンクと一致させる
    params.set('boardId', boardId);
    history.replaceState(null, '', location.pathname + '?' + params.toString());
    return boardId;
  }

  const boardId = getBoardId();
  const boardIdDisplay = document.getElementById('boardIdDisplay');
  const shareUrlDisplay = document.getElementById('shareUrlDisplay');
  const copyBoardIdBtn = document.getElementById('copyBoardIdBtn');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const participantCount = document.getElementById('participantCount');
  const qrContainer = document.getElementById('qrContainer');

  function updateShareLinks(){
    const boardId = getBoardId();
    boardIdDisplay.value = boardId;

    const shareUrl = `${window.location.origin}${window.location.pathname}?boardId=${boardId}`;
    shareUrlDisplay.value = shareUrl;

    // QR コード生成（QRCode ライブラリが読めない環境ではスキップ）
    qrContainer.innerHTML = '';
    if (typeof QRCode === 'undefined') {
      console.warn('ℹ️ QRCode ライブラリが利用できないため QR は表示されません');
      return;
    }
    new QRCode(qrContainer, {
      text: shareUrl,
      width: 120,
      height: 120,
      colorDark: '#121214',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  copyBoardIdBtn.addEventListener('click', () => {
    boardIdDisplay.select();
    document.execCommand('copy');
    const originalText = copyBoardIdBtn.textContent;
    copyBoardIdBtn.textContent = '✓ コピーしました';
    setTimeout(() => { copyBoardIdBtn.textContent = originalText; }, 2000);
  });

  copyUrlBtn.addEventListener('click', () => {
    shareUrlDisplay.select();
    document.execCommand('copy');
    const originalText = copyUrlBtn.textContent;
    copyUrlBtn.textContent = '✓ コピーしました';
    setTimeout(() => { copyUrlBtn.textContent = originalText; }, 2000);
  });

  function updateParticipantInfo(){
    const boardId = getBoardId();
    const key = `ikkenboard_participants_${boardId}`;
    let participants = JSON.parse(localStorage.getItem(key) || '[]');
    // 古い参加者情報をクリア（1時間以上前）
    const now = Date.now();
    participants = participants.filter(p => now - p.timestamp < 3600000);

    // 自分のデバイスを追加
    const deviceId = localStorage.getItem('ikkenboard_device_id') ||
                     ('d' + Math.random().toString(36).substr(2, 9));
    if(!localStorage.getItem('ikkenboard_device_id')){
      localStorage.setItem('ikkenboard_device_id', deviceId);
    }

    if(!participants.find(p => p.id === deviceId)){
      participants.push({ id: deviceId, timestamp: now });
    } else {
      participants = participants.map(p => p.id === deviceId ? { id: deviceId, timestamp: now } : p);
    }
    localStorage.setItem(key, JSON.stringify(participants));
    participantCount.textContent = participants.length;
  }

  // 初期化
  updateShareLinks();
  updateParticipantInfo();
  setInterval(updateParticipantInfo, 30000); // 30秒ごとに参加者情報を更新

  // 参加者一覧表示
  const showParticipantsBtn = document.getElementById('showParticipantsBtn');
  const participantsModal = document.getElementById('participantsModal');
  const participantsList = document.getElementById('participantsList');
  const closeParticipantsModalBtn = document.getElementById('closeParticipantsModalBtn');

  function showParticipantsModal(){
    const boardId = getBoardId();
    const key = `ikkenboard_participants_${boardId}`;
    const participants = JSON.parse(localStorage.getItem(key) || '[]');

    participantsList.innerHTML = participants.map((p, i) =>
      `<div class="flex items-center gap-2 p-2 bg-panel2 rounded text-xs">
        <span class="w-2 h-2 rounded-full bg-amber"></span>
        <span class="text-muted">デバイス ${i + 1}</span>
      </div>`
    ).join('');

    participantsModal.classList.remove('hidden');
  }

  showParticipantsBtn.addEventListener('click', showParticipantsModal);
  closeParticipantsModalBtn.addEventListener('click', () => {
    participantsModal.classList.add('hidden');
  });
  participantsModal.addEventListener('click', (e) => {
    if(e.target === participantsModal){
      participantsModal.classList.add('hidden');
    }
  });

  const nameInput = document.getElementById('nameInput');
  const textInput = document.getElementById('textInput');
  const addBtn = document.getElementById('addBtn');
  const chipsWrap = document.getElementById('categoryChips');
  const board = document.getElementById('board');
  const boardEmpty = document.getElementById('boardEmpty');
  const countBadges = document.getElementById('countBadges');
  const statusMsg = document.getElementById('statusMsg');
  const clearBtn = document.getElementById('clearBtn');
  const tidyBtn = document.getElementById('tidyBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  let categories = DEFAULT_CATEGORIES.slice();

  let selectedCategory = categories[0].id;
  let notes = [];
  let zCounter = 1;
  let noteSeq = 0;

  function catById(id){ return categories.find(c => c.id === id) || categories[0]; }

  function buildChips(){
    chipsWrap.innerHTML = '';
    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.type = 'button';
      const selected = cat.id === selectedCategory;
      chip.className = 'chip inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs ' +
        (selected ? 'border-amber bg-amber text-amberink font-bold' : 'border-[#323236] text-[#98979c] hover:border-[#46464c] hover:text-[#f5f4f0]');
      chip.dataset.cat = cat.id;
      chip.innerHTML = `<span class="w-2.5 h-2.5 rounded-sm inline-block" style="background:${cat.color}"></span>${cat.label}`;
      chip.addEventListener('click', () => {
        selectedCategory = cat.id;
        buildChips();
      });
      chipsWrap.appendChild(chip);
    });
  }

  function updateCountBadges(){
    countBadges.innerHTML = '';
    categories.forEach(cat => {
      const n = notes.filter(note => note.category === cat.id).length;
      const span = document.createElement('span');
      span.className = 'inline-flex items-center gap-1.5 border border-[#323236] rounded-md px-2.5 py-1 text-xs text-[#98979c] font-mono';
      span.innerHTML = `<span class="w-2 h-2 rounded-sm inline-block" style="background:${cat.color}"></span>${cat.label} ${n}`;
      countBadges.appendChild(span);
    });
    const total = document.createElement('span');
    total.className = 'inline-flex items-center border border-[#46464c] rounded-md px-2.5 py-1 text-xs text-[#f5f4f0] font-bold font-mono';
    total.textContent = `合計 ${notes.length}`;
    countBadges.appendChild(total);
  }

  function updateEmptyState(){
    boardEmpty.style.display = notes.length ? 'none' : 'flex';
  }

  function showStatus(msg, type){
    statusMsg.textContent = msg;
    statusMsg.className = 'text-sm px-3 py-2 rounded-md mt-3 border ' +
      (type === 'error' ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800');
    window.clearTimeout(showStatus._t);
    showStatus._t = window.setTimeout(() => {
      statusMsg.className = 'hidden';
    }, 2600);
  }

  function randomPosition(){
    const rect = board.getBoundingClientRect();
    const w = Math.max(rect.width, 320);
    const h = Math.max(rect.height, 400);
    const noteW = 168, noteH = 120;
    const x = 16 + Math.random() * Math.max(20, (w - noteW - 32));
    const y = 16 + Math.random() * Math.max(20, (h - noteH - 32));
    return { x, y };
  }

  function clamp(val, min, max){ return Math.max(min, Math.min(max, val)); }

  function makeDraggable(el, note){
    let dragging = false;
    let offsetX = 0, offsetY = 0;

    el.addEventListener('pointerdown', (e) => {
      if(e.target.closest('.note-del')) return;
      dragging = true;
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      zCounter += 1;
      el.style.zIndex = zCounter;
    });
    el.addEventListener('pointermove', (e) => {
      if(!dragging) return;
      const boardRect = board.getBoundingClientRect();
      let x = e.clientX - boardRect.left - offsetX;
      let y = e.clientY - boardRect.top - offsetY;
      x = clamp(x, -20, boardRect.width - 60);
      y = clamp(y, -10, boardRect.height - 30);
      note.x = x; note.y = y;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    });
    function endDrag(e){
      if(!dragging) return;
      dragging = false;
      try{ el.releasePointerCapture(e.pointerId); }catch(err){}
      // ドラッグ後の位置を他端末へ同期
      if (window.IkkenSync && window.IkkenSync.ready) {
        IkkenSync.update(note.id, { x: note.x, y: note.y, z: note.z }).catch(() => {});
      }
    }
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  function renderNote(note){
    const cat = catById(note.category);
    const el = document.createElement('div');
    el.className = 'note absolute w-[168px] min-h-[120px] rounded-md p-3 pt-4 cursor-grab select-none text-sm font-medium leading-snug text-white';
    el.style.left = note.x + 'px';
    el.style.top = note.y + 'px';
    el.style.background = cat.color;
    el.style.zIndex = note.z;
    el.innerHTML = `
      <button type="button" class="note-del absolute top-1 right-1.5 text-white/70 hover:text-white text-base leading-none px-1" aria-label="この意見を削除" title="削除">×</button>
      <div class="note-text">${note.name ? `<div class="text-[10px] text-white/75 mb-1 font-mono">${escapeHtml(note.name)}</div>` : ''}<div class="break-words whitespace-pre-wrap">${escapeHtml(note.text)}</div></div>
    `;
    el.querySelector('.note-del').addEventListener('click', () => {
      notes = notes.filter(n => n.id !== note.id);
      el.remove();
      updateCountBadges();
      updateEmptyState();

      // Supabase から削除（失敗してもローカルでは動作）
      if (window.IkkenSync && window.IkkenSync.ready) {
        IkkenSync.remove(note.id).catch(err => console.log('🗑️ Supabase 削除失敗:', err.message));
      }
    });
    makeDraggable(el, note);
    board.appendChild(el);
    note.el = el;
  }

  function escapeHtml(str){
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function addNote(){
    const text = textInput.value.trim();
    if(!text){
      showStatus('意見の内容を入力してください。', 'error');
      textInput.focus();
      return;
    }
    const pos = randomPosition();
    const note = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'n' + Date.now() + '-' + (++noteSeq) + '-' + Math.random().toString(36).slice(2),
      name: nameInput.value.trim(),
      text: text,
      category: selectedCategory,
      x: pos.x,
      y: pos.y,
      z: ++zCounter
    };
    notes.push(note);
    renderNote(note);
    updateCountBadges();
    updateEmptyState();
    textInput.value = '';
    textInput.focus();

    // Supabase に保存（失敗してもローカルでは動作）
    if (window.IkkenSync && window.IkkenSync.ready) {
      const deviceId = getDeviceId();
      IkkenSync.save(boardId, note, deviceId).catch(err => console.log('💾 Supabase 保存失敗:', err.message));
    }
  }

  function clearAll(){
    if(!notes.length) return;
    const ok = window.confirm('すべての意見を削除します。よろしいですか?');
    if(!ok) return;
    const removed = notes.slice();
    notes = [];
    board.querySelectorAll('.note').forEach(n => n.remove());
    // Supabase 側も削除（他端末に反映させる）
    if (window.IkkenSync && window.IkkenSync.ready) {
      removed.forEach(n => IkkenSync.remove(n.id).catch(err => console.log('🗑️ Supabase 削除失敗:', err.message)));
    }
    updateCountBadges();
    updateEmptyState();
    showStatus('ボードをリセットしました。', 'ok');
  }

  function tidyUp(){
    if(!notes.length) return;
    const boardRect = board.getBoundingClientRect();
    const noteW = 168, gap = 14;
    const cols = Math.max(1, Math.floor((boardRect.width - gap) / (noteW + gap)));
    let order = [];
    categories.forEach(cat => {
      order = order.concat(notes.filter(n => n.category === cat.id));
    });
    order.forEach((note, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      note.x = gap + col * (noteW + gap);
      note.y = gap + row * 136;
      if(note.el){
        note.el.style.left = note.x + 'px';
        note.el.style.top = note.y + 'px';
      }
    });
    // 整頓後の位置を他端末へ同期
    if (window.IkkenSync && window.IkkenSync.ready) {
      order.forEach(note => IkkenSync.update(note.id, { x: note.x, y: note.y, z: note.z }).catch(() => {}));
    }
    showStatus('カテゴリごとに整頓しました。', 'ok');
  }

  function toggleFullscreen(){
    const wrap = document.getElementById('boardFrame');
    if(!document.fullscreenElement){
      if(wrap.requestFullscreen){
        wrap.requestFullscreen().catch(() => {
          showStatus('この端末では全画面表示に対応していません。', 'error');
        });
      }
    } else {
      document.exitFullscreen();
    }
  }

  function getDeviceId(){
    let id = localStorage.getItem('ikkenboard_device_id');
    if(!id){
      id = crypto.randomUUID ? crypto.randomUUID() : 'd' + Math.random().toString(36).slice(2) + Date.now();
      localStorage.setItem('ikkenboard_device_id', id);
    }
    return id;
  }

  // ===== リアルタイム同期（IkkenSync） =====
  function upsertRemote(remote){
    const existing = notes.find(n => n.id === remote.id);
    if (existing) {
      existing.name = remote.name || '';
      existing.text = remote.text;
      existing.category = remote.category;
      existing.x = remote.x || 0;
      existing.y = remote.y || 0;
      if (existing.el) {
        existing.el.querySelector('.note-text').innerHTML = `${existing.name ? `<div class="text-[10px] text-white/75 mb-1 font-mono">${escapeHtml(existing.name)}</div>` : ''}<div class="break-words whitespace-pre-wrap">${escapeHtml(existing.text)}</div>`;
        existing.el.style.left = existing.x + 'px';
        existing.el.style.top = existing.y + 'px';
      }
    } else {
      const note = {
        id: remote.id,
        name: remote.name || '',
        text: remote.text,
        category: remote.category,
        x: remote.x || 0,
        y: remote.y || 0,
        z: remote.z || (++zCounter)
      };
      notes.push(note);
      renderNote(note);
      if (remote.z && Number(remote.z) >= zCounter) zCounter = Number(remote.z) + 1;
    }
    updateCountBadges();
    updateEmptyState();
  }

  function removeRemoteById(noteId){
    const note = notes.find(n => n.id === noteId);
    if (note && note.el) note.el.remove();
    notes = notes.filter(n => n.id !== noteId);
    updateCountBadges();
    updateEmptyState();
  }

  async function reloadRemote(){
    try {
      const rows = await IkkenSync.list(boardId);
      const localIds = new Set(notes.map(n => n.id));
      rows.forEach(r => upsertRemote(r));
      rows.forEach(r => localIds.delete(r.id));
      // ローカルにしかない付箋は、まだ Supabase 保存が完了していない可能性があるため残す
      updateCountBadges();
      updateEmptyState();
    } catch (err) {
      console.warn('ℹ️ リロード失敗:', err.message);
    }
  }

  function setLive(status){
    const box = document.getElementById('liveStatus');
    const dot = document.getElementById('liveDot');
    const text = document.getElementById('liveText');
    if (!box || !dot || !text) return;
    box.classList.remove('hidden');
    box.classList.add('inline-flex');
    const map = {
      SUBSCRIBED: ['bg-emerald-400', 'リアルタイム接続中'],
      CHANNEL_ERROR: ['bg-rose-400', '接続エラー（再接続中…）'],
      TIMED_OUT: ['bg-rose-400', 'タイムアウト（再接続中…）'],
      CLOSED: ['bg-amber', '切断'],
      CONNECTING: ['bg-amber', '接続中…']
    };
    const [color, label] = map[status] || map.CONNECTING;
    dot.className = 'inline-block w-2 h-2 rounded-full ' + (status === 'SUBSCRIBED' ? 'animate-pulse ' : '') + color;
    text.textContent = label;
  }

  // ===== カテゴリ管理（先生用） =====
  const CAT_COLORS = ['#10b981','#f43f5e','#3b82f6','#f59e0b','#a78bfa','#22d3ee','#fb7185','#84cc16'];

  function refreshCategoryUI(){
    if (!categories.find(c => c.id === selectedCategory)) selectedCategory = categories[0].id;
    buildChips();
    updateCountBadges();
    renderCatManager();
  }

  async function loadCategories(){
    if (!(window.IkkenSync && IkkenSync.ready)) return;
    try {
      const rows = await IkkenSync.listCategories(boardId);
      if (rows && rows.length > 0) {
        categories = rows.map(r => ({ id: r.id, label: r.label, color: r.color, sort: r.sort || 0 }));
      }
      // rows が空の場合はデフォルトのまま（未設定）
    } catch (err) {
      console.warn('ℹ️ カテゴリの読み込みに失敗:', err.message);
    }
    refreshCategoryUI();
  }

  function renderCatManager(){
    const list = document.getElementById('catManagerList');
    if (!list) return;
    list.innerHTML = '';
    categories.forEach(cat => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2 border border-[#323236] rounded-md px-2.5 py-1.5';
      const swatch = document.createElement('span');
      swatch.className = 'w-3.5 h-3.5 rounded-sm inline-block shrink-0';
      swatch.style.background = cat.color;
      const label = document.createElement('span');
      label.className = 'text-sm flex-1';
      label.textContent = cat.label;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'text-[#98979c] hover:text-rose-400 text-xs px-1';
      del.textContent = '✕';
      del.title = 'このカテゴリを削除';
      del.addEventListener('click', async () => {
        if (categories.length <= 1) { showStatus('カテゴリが1つもない状態にはできません。', 'error'); return; }
        if (!window.confirm(`カテゴリ「${cat.label}」を削除しますか？（付箋は削除されません）`)) return;
        categories = categories.filter(c => c.id !== cat.id);
        if (window.IkkenSync && IkkenSync.ready) {
          try { await IkkenSync.removeCategory(cat.id); } catch (err) { console.warn('ℹ️ カテゴリ削除の共有に失敗:', err.message); }
        }
        refreshCategoryUI();
      });
      row.append(swatch, label, del);
      list.appendChild(row);
    });
  }

  function initCatManager(){
    const openBtn = document.getElementById('catManageBtn');
    const modal = document.getElementById('catManagerModal');
    if (!openBtn || !modal) return;
    const closeBtn = document.getElementById('catManagerClose');
    const nameIn = document.getElementById('catNewName');
    const colorIn = document.getElementById('catNewColor');
    const addBtn2 = document.getElementById('catAddBtn');

    openBtn.addEventListener('click', () => {
      renderCatManager();
      modal.classList.remove('hidden');
    });
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    addBtn2.addEventListener('click', async () => {
      const label = nameIn.value.trim();
      if (!label) { showStatus('カテゴリ名を入力してください。', 'error'); nameIn.focus(); return; }
      if (categories.some(c => c.label === label)) { showStatus('同じ名前のカテゴリがあります。', 'error'); return; }
      const cat = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'cat' + Date.now() + Math.random().toString(36).slice(2),
        label,
        color: colorIn.value,
        sort: categories.length
      };
      categories.push(cat);
      if (window.IkkenSync && IkkenSync.ready) {
        try { await IkkenSync.addCategory(boardId, cat); } catch (err) { showStatus('カテゴリの共有に失敗しました。', 'error'); console.warn(err); }
      }
      nameIn.value = '';
      refreshCategoryUI();
      showStatus(`カテゴリ「${label}」を追加しました。`, 'ok');
    });
    nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addBtn2.click(); } });
  }

  (async function initSync(){
    if (!window.IkkenSync) return;
    const ready = IkkenSync.init({ upsert: upsertRemote, remove: removeRemoteById, reload: async () => { await reloadRemote(); await loadCategories(); }, onStatus: setLive });
    IkkenSync.ready = ready;
    initCatManager();
    if (!ready) return;
    await loadCategories();
    try {
      const rows = await IkkenSync.list(boardId);
      rows.forEach(r => upsertRemote(r));
    } catch (err) {
      console.warn('ℹ️ 既存の付箋を読み込めません:', err.message);
    }
    setLive('CONNECTING');
    IkkenSync.subscribe(boardId);
  })();

  addBtn.addEventListener('click', addNote);
  textInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && !e.isComposing){
      e.preventDefault();
      addNote();
    }
  });
  clearBtn.addEventListener('click', clearAll);
  tidyBtn.addEventListener('click', tidyUp);
  fullscreenBtn.addEventListener('click', toggleFullscreen);

  buildChips();
  updateCountBadges();
  updateEmptyState();
})();
