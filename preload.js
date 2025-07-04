// preload.js
// 安全地暴露 Electron API 給 React 應用

const { contextBridge, ipcRenderer } = require('electron');

console.log('preload.js 已載入');

// 暴露安全的 API 到 window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // 檔案選擇對話框
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  
  // ffmpeg 影片處理相關
  generateReverseVideo: (inputPath, outputPath) => 
    ipcRenderer.invoke('generate-reverse-video', { inputPath, outputPath }),
  
  // 複製檔案到臨時目錄
  copyFileToTemp: (fileBuffer, fileName, index) =>
    ipcRenderer.invoke('copy-file-to-temp', { fileBuffer, fileName, index }),
  
  // 取得臨時目錄
  getTempDir: () => ipcRenderer.invoke('get-temp-dir'),
  
  // 清理臨時檔案
  cleanupTempFiles: (filePaths) => ipcRenderer.invoke('cleanup-temp-files', filePaths),
  
  // 監聽轉換事件
  onConversionStart: (callback) => {
    ipcRenderer.on('conversion-start', (event, data) => callback(data));
  },
  
  onConversionProgress: (callback) => {
    ipcRenderer.on('conversion-progress', (event, data) => callback(data));
  },
  
  onConversionComplete: (callback) => {
    ipcRenderer.on('conversion-complete', (event, data) => callback(data));
  },
  
  onConversionError: (callback) => {
    ipcRenderer.on('conversion-error', (event, data) => callback(data));
  },
  
  // 移除事件監聽器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

console.log('electronAPI 已暴露到 window 物件'); 