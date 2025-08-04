// export-preload.js
// 匯出對話框的 preload 腳本

const { contextBridge, ipcRenderer } = require('electron');

console.log('export-preload.js 已載入');

// 暴露匯出對話框相關的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 監聽初始化資料
  onInitExportData: (callback) => {
    ipcRenderer.on('init-export-data', (event, data) => {
      console.log('export-preload 收到初始化資料:', data);
      callback(data);
    });
  },

  // 傳送匯出結果回主進程
  sendExportResult: (result) => {
    console.log('export-preload 傳送結果:', result);
    ipcRenderer.send('export-dialog-result', result);
  }
});

console.log('匯出對話框 electronAPI 已暴露到 window 物件');