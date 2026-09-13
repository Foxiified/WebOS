document.addEventListener('DOMContentLoaded', () => {
  const MAX_STORAGE = 10 * 1024 * 1024;
  const DEF_BG = "https://i.pinimg.com/originals/ec/b9/2d/ecb92d18c7855c986a5571c1b6f7cad2.jpg";
  let topZ = 50;

  const bootBtn = document.getElementById('boot-button');
  const welcome = document.getElementById('welcome-screen');
  const desktop = document.getElementById('desktop');

  bootBtn.addEventListener('click', () => {
    welcome.style.display = 'none';
    desktop.classList.remove('desktop-hidden');
    initClock();
    loadBg();
    renderFiles();
  });

  function initClock() {
    const clock = document.getElementById('system-clock');
    const update = () => clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    update();
    setInterval(update, 1000);
  }

  document.querySelectorAll('.dock button').forEach(btn => {
    btn.addEventListener('click', e => openWin(e.currentTarget.getAttribute('data-launch')));
  });

  document.querySelectorAll('.app').forEach(win => {
    const closeBtn = win.querySelector('.window-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => win.style.display = 'none');

    win.addEventListener('mousedown', () => win.style.zIndex = ++topZ);

    const header = win.querySelector('[data-draggable="true"]');
    if (header) {
      let dragging = false, startX = 0, startY = 0;

      header.addEventListener('mousedown', e => {
        if (e.target.tagName === 'BUTTON') return;
        dragging = true;
        startX = e.clientX - win.offsetLeft;
        startY = e.clientY - win.offsetTop;
        win.style.zIndex = ++topZ;
      });

      document.addEventListener('mousemove', e => {
        if (!dragging) return;
        win.style.left = `${e.clientX - startX}px`;
        win.style.top = `${e.clientY - startY}px`;
      });

      document.addEventListener('mouseup', () => dragging = false);
    }
  });

  function openWin(id) {
    const w = document.getElementById(`app-window-${id}`);
    if (!w) return;
    w.style.display = 'flex';
    w.style.zIndex = ++topZ;
    if (id === 'drawing') setTimeout(initCanvas, 50);
  }

  const bgInput = document.getElementById('background-file-input');
  const bgReset = document.getElementById('background-reset-button');

  function loadBg() {
    desktop.style.backgroundImage = `url("${localStorage.getItem('bg') || DEF_BG}")`;
  }

  bgInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      desktop.style.backgroundImage = `url("${ev.target.result}")`;
      localStorage.setItem('bg', ev.target.result);
    };
    reader.readAsDataURL(file);
  });

  bgReset.addEventListener('click', () => {
    localStorage.removeItem('bg');
    desktop.style.backgroundImage = `url("${DEF_BG}")`;
    bgInput.value = '';
  });

  const fileInput = document.getElementById('file-upload-input');
  const fileList = document.getElementById('file-list-container');
  const storageBar = document.getElementById('storage-bar-fill');
  const storageText = document.getElementById('storage-status-text');

  const getFiles = () => JSON.parse(localStorage.getItem('files') || '[]');
  const saveFiles = arr => localStorage.setItem('files', JSON.stringify(arr));

  function renderFiles() {
    const files = getFiles();
    const used = files.reduce((acc, f) => acc + f.size, 0);
    
    storageText.textContent = `${(used / 1048576).toFixed(2)} MB / 10.00 MB`;
    storageBar.style.width = `${Math.min((used / MAX_STORAGE) * 100, 100)}%`;

    fileList.innerHTML = '';
    if (files.length === 0) {
      fileList.innerHTML = '<p style="font-size: 12px; color: #777;">No files yet.</p>';
      return;
    }

    files.forEach((f, idx) => {
      const row = document.createElement('div');
      row.className = 'file-row-item';
      row.innerHTML = `
        <span>📄 ${f.name}</span>
        <div class="file-row-actions">
          <button type="button" class="file-action-btn" data-act="dl" data-i="${idx}">Download</button>
          <button type="button" class="file-action-btn" data-act="del" data-i="${idx}">Delete</button>
        </div>
      `;
      fileList.appendChild(row);
    });
  }

  fileInput.addEventListener('change', e => {
    let files = getFiles();
    let total = files.reduce((acc, f) => acc + f.size, 0);

    Array.from(e.target.files).forEach(f => {
      if (total + f.size > MAX_STORAGE) {
        alert("Storage full!");
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        files.push({ name: f.name, size: f.size, data: ev.target.result });
        saveFiles(files);
        renderFiles();
      };
      reader.readAsDataURL(f);
      total += f.size;
    });
    fileInput.value = '';
  });

  fileList.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    const i = parseInt(btn.getAttribute('data-i'), 10);
    let files = getFiles();

    if (act === 'dl') {
      const a = document.createElement('a');
      a.href = files[i].data;
      a.download = files[i].name;
      a.click();
    } else if (act === 'del') {
      files.splice(i, 1);
      saveFiles(files);
      renderFiles();
    }
  });

  const notesArea = document.getElementById('notes-textarea');
  const saveNotesBtn = document.getElementById('notes-save-button');
  const clearNotesBtn = document.getElementById('notes-clear-button');
  const notesStatus = document.getElementById('notes-status-indicator');

  notesArea.value = localStorage.getItem('notes') || '';

  saveNotesBtn.addEventListener('click', () => {
    localStorage.setItem('notes', notesArea.value);
    notesStatus.textContent = 'Saved';
  });

  notesArea.addEventListener('input', () => {
    notesStatus.textContent = 'Unsaved';
  });

  clearNotesBtn.addEventListener('click', () => {
    if (confirm('Clear notes?')) {
      notesArea.value = '';
      localStorage.removeItem('notes');
      notesStatus.textContent = 'Cleared';
    }
  });

  const termInput = document.getElementById('terminal-text-input');
  const termOut = document.getElementById('terminal-output');

  termInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const cmd = termInput.value.trim().toLowerCase();
    if (!cmd) return;

    termOut.innerHTML += `\n> ${cmd}`;

    if (cmd === 'help') {
      termOut.innerHTML += '\ncmds: help, clear, whoami, date, about, neofetch';
    } else if (cmd === 'clear') {
      termOut.innerHTML = '';
    } else if (cmd === 'whoami') {
      termOut.innerHTML += '\nuser';
    } else if (cmd === 'date') {
      termOut.innerHTML += `\n${new Date()}`;
    } else if (cmd === 'about') {
      termOut.innerHTML += '\nSchoolOS v1';
    } else if (cmd === 'neofetch') {
      termOut.innerHTML += `\nSchoolOS\nFiles stored: ${getFiles().length}`;
    } else {
      termOut.innerHTML += '\ncommand not found';
    }

    termInput.value = '';
    termOut.scrollTop = termOut.scrollHeight;
  });

  const canvas = document.getElementById('drawing-canvas');
  const ctx = canvas.getContext('2d');
  const drawBtn = document.getElementById('tool-draw-button');
  const eraseBtn = document.getElementById('tool-erase-button');
  const clearBtn = document.getElementById('tool-clear-button');
  const saveDrawBtn = document.getElementById('tool-save-button');
  const colorPicker = document.getElementById('drawing-color-picker');
  const sizeSlider = document.getElementById('drawing-size-slider');
  const sizeLabel = document.getElementById('drawing-size-label');

  let drawing = false, erasing = false;

  function initCanvas() {
    const computedWidth = canvas.parentElement.clientWidth;
    const computedHeight = canvas.parentElement.clientHeight - 40;

    if (canvas.width === computedWidth && canvas.height === computedHeight) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width || 300;
    tempCanvas.height = canvas.height || 150;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);

    canvas.width = computedWidth;
    canvas.height = computedHeight;

    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, computedWidth, computedHeight);
  }

  canvas.addEventListener('mousedown', e => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  });

  canvas.addEventListener('mousemove', e => {
    if (!drawing) return;
    ctx.lineWidth = sizeSlider.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
    ctx.strokeStyle = colorPicker.value;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  });

  window.addEventListener('mouseup', () => drawing = false);

  drawBtn.addEventListener('click', () => {
    erasing = false;
    drawBtn.classList.add('active');
    eraseBtn.classList.remove('active');
  });

  eraseBtn.addEventListener('click', () => {
    erasing = true;
    eraseBtn.classList.add('active');
    drawBtn.classList.remove('active');
  });

  sizeSlider.addEventListener('input', e => sizeLabel.textContent = `${e.target.value}px`);
  clearBtn.addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));

  saveDrawBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL();
    a.download = 'drawing.png';
    a.click();
  });

  const drawingWindow = document.getElementById('app-window-drawing');
  const resizeObserver = new ResizeObserver(() => {
    if (drawingWindow.style.display === 'flex') {
      initCanvas();
    }
  });
  resizeObserver.observe(drawingWindow);
});