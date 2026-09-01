// 共有UI初期化関数
function initializeShareUI(boardType) {
  // グローバルの getBoardId を使用（supabase-config.js で定義）
  // ここで重複定義しない
  let boardId;
  try {
    boardId = getBoardId(boardType);
  } catch (err) {
    console.warn('getBoardId not available, using local generation');
    boardId = boardType.charAt(0).toUpperCase() + Math.random().toString(36).substr(2, 9).toUpperCase();
    localStorage.setItem(`board_${boardType}_id`, boardId);
  }
  const boardIdDisplay = document.getElementById('boardIdDisplay');
  const shareUrlDisplay = document.getElementById('shareUrlDisplay');
  const copyBoardIdBtn = document.getElementById('copyBoardIdBtn');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const participantCount = document.getElementById('participantCount');
  const qrContainer = document.getElementById('qrContainer');
  const showParticipantsBtn = document.getElementById('showParticipantsBtn');
  const participantsModal = document.getElementById('participantsModal');
  const participantsList = document.getElementById('participantsList');
  const closeParticipantsModalBtn = document.getElementById('closeParticipantsModalBtn');

  if (!boardIdDisplay) return; // 共有UI がない場合はスキップ

  function updateShareLinks() {
    const boardId = getBoardId(boardType);
    if (boardIdDisplay) boardIdDisplay.value = boardId;
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?boardId=${boardId}`;
    if (shareUrlDisplay) shareUrlDisplay.value = shareUrl;
    
    // QR コード生成（失敗時もエラーを出さない）
    if (qrContainer) {
      try {
        qrContainer.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
          new QRCode(qrContainer, {
            text: shareUrl,
            width: 120,
            height: 120,
            colorDark: '#121214',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
        } else {
          // QRCode ライブラリが読み込まれていない場合
          qrContainer.innerHTML = '<div style="width:120px;height:120px;display:flex;align-items:center;justify-content:center;color:#98979c;font-size:12px;text-align:center;">QR コード<br>ライブラリ<br>未読み込み</div>';
          console.warn('QRCode library not loaded');
        }
      } catch (err) {
        qrContainer.innerHTML = '<div style="width:120px;height:120px;display:flex;align-items:center;justify-content:center;color:#98979c;font-size:12px;text-align:center;">QR コード<br>生成失敗</div>';
        console.warn('QR code generation failed:', err);
      }
    }
  }

  if (copyBoardIdBtn) {
    copyBoardIdBtn.addEventListener('click', () => {
      boardIdDisplay.select();
      document.execCommand('copy');
      const originalText = copyBoardIdBtn.textContent;
      copyBoardIdBtn.textContent = '✓ コピーしました';
      setTimeout(() => { copyBoardIdBtn.textContent = originalText; }, 2000);
    });
  }

  if (copyUrlBtn) {
    copyUrlBtn.addEventListener('click', () => {
      shareUrlDisplay.select();
      document.execCommand('copy');
      const originalText = copyUrlBtn.textContent;
      copyUrlBtn.textContent = '✓ コピーしました';
      setTimeout(() => { copyUrlBtn.textContent = originalText; }, 2000);
    });
  }

  function updateParticipantInfo() {
    const boardId = getBoardId(boardType);  // ← boardType パラメータを追加
    const key = `board_${boardType}_participants_${boardId}`;
    let participants = JSON.parse(localStorage.getItem(key) || '[]');
    const now = Date.now();
    participants = participants.filter(p => now - p.timestamp < 3600000);
    
    const deviceId = localStorage.getItem('device_id') || 
                     ('d' + Math.random().toString(36).substr(2, 9));
    if (!localStorage.getItem('device_id')) {
      localStorage.setItem('device_id', deviceId);
    }
    
    if (!participants.find(p => p.id === deviceId)) {
      participants.push({ id: deviceId, timestamp: now });
    } else {
      participants = participants.map(p => p.id === deviceId ? { id: deviceId, timestamp: now } : p);
    }
    localStorage.setItem(key, JSON.stringify(participants));
    
    if (participantCount) participantCount.textContent = participants.length;
  }

  function showParticipantsModal() {
    if (!participantsModal) return;
    const boardId = getBoardId(boardType);  // ← boardType パラメータを追加
    const key = `board_${boardType}_participants_${boardId}`;
    const participants = JSON.parse(localStorage.getItem(key) || '[]');
    
    participantsList.innerHTML = participants.map((p, i) => 
      `<div class="flex items-center gap-2 p-2 bg-panel2 rounded text-xs">
        <span class="w-2 h-2 rounded-full bg-amber"></span>
        <span class="text-muted">デバイス ${i + 1}</span>
      </div>`
    ).join('');
    
    participantsModal.classList.remove('hidden');
  }

  updateShareLinks();
  updateParticipantInfo();
  setInterval(updateParticipantInfo, 30000);

  if (showParticipantsBtn) {
    showParticipantsBtn.addEventListener('click', showParticipantsModal);
  }
  if (closeParticipantsModalBtn) {
    closeParticipantsModalBtn.addEventListener('click', () => {
      participantsModal.classList.add('hidden');
    });
  }
  if (participantsModal) {
    participantsModal.addEventListener('click', (e) => {
      if (e.target === participantsModal) {
        participantsModal.classList.add('hidden');
      }
    });
  }
}
