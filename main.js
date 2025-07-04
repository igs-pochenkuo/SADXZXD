// main.js
// Electron 主進程入口，負責建立應用視窗與載入 React 頁面

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');

// 建立主視窗
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    webPreferences: {
      nodeIntegration: false, // 建議關閉 nodeIntegration，提升安全性
      contextIsolation: true, // 啟用 contextIsolation
      preload: path.join(__dirname, 'preload.js') // 可選：用於安全的 IPC
    },
    resizable: true // 可調整視窗大小
  });

  // 載入 React 應用（開發模式與發行模式路徑不同）
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, 'build', 'index.html'));
  }
}

// 應用啟動時建立視窗
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 關閉所有視窗時結束應用（Mac 例外）
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 可選：檔案選擇對話框（供 React 端呼叫）
ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(options);
  return result;
}); 