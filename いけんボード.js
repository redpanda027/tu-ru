(function(){
  const CATEGORIES = [
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
    let boardId = localStorage.getItem('ikkenboard_id');
    if(!boardId){
      boardId = generateBoardId();
      localStorage.setItem('ikkenboard_id', boardId);
    }
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
    
    // QR コード生成
    qrContainer.innerHTML = '';
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

  let selectedCategory = CATEGORIES[0].id;
  let notes = [];
  let zCounter = 1;
  let noteSeq = 0;

  function catById(id){ return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]; }

  function buildChips(){
    chipsWrap.innerHTML = '';
    CATEGORIES.forEach(cat => {
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
    CATEGORIES.forEach(cat => {
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
      ${note.name ? `<div class="text-[10px] text-white/75 mb-1 font-mono">${escapeHtml(note.name)}</div>` : ''}
      <div class="break-words whitespace-pre-wrap">${escapeHtml(note.text)}</div>
    `;
    el.querySelector('.note-del').addEventListener('click', () => {
      notes = notes.filter(n => n.id !== note.id);
      el.remove();
      updateCountBadges();
      updateEmptyState();
      
      // Supabase から削除（失敗してもローカルでは動作）
      if (typeof deleteNoteFromSupabase !== 'undefined') {
        deleteNoteFromSupabase(note.id).catch(err => {
          console.log('🗑️ Supabase 削除: ローカルで動作');
        });
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
      id: 'n' + (++noteSeq),
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
    if (typeof saveNoteToSupabase !== 'undefined' && typeof getBoardId !== 'undefined') {
      try {
        const boardId = getBoardId('ikken');
        const deviceId = typeof getDeviceId !== 'undefined' ? getDeviceId() : 'unknown';
        saveNoteToSupabase(boardId, deviceId, note).catch(err => {
          console.log('💾 Supabase への保存: ローカルで動作');
        });
      } catch (err) {
        console.log('💾 Supabase 保存スキップ:', err.message);
      }
    }
  }

  function clearAll(){
    if(!notes.length) return;
    const ok = window.confirm('すべての意見を削除します。よろしいですか?');
    if(!ok) return;
    notes = [];
    board.querySelectorAll('.note').forEach(n => n.remove());
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
    CATEGORIES.forEach(cat => {
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

  addBtn.addEventListener('click', addNote);
  textInput.addEventListener('keydown', (e) => {
    if((e.key === 'Enter') && (e.metaKey || e.ctrlKey)){
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
