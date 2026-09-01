// 共有UI初期化関数
function initializeShareUI(boardType) {
  function generateBoardId() {
    return boardType.charAt(0).toUpperCase() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  function getBoardId() {
    const key = `board_${boardType}_id`;
    let boardId = localStorage.getItem(key);
    if (!boardId) {
      boardId = generateBoardId();
      localStorage.setItem(key, boardId);
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
  const showParticipantsBtn = document.getElementById('showParticipantsBtn');
  const participantsModal = document.getElementById('participantsModal');
  const participantsList = document.getElementById('participantsList');
  const closeParticipantsModalBtn = document.getElementById('closeParticipantsModalBtn');

  if (!boardIdDisplay) return; // 共有UI がない場合はスキップ

  function updateShareLinks() {
    const boardId = getBoardId();
    if (boardIdDisplay) boardIdDisplay.value = boardId;
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?boardId=${boardId}`;
    if (shareUrlDisplay) shareUrlDisplay.value = shareUrl;
    
    if (qrContainer && typeof QRCode !== 'undefined') {
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
    const boardId = getBoardId();
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
    const boardId = getBoardId();
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
