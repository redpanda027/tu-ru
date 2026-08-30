(function(){
  const CATEGORIES = [
    { id: 'agree',    label: '賛成',        color: '#cdeccd' },
    { id: 'disagree', label: '反対',        color: '#f6cdd0' },
    { id: 'question', label: '疑問',        color: '#cfe0f5' },
    { id: 'idea',     label: 'アイデア・意見', color: '#fbe9ad' }
  ];

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
      chip.className = 'chip' + (cat.id === selectedCategory ? ' selected' : '');
      chip.dataset.cat = cat.id;
      chip.innerHTML = `<span class="sw" style="background:${cat.color}"></span>${cat.label}`;
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
      span.innerHTML = `<span class="sw" style="background:${cat.color}"></span>${cat.label} ${n}`;
      countBadges.appendChild(span);
    });
    const total = document.createElement('span');
    total.innerHTML = `<strong>合計 ${notes.length}</strong>`;
    countBadges.appendChild(total);
  }

  function updateEmptyState(){
    boardEmpty.style.display = notes.length ? 'none' : 'flex';
  }

  function showStatus(msg, type){
    statusMsg.textContent = msg;
    statusMsg.className = 'status-msg show ' + type;
    window.clearTimeout(showStatus._t);
    showStatus._t = window.setTimeout(() => {
      statusMsg.className = 'status-msg';
    }, 2600);
  }

  function randomPosition(){
    const rect = board.getBoundingClientRect();
    const w = Math.max(rect.width, 320);
    const h = Math.max(rect.height, 400);
    const noteW = 170, noteH = 130;
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
    el.className = 'note';
    el.style.left = note.x + 'px';
    el.style.top = note.y + 'px';
    el.style.background = cat.color;
    el.style.transform = `rotate(${note.rotate}deg)`;
    el.style.zIndex = note.z;
    el.innerHTML = `
      <button type="button" class="note-del" aria-label="この意見を削除" title="削除">×</button>
      ${note.name ? `<div class="note-name">${escapeHtml(note.name)}</div>` : ''}
      <div class="note-text">${escapeHtml(note.text)}</div>
    `;
    el.querySelector('.note-del').addEventListener('click', () => {
      notes = notes.filter(n => n.id !== note.id);
      el.remove();
      updateCountBadges();
      updateEmptyState();
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
      rotate: Math.round((Math.random() * 8 - 4) * 10) / 10,
      z: ++zCounter
    };
    notes.push(note);
    renderNote(note);
    updateCountBadges();
    updateEmptyState();
    textInput.value = '';
    textInput.focus();
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
    const noteW = 170, gap = 16;
    const cols = Math.max(1, Math.floor((boardRect.width - gap) / (noteW + gap)));
    let order = [];
    CATEGORIES.forEach(cat => {
      order = order.concat(notes.filter(n => n.category === cat.id));
    });
    order.forEach((note, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      note.x = gap + col * (noteW + gap);
      note.y = gap + row * (150);
      note.rotate = Math.round((Math.random() * 4 - 2) * 10) / 10;
      if(note.el){
        note.el.style.left = note.x + 'px';
        note.el.style.top = note.y + 'px';
        note.el.style.transform = `rotate(${note.rotate}deg)`;
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
    if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){
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
