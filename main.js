// main.js
// Electron 主進程入口，負責建立應用視窗與載入 React 頁面

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

// ffmpeg 相關依賴
const ffmpeg = require('fluent-ffmpeg');

// 動態設定 ffmpeg 路徑
let ffmpegPath;
if (app.isPackaged) {
  // 打包後的路徑：在 app.asar.unpacked 目錄中
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  ffmpegPath = ffmpegInstaller.path.replace('app.asar', 'app.asar.unpacked');
  console.log('打包模式 - ffmpeg 路徑:', ffmpegPath);
} else {
  // 開發模式路徑
  ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  console.log('開發模式 - ffmpeg 路徑:', ffmpegPath);
}

// 設定 ffmpeg 執行檔路徑
ffmpeg.setFfmpegPath(ffmpegPath);
console.log('ffmpeg 路徑設定為:', ffmpegPath);

// 驗證 ffmpeg 是否存在
const ffmpegExists = fs.existsSync(ffmpegPath);
console.log('ffmpeg 檔案是否存在:', ffmpegExists);
if (!ffmpegExists) {
  console.error('⚠️ ffmpeg 可執行檔不存在:', ffmpegPath);
} else {
  // 測試 ffmpeg 是否可以執行
  const { exec } = require('child_process');
  exec(`"${ffmpegPath}" -version`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ ffmpeg 執行測試失敗:', error.message);
    } else {
      console.log('✅ ffmpeg 執行測試成功');
      console.log('ffmpeg 版本資訊:', stdout.split('\n')[0]);
    }
  });
}

// 建立靜態檔案伺服器
let tempDirPath = null;

// 註冊自定義 protocol 來提供臨時檔案
app.whenReady().then(() => {
  console.log('Electron 應用準備就緒');
  
  // 設定臨時目錄路徑
  tempDirPath = path.join(os.tmpdir(), 'banner-preview-tool');
  if (!fs.existsSync(tempDirPath)) {
    fs.mkdirSync(tempDirPath, { recursive: true });
  }
  
  // 註冊 temp-file protocol
  const { protocol } = require('electron');
  protocol.registerFileProtocol('temp-file', (request, callback) => {
    const filename = request.url.substr('temp-file://'.length);
    const filePath = path.join(tempDirPath, filename);
    console.log('提供臨時檔案:', filePath);
    callback(filePath);
  });
  
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 建立主視窗
function createWindow() {
  console.log('建立 Electron 主視窗...');
  
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

  console.log('preload.js 路徑:', path.join(__dirname, 'preload.js'));
  console.log('preload.js 是否存在:', fs.existsSync(path.join(__dirname, 'preload.js')));

  // 載入 React 應用（開發模式與發行模式路徑不同）
  const isDev = !app.isPackaged; // 更可靠的開發模式偵測
  console.log('是否為開發模式:', isDev);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  if (isDev) {
    console.log('載入開發模式 URL: http://localhost:3000');
    win.loadURL('http://localhost:3000');
    
    // 開發模式下開啟開發者工具
    win.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, 'build', 'index.html');
    console.log('載入發行模式檔案:', indexPath);
    win.loadFile(indexPath);
  }
}

// 關閉所有視窗時結束應用（Mac 例外）
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 可選：檔案選擇對話框（供 React 端呼叫）
ipcMain.handle('select-file', async (event, options) => {
  console.log('收到 select-file IPC 請求');
  const result = await dialog.showOpenDialog(options);
  return result;
});

// 新增：影片倒播轉換功能
ipcMain.handle('generate-reverse-video', async (event, { inputPath, outputPath }) => {
  console.log('收到 generate-reverse-video IPC 請求:', { inputPath, outputPath });
  return new Promise((resolve, reject) => {
    // 確保輸出目錄存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    ffmpeg(inputPath)
      .videoFilters('reverse')
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('開始轉換影片:', commandLine);
        event.sender.send('conversion-start', { inputPath, outputPath });
      })
      .on('progress', (progress) => {
        console.log('轉換進度:', progress.percent + '%');
        event.sender.send('conversion-progress', { 
          inputPath, 
          outputPath, 
          percent: progress.percent || 0 
        });
      })
      .on('end', () => {
        console.log('影片轉換完成:', outputPath);
        event.sender.send('conversion-complete', { inputPath, outputPath });
        resolve({ success: true, outputPath });
      })
      .on('error', (err) => {
        console.error('影片轉換錯誤:', err);
        event.sender.send('conversion-error', { inputPath, error: err.message });
        reject({ success: false, error: err.message });
      })
      .run();
  });
});

// 新增：複製檔案到臨時目錄
ipcMain.handle('copy-file-to-temp', async (event, { fileBuffer, fileName, index }) => {
  console.log('收到 copy-file-to-temp IPC 請求:', { fileName, index, bufferSize: fileBuffer.byteLength });
  try {
    const tempDir = path.join(os.tmpdir(), 'banner-preview-tool');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop();
    const originalFileName = `original_${timestamp}_${index}.${fileExtension}`;
    const reverseFileName = `reverse_${timestamp}_${index}.${fileExtension}`;
    const originalPath = path.join(tempDir, originalFileName);
    const reversePath = path.join(tempDir, reverseFileName);
    
    // 寫入檔案
    fs.writeFileSync(originalPath, Buffer.from(fileBuffer));
    
    return { 
      success: true, 
      originalPath, 
      reversePath,
      // 新增：提供 protocol URL
      originalFileName,
      reverseFileName,
      originalUrl: `temp-file://${originalFileName}`,
      reverseUrl: `temp-file://${reverseFileName}`
    };
  } catch (error) {
    console.error('複製檔案錯誤:', error);
    return { success: false, error: error.message };
  }
});

// 新增：取得臨時目錄路徑
ipcMain.handle('get-temp-dir', async () => {
  const tempDir = path.join(os.tmpdir(), 'banner-preview-tool');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
});

// 新增：清理臨時檔案
ipcMain.handle('cleanup-temp-files', async (event, filePaths) => {
  try {
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('已清理臨時檔案:', filePath);
      }
    }
    return { success: true };
  } catch (error) {
    console.error('清理臨時檔案錯誤:', error);
    return { success: false, error: error.message };
  }
});

// 新增：測試 ffmpeg 功能
ipcMain.handle('test-ffmpeg', async (event) => {
  console.log('收到 test-ffmpeg IPC 請求');
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    // 測試 ffmpeg 是否存在
    if (!fs.existsSync(ffmpegPath)) {
      resolve({
        success: false,
        error: `ffmpeg 可執行檔不存在: ${ffmpegPath}`,
        path: ffmpegPath
      });
      return;
    }
    
    // 測試 ffmpeg 是否可以執行
    exec(`"${ffmpegPath}" -version`, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          error: `ffmpeg 執行失敗: ${error.message}`,
          path: ffmpegPath
        });
      } else {
        const versionLine = stdout.split('\n')[0];
        resolve({
          success: true,
          version: versionLine,
          path: ffmpegPath
        });
      }
    });
  });
});

// ==================== 匯出功能相關 IPC 處理程序 ====================

// 設定檔案路徑
const settingsFilePath = path.join(os.homedir(), '.banner-preview-tool-settings.json');

// 載入匯出設定
ipcMain.handle('load-export-settings', async () => {
  console.log('收到 load-export-settings IPC 請求');
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf8');
      const settings = JSON.parse(data);
      console.log('載入設定成功:', settings);
      return settings;
    } else {
      console.log('設定檔案不存在，返回預設設定');
      return { lobbyDefinePath: '' };
    }
  } catch (error) {
    console.error('載入設定失敗:', error);
    return { lobbyDefinePath: '' };
  }
});

// 保存匯出設定
ipcMain.handle('save-export-settings', async (event, settings) => {
  console.log('收到 save-export-settings IPC 請求:', settings);
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf8');
    console.log('保存設定成功');
    return { success: true };
  } catch (error) {
    console.error('保存設定失敗:', error);
    return { success: false, error: error.message };
  }
});

// 開啟匯出預覽對話框
ipcMain.handle('open-export-dialog', async (event, data) => {
  console.log('收到 open-export-dialog IPC 請求');
  
  return new Promise((resolve) => {
    // 創建模態對話框視窗
    const exportWindow = new BrowserWindow({
      width: 600,
      height: 700,
      modal: true,
      parent: BrowserWindow.fromWebContents(event.sender),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: app.isPackaged 
          ? path.join(process.resourcesPath, 'app.asar.unpacked', 'export-preload.js')
          : path.join(__dirname, 'export-preload.js')
      },
      title: '匯出設定預覽',
      resizable: false,
      show: false
    });

    // 載入匯出對話框 HTML
    const htmlPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'export-dialog.html')
      : path.join(__dirname, 'export-dialog.html');
    console.log('匯出對話框 HTML 路徑:', htmlPath);
    exportWindow.loadFile(htmlPath);

    exportWindow.once('ready-to-show', () => {
      exportWindow.show();
      
      // 傳送資料到對話框
      exportWindow.webContents.send('init-export-data', data);
    });

    // 監聽對話框回傳的結果
    ipcMain.once('export-dialog-result', (resultEvent, result) => {
      exportWindow.close();
      resolve(result);
    });

    // 處理視窗關閉事件（用戶直接關閉視窗）
    exportWindow.on('closed', () => {
      // 移除事件監聽器，避免記憶體洩漏
      ipcMain.removeAllListeners('export-dialog-result');
      resolve({ success: true, canceled: true });
    });
  });
});

// 執行匯出流程
ipcMain.handle('execute-export', async (event, { targetPath, exportData }) => {
  console.log('收到 execute-export IPC 請求');
  console.log('目標路徑:', targetPath);
  console.log('匯出資料:', exportData);

  try {
    // 創建臨時 JSON 檔案
    const tempDir = path.join(os.tmpdir(), 'banner-preview-export');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempJsonPath = path.join(tempDir, `export_${Date.now()}.json`);
    fs.writeFileSync(tempJsonPath, JSON.stringify(exportData, null, 2), 'utf8');
    console.log('臨時 JSON 檔案已創建:', tempJsonPath);

    // 執行 Python 腳本
    const scriptPath = './merge_script.exe'//path.join(__dirname, 'merge_script.exe'); // 假設腳本在同一目錄
    const command = `"${scriptPath}" --target "${targetPath}" --input "${tempJsonPath}"`;
    
    console.log('執行命令:', command);

    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        // 清理臨時檔案
        try {
          if (fs.existsSync(tempJsonPath)) {
            fs.unlinkSync(tempJsonPath);
            console.log('臨時檔案已清理:', tempJsonPath);
          }
        } catch (cleanupError) {
          console.warn('清理臨時檔案失敗:', cleanupError);
        }

        if (error) {
          console.error('Python 腳本執行失敗:', error);
          console.error('stderr:', stderr);
          resolve({
            success: false,
            error: `腳本執行失敗: ${error.message}`,
            details: stderr
          });
        } else {
          console.log('Python 腳本執行成功');
          console.log('stdout:', stdout);
          resolve({
            success: true,
            message: '匯出完成',
            output: stdout
          });
        }
      });
    });

  } catch (error) {
    console.error('匯出流程發生錯誤:', error);
    return {
      success: false,
      error: `匯出失敗: ${error.message}`
    };
  }
}); 