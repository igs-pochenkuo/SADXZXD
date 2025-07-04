// src/components/VideoController.jsx
// 影片控制面板組件，負責影片選擇、模式切換、數值調整
import React from 'react';
import './VideoController.css';

function VideoController({ videos, setVideos, background, setBackground }) {
  
  // 處理影片上傳
  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 3); // 最多3個檔案
    
    files.forEach((file, index) => {
      const videoElement = document.createElement('video');
      const fileURL = URL.createObjectURL(file);
      
      videoElement.onloadedmetadata = () => {
        const videoWidth = videoElement.videoWidth;
        const videoHeight = videoElement.videoHeight;
        const aspectRatio = videoWidth / videoHeight;
        
        // 根據影片比例計算合適的顯示尺寸
        let displayWidth, displayHeight;
        
        if (aspectRatio > 1) {
          // 橫版影片
          displayWidth = 320;
          displayHeight = Math.round(320 / aspectRatio);
        } else {
          // 直版影片
          displayHeight = 300;
          displayWidth = Math.round(300 * aspectRatio);
        }
        
        // 確保最小尺寸
        displayWidth = Math.max(displayWidth, 120);
        displayHeight = Math.max(displayHeight, 120);
        
        const videoObj = {
          id: Date.now() + index, // 唯一識別碼
          file: fileURL, // 產生可用的檔案 URL
          fileName: file.name, // 保存檔案名稱
          x: 50 + index * 50, // 預設 X 座標（錯開顯示）
          y: 50 + index * 50, // 預設 Y 座標（錯開顯示）
          width: displayWidth, // 根據比例計算的寬度
          height: displayHeight, // 根據比例計算的高度
          originalWidth: videoWidth, // 原始影片寬度
          originalHeight: videoHeight, // 原始影片高度
          aspectRatio: aspectRatio, // 長寬比
          mode: 'loop', // 播放模式：loop 或 ping-pong
          pause: 0, // 停頓秒數 (0-10)
          speed: 1, // 播放速度 (0.5-3.0)
          visible: true, // 是否顯示
          scale: 1 // 縮放比例
        };
        
        setVideos(prevVideos => [...prevVideos, videoObj]);
      };
      
      videoElement.src = fileURL;
    });
  };

  // 處理背景圖上傳
  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackground(URL.createObjectURL(file));
    }
  };

  // 使用預設背景圖
  const useDefaultBackground = () => {
    setBackground('./default-bg.png'); // 使用 public 目錄下的預設背景
  };

  // 更新單一影片參數
  const updateVideoParam = (index, key, value) => {
    setVideos(prevVideos => 
      prevVideos.map((video, idx) => {
        if (idx === index) {
          const updatedVideo = { ...video, [key]: value };
          
          // 如果更新縮放比例，同時更新顯示尺寸
          if (key === 'scale') {
            const baseWidth = video.aspectRatio > 1 ? 320 : Math.round(300 * video.aspectRatio);
            const baseHeight = video.aspectRatio > 1 ? Math.round(320 / video.aspectRatio) : 300;
            
            updatedVideo.width = Math.round(baseWidth * value);
            updatedVideo.height = Math.round(baseHeight * value);
          }
          
          return updatedVideo;
        }
        return video;
      })
    );
  };

  // 重置影片尺寸
  const resetVideoSize = (index) => {
    const video = videos[index];
    if (!video) return;
    
    let baseWidth, baseHeight;
    if (video.aspectRatio > 1) {
      // 橫版影片
      baseWidth = 320;
      baseHeight = Math.round(320 / video.aspectRatio);
    } else {
      // 直版影片
      baseHeight = 300;
      baseWidth = Math.round(300 * video.aspectRatio);
    }
    
    updateVideoParam(index, 'width', baseWidth);
    updateVideoParam(index, 'height', baseHeight);
    updateVideoParam(index, 'scale', 1);
  };

  // 移除影片
  const removeVideo = (index) => {
    setVideos(prevVideos => prevVideos.filter((_, idx) => idx !== index));
  };

  return (
    <div className="video-controller">
      <h3>廳館 Banner 影片預覽工具</h3>
      
      {/* 影片上傳區 */}
      <div className="control-section">
        <label>📹 上傳影片 (最多3個)：</label>
        <input
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          multiple
          onChange={handleVideoUpload}
          className="file-input"
        />
        <div className="file-info">
          支援橫版、直版影片，會自動調整尺寸
        </div>
      </div>

      {/* 背景圖設定 */}
      <div className="control-section">
        <label>🖼️ 背景圖：</label>
        <div className="background-controls">
          <input
            type="file"
            accept="image/*"
            onChange={handleBackgroundUpload}
            className="file-input"
          />
          <button 
            onClick={useDefaultBackground}
            className="default-bg-btn"
            title="使用預設背景圖片"
          >
            使用預設
          </button>
        </div>
      </div>

      {/* 影片參數調整 */}
      {videos.length > 0 && (
        <div className="control-section">
          <h4>影片設定</h4>
          {videos.map((video, index) => (
            <div key={video.id} className="video-control-item">
              <div className="video-title">
                <span>影片 {index + 1}: {video.fileName}</span>
                <button 
                  onClick={() => removeVideo(index)}
                  className="remove-btn"
                >
                  ❌
                </button>
              </div>
              
              {/* 影片資訊 */}
              <div className="video-info">
                <div>原始尺寸: {video.originalWidth}x{video.originalHeight}</div>
                <div>顯示尺寸: {video.width}x{video.height}</div>
                <div>比例: {video.aspectRatio > 1 ? '橫版' : '直版'} ({video.aspectRatio.toFixed(2)})</div>
              </div>
              
              {/* 位置控制 */}
              <div className="param-group">
                <label>位置：</label>
                <div className="position-controls">
                  <input
                    type="number"
                    placeholder="X"
                    value={video.x}
                    onChange={(e) => updateVideoParam(index, 'x', parseInt(e.target.value) || 0)}
                    className="position-input"
                  />
                  <input
                    type="number"
                    placeholder="Y"
                    value={video.y}
                    onChange={(e) => updateVideoParam(index, 'y', parseInt(e.target.value) || 0)}
                    className="position-input"
                  />
                </div>
              </div>

              {/* 尺寸縮放 */}
              <div className="param-group">
                <label>縮放比例：{video.scale}x</label>
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.1"
                  value={video.scale}
                  onChange={(e) => updateVideoParam(index, 'scale', parseFloat(e.target.value))}
                  className="range-input"
                />
                <button 
                  onClick={() => resetVideoSize(index)}
                  className="reset-size-btn"
                >
                  重置尺寸
                </button>
              </div>

              {/* 播放模式 */}
              <div className="param-group">
                <label>播放模式：</label>
                <select
                  value={video.mode}
                  onChange={(e) => updateVideoParam(index, 'mode', e.target.value)}
                  className="mode-select"
                >
                  <option value="loop">循環播放</option>
                  <option value="ping-pong">來回播放</option>
                </select>
              </div>

              {/* 停頓秒數 */}
              <div className="param-group">
                <label>停頓秒數：{video.pause}s</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={video.pause}
                  onChange={(e) => updateVideoParam(index, 'pause', parseFloat(e.target.value))}
                  className="range-input"
                />
              </div>

              {/* 播放速度 */}
              <div className="param-group">
                <label>播放速度：{video.speed}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={video.speed}
                  onChange={(e) => updateVideoParam(index, 'speed', parseFloat(e.target.value))}
                  className="range-input"
                />
              </div>

              {/* 顯示/隱藏 */}
              <div className="param-group">
                <label>
                  <input
                    type="checkbox"
                    checked={video.visible}
                    onChange={(e) => updateVideoParam(index, 'visible', e.target.checked)}
                  />
                  顯示影片
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 使用說明 */}
      <div className="control-section">
        <h4>💡 使用說明</h4>
        <ul className="instructions">
          <li>選擇 MP4 影片檔案（最多3個）</li>
          <li>支援橫版和直版影片</li>
          <li>可調整縮放比例改變顯示尺寸</li>
          <li>可直接拖曳影片調整位置</li>
          <li>調整播放模式、速度等參數</li>
        </ul>
      </div>
    </div>
  );
}

export default VideoController; 