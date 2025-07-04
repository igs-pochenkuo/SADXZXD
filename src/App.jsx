// src/App.jsx
// 主應用組件，整合控制面板與預覽區域
import React, { useState } from 'react';
import VideoController from './components/VideoController';
import PreviewArea from './components/PreviewArea';
import './App.css';

function App() {
  // 影片與控制參數的狀態
  const [videos, setVideos] = useState([]); // [{id, file, fileName, x, y, width, height, mode, pause, speed, visible}]
  const [background, setBackground] = useState(null); // 背景圖片 URL，null 表示使用預設背景

  // 應用初始化時的處理（可選）
  // useEffect(() => {
  //   console.log('Banner Preview Tool 已啟動');
  // }, []);

  return (
    <div className="app-container">
      {/* 左側控制面板 */}
      <VideoController
        videos={videos}
        setVideos={setVideos}
        background={background}
        setBackground={setBackground}
      />
      
      {/* 右側預覽區域 */}
      <PreviewArea
        videos={videos}
        background={background}
        setVideos={setVideos}
      />
    </div>
  );
}

export default App; 