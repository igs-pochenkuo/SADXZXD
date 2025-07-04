// src/components/PreviewArea.jsx
// 預覽區域組件，顯示背景與影片疊加，支援拖曳與即時預覽
import React from 'react';
import VideoOverlay from './VideoOverlay';
import './PreviewArea.css';

function PreviewArea({ videos, background, setVideos }) {
  
  // 處理預覽區域點擊（清除選取狀態等）
  const handlePreviewClick = (e) => {
    // 防止點擊影片時觸發
    if (e.target.tagName === 'VIDEO' || e.target.closest('.video-overlay')) {
      return;
    }
    // 可以在這裡加入其他點擊處理邏輯
  };

  return (
    <div className="preview-container">
      {/* 預覽標題列 */}
      <div className="preview-header">
        <h3>🎬 廳館 Banner 預覽</h3>
        <div className="preview-info">
          {videos.length > 0 ? `${videos.length} 個影片` : '請選擇影片檔案'}
          {background && background !== 'default-bg.png' && ' • 已設定背景'}
        </div>
      </div>

      {/* 主預覽區域 */}
      <div 
        className="preview-area" 
        onClick={handlePreviewClick}
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 60px)', // 扣除標題列高度
          background: background && background !== 'default-bg.png' 
            ? `url(${background}) center/cover no-repeat`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // 預設漸層背景
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* 當沒有影片時的提示 */}
        {videos.length === 0 && (
          <div className="empty-preview">
            <div className="empty-preview-content">
              <div className="empty-icon">🎥</div>
              <h4>歡迎使用 Banner 預覽工具</h4>
              <p>請從左側面板：</p>
              <ul>
                <li>📹 選擇 MP4 影片檔案（最多3個）</li>
                <li>🖼️ 選擇背景圖片</li>
                <li>⚙️ 調整播放參數</li>
              </ul>
              <p className="tip">影片載入後可直接拖曳調整位置</p>
            </div>
          </div>
        )}

        {/* 疊加多個影片 */}
        {videos.map((video, idx) => (
          <VideoOverlay
            key={video.id || idx} // 使用 id 或 index 作為 key
            video={video}
            index={idx}
            setVideos={setVideos}
          />
        ))}

        {/* 預覽區域網格線（可選，幫助定位） */}
        {videos.length > 0 && (
          <div className="preview-grid">
            {/* 垂直線 */}
            {[...Array(5)].map((_, i) => (
              <div
                key={`v-${i}`}
                className="grid-line vertical"
                style={{
                  position: 'absolute',
                  left: `${(i + 1) * 20}%`,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  background: 'rgba(255,255,255,0.1)',
                  pointerEvents: 'none'
                }}
              />
            ))}
            {/* 水平線 */}
            {[...Array(5)].map((_, i) => (
              <div
                key={`h-${i}`}
                className="grid-line horizontal"
                style={{
                  position: 'absolute',
                  top: `${(i + 1) * 20}%`,
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: 'rgba(255,255,255,0.1)',
                  pointerEvents: 'none'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PreviewArea; 