// src/components/VideoController.jsx
// 影片控制面板組件，負責影片選擇、模式切換、數值調整
import React, { useState, useEffect } from 'react';
import './VideoController.css';

function VideoController({ videos, setVideos, background, setBackground }) {
  
  // 新增：轉換進度狀態
  const [conversionProgress, setConversionProgress] = useState({});
  const [tempFiles, setTempFiles] = useState([]); // 追蹤臨時檔案

  // 監聽轉換事件
  useEffect(() => {
    // 除錯：檢查 Electron API 是否可用
    console.log('檢查 Electron API:', {
      electronAPI: !!window.electronAPI,
      methods: window.electronAPI ? Object.keys(window.electronAPI) : 'N/A'
    });
    
    if (!window.electronAPI) {
      console.warn('Electron API 不可用，ffmpeg 功能將無法使用');
      return;
    }

    console.log('設置 ffmpeg 轉換事件監聽器...');

    // 轉換開始
    window.electronAPI.onConversionStart((data) => {
      console.log('轉換開始:', data);
      setConversionProgress(prev => ({
        ...prev,
        [data.inputPath]: { status: 'converting', percent: 0 }
      }));
    });

    // 轉換進度
    window.electronAPI.onConversionProgress((data) => {
      setConversionProgress(prev => ({
        ...prev,
        [data.inputPath]: { status: 'converting', percent: data.percent }
      }));
    });

    // 轉換完成
    window.electronAPI.onConversionComplete((data) => {
      setConversionProgress(prev => ({
        ...prev,
        [data.inputPath]: { status: 'completed', percent: 100 }
      }));
      
      // 更新影片物件，加入倒播檔案路徑
      setVideos(prevVideos => 
        prevVideos.map(video => 
          video.originalFilePath === data.inputPath 
            ? { ...video, reverseFilePath: data.outputPath }
            : video
        )
      );
    });

    // 轉換錯誤
    window.electronAPI.onConversionError((data) => {
      setConversionProgress(prev => ({
        ...prev,
        [data.inputPath]: { status: 'error', error: data.error }
      }));
    });

    // 清理函數
    return () => {
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('conversion-start');
        window.electronAPI.removeAllListeners('conversion-progress');
        window.electronAPI.removeAllListeners('conversion-complete');
        window.electronAPI.removeAllListeners('conversion-error');
      }
    };
  }, [setVideos]);

  // 組件卸載時清理臨時檔案
  useEffect(() => {
    return () => {
      if (tempFiles.length > 0 && window.electronAPI?.cleanupTempFiles) {
        window.electronAPI.cleanupTempFiles(tempFiles);
      }
    };
  }, [tempFiles]);

  // 處理影片上傳
  const handleVideoUpload = async (e) => {
    const files = Array.from(e.target.files).slice(0, 3); // 最多3個檔案
    
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const videoElement = document.createElement('video');
      const fileURL = URL.createObjectURL(file);
      
      videoElement.onloadedmetadata = async () => {
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
        
        // 生成倒播影片檔案路徑（如果在 Electron 環境中）
        let originalFilePath = null;
        let reverseFilePath = null;
        let originalUrl = null;
        let reverseUrl = null;
        
        if (window.electronAPI) {
          try {
            console.log('開始處理影片檔案:', file.name);
            
            // 將檔案轉換為 ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            console.log('檔案轉換為 ArrayBuffer 完成，大小:', arrayBuffer.byteLength);
            
            // 透過 IPC 複製檔案到臨時目錄
            console.log('透過 IPC 複製檔案到臨時目錄...');
            const result = await window.electronAPI.copyFileToTemp(
              arrayBuffer, 
              file.name, 
              index
            );
            console.log('檔案複製結果:', result);
            
            if (result.success) {
              originalFilePath = result.originalPath;
              reverseFilePath = result.reversePath;
              originalUrl = result.originalUrl;
              reverseUrl = result.reverseUrl;
              console.log('檔案路徑:', { originalFilePath, reverseFilePath });
              console.log('Protocol URLs:', { originalUrl, reverseUrl });
              
              // 添加到臨時檔案清單
              setTempFiles(prev => [...prev, originalFilePath, reverseFilePath]);
              
              // 開始生成倒播影片
              console.log('開始生成倒播影片:', originalFilePath, '->', reverseFilePath);
              window.electronAPI.generateReverseVideo(originalFilePath, reverseFilePath)
                .then(result => {
                  console.log('倒播影片生成結果:', result);
                })
                .catch(error => {
                  console.error('生成倒播影片失敗:', error);
                });
            } else {
              console.error('複製檔案失敗:', result.error);
            }
          } catch (error) {
            console.error('設置 ffmpeg 轉換失敗:', error);
          }
        } else {
          console.log('非 Electron 環境，跳過 ffmpeg 處理');
        }
        
        const videoObj = {
          id: Date.now() + index, // 唯一識別碼
          file: fileURL, // 產生可用的檔案 URL
          fileName: file.name, // 保存檔案名稱
          originalFilePath, // 原始檔案路徑（用於 ffmpeg）
          reverseFilePath, // 倒播檔案路徑（轉換完成後設置）
          // 修正：使用局部變數避免作用域問題
          originalUrl, 
          reverseUrl,
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
    }
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
                
                {/* 新增：轉換進度指示器 */}
                {video.originalFilePath && conversionProgress[video.originalFilePath] && (
                  <div className="conversion-status">
                    {conversionProgress[video.originalFilePath].status === 'converting' && (
                      <div className="conversion-progress">
                        <div className="progress-label">
                          🔄 生成倒播影片中... {Math.round(conversionProgress[video.originalFilePath].percent || 0)}%
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${conversionProgress[video.originalFilePath].percent || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {conversionProgress[video.originalFilePath].status === 'completed' && (
                      <div className="conversion-complete">
                        ✅ 倒播影片已準備就緒，來回播放功能可用
                      </div>
                    )}
                    {conversionProgress[video.originalFilePath].status === 'error' && (
                      <div className="conversion-error">
                        ❌ 倒播影片生成失敗: {conversionProgress[video.originalFilePath].error}
                      </div>
                    )}
                  </div>
                )}
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