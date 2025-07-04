# 廳館 Banner 影片預覽工具

> 一款專為企劃人員設計的桌面應用程式，協助預覽廳館 Banner 影片效果，支援多影片疊加、位置調整、播放控制等功能。

![技術棧](https://img.shields.io/badge/React-18.2.0-blue)
![技術棧](https://img.shields.io/badge/Electron-25.2.0-green)
![平台](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-lightgrey)

---

## ✨ 功能特色

### 🎬 影片管理
- **多影片支援**：可同時疊加 1~3 個 MP4 影片
- **智能尺寸**：自動識別橫版/直版影片，適配最佳顯示尺寸
- **拖曳定位**：直接拖曳影片調整位置，即時顯示座標
- **縮放控制**：0.2x - 3x 縮放比例，滿足不同尺寸需求

### 🎮 播放控制
- **播放模式**：
  - 循環播放（Loop）
  - 來回播放（Ping-Pong）
- **精細調控**：
  - 播放速度：0.5x ~ 3x
  - 停頓秒數：0 ~ 10 秒
  - 顯示/隱藏切換

### 🖼️ 背景設定
- **背景圖更換**：支援 JPG、PNG 等常見格式
- **預設背景**：內建漸層背景，無需額外設定
- **即時預覽**：背景變更立即生效

### 🎯 使用者體驗
- **即時預覽**：所有參數調整即時反映
- **視覺指示**：播放方向、座標位置清楚顯示
- **簡潔介面**：專為非技術人員設計，操作直觀

---

## 🛠️ 技術規格

- **前端框架**：React 18.2.0
- **桌面應用**：Electron 25.2.0
- **影片播放**：HTML5 Video API
- **支援格式**：MP4 (H.264)、WebM、OGG
- **圖片格式**：JPG、PNG、GIF、WebP

---

## 💻 系統需求

### Windows
- Windows 10 或更新版本
- 記憶體：4GB RAM（建議 8GB）
- 硬碟空間：500MB

### macOS
- macOS 10.14 或更新版本
- 記憶體：4GB RAM（建議 8GB）
- 硬碟空間：500MB

---

## 🚀 安裝與啟動

### 開發環境
```bash
# 1. 複製專案
git clone https://github.com/yourusername/banner-preview-tool.git
cd banner-preview-tool

# 2. 安裝相依套件
npm install

# 3. 啟動開發模式
npm run electron-dev
```

### 打包成 exe 執行檔

#### Windows 打包
```bash
# 1. 建構 React 應用
npm run build

# 2. 打包成 Windows 安裝檔
npm run electron-build

# 3. 找到打包檔案
# 安裝檔：dist/Banner Preview Tool Setup 1.0.0.exe
# 免安裝版：dist/win-unpacked/Banner Preview Tool.exe
```

#### macOS 打包
```bash
# 在 macOS 系統上執行
npm run build
npm run electron-build

# 找到打包檔案
# 安裝檔：dist/Banner Preview Tool-1.0.0.dmg
# App 檔案：dist/mac/Banner Preview Tool.app
```

#### 打包參數說明
- **NSIS 安裝檔**：可選擇安裝目錄的標準 Windows 安裝程式
- **免安裝版**：`win-unpacked` 資料夾內的 `.exe` 可直接執行
- **檔案大小**：約 150-200MB（包含 Electron runtime）

---

## 📖 使用說明

### 基本操作流程
1. **啟動應用程式**：雙擊 `.exe` 檔案
2. **上傳影片**：點擊「📹 上傳影片」選擇 1-3 個 MP4 檔案
3. **設定背景**：點擊「🖼️ 背景圖」選擇背景圖片（可選）
4. **調整位置**：直接拖曳影片或在左側輸入精確座標
5. **設定播放**：調整播放模式、速度、停頓時間等參數
6. **即時預覽**：右側預覽區即時顯示最終效果

### 影片參數說明
- **位置**：X、Y 座標，以預覽區左上角為原點
- **縮放比例**：影片顯示尺寸，1x = 原始計算尺寸
- **播放模式**：
  - 循環播放：影片結束後重新開始
  - 來回播放：正向播放完畢後反向播放
- **停頓秒數**：每次播放結束後的暫停時間
- **播放速度**：影片播放的倍速

### 快捷操作
- **拖曳移動**：直接點擊並拖曳影片
- **重置尺寸**：一鍵恢復影片到預設尺寸
- **隱藏影片**：暫時隱藏某個影片而不刪除

---

## 📁 專案結構

```
banner-preview-tool/
├── public/                    # 靜態資源
│   ├── index.html            # HTML 模板
│   └── default-bg.png        # 預設背景圖
├── src/                      # 源碼目錄
│   ├── components/           # React 組件
│   │   ├── VideoController.jsx    # 控制面板
│   │   ├── VideoController.css    # 控制面板樣式
│   │   ├── VideoOverlay.jsx       # 影片疊加層
│   │   ├── PreviewArea.jsx        # 預覽區域
│   │   └── PreviewArea.css        # 預覽區域樣式
│   ├── App.jsx               # 主應用組件
│   ├── App.css               # 主應用樣式
│   ├── index.js              # React 入口
│   └── index.css             # 全域樣式
├── main.js                   # Electron 主程序
├── package.json              # 專案配置
└── README.md                 # 說明文件
```

---

## 🐛 問題排除

### 常見問題

**Q: 影片無法播放或顯示？**
A: 確認影片格式為 MP4 (H.264)，檔案大小建議小於 100MB

**Q: 拖曳功能異常？**
A: 重新整理頁面或重啟應用程式，確保沒有其他程式佔用

**Q: 打包失敗？**
A: 確認已執行 `npm install`，並檢查 Node.js 版本（建議 16 以上）

**Q: exe 檔案被防毒軟體攔截？**
A: 這是正常現象，可將檔案加入白名單或暫時關閉防毒軟體

### 效能建議
- **影片檔案**：建議使用 720p 或 1080p，避免 4K 高解析度
- **檔案數量**：同時載入不超過 3 個影片
- **系統記憶體**：建議 8GB RAM 以上獲得最佳體驗

---

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

### 開發環境設定
1. Fork 本專案
2. 建立功能分支：`git checkout -b feature/your-feature`
3. 提交變更：`git commit -am 'Add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 建立 Pull Request

---

## 📝 更新日誌

### v1.0.0 (2024-07-04)
- ✨ 初版發布
- 🎬 支援多影片疊加與播放控制
- 🖼️ 背景圖設定功能
- 🎯 拖曳定位與即時預覽
- 📱 自動識別橫版/直版影片
- 🔧 縮放控制與參數調整

---

## 📄 授權條款

MIT License - 詳見 [LICENSE](LICENSE) 檔案

---

## 📞 聯絡資訊

如有問題或建議，請透過以下方式聯絡：
- 📧 Email: your.email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/banner-preview-tool/issues)

---

**🎉 感謝使用廳館 Banner 影片預覽工具！** 