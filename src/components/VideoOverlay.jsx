// src/components/VideoOverlay.jsx
// 單一影片物件組件，負責顯示、拖曳與播放控制
import React, { useRef, useEffect, useState } from 'react';

function VideoOverlay({ video, index, setVideos }) {
  const videoRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [previewAreaRef, setPreviewAreaRef] = useState(null); // 儲存預覽區域引用
  
  // 來回播放狀態
  const [isReversing, setIsReversing] = useState(false); // 是否正在反向播放
  const [animationId, setAnimationId] = useState(null); // 動畫 ID

  // 處理影片播放控制（播放模式、速度、停頓等）
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // 清除之前的動畫
    if (animationId) {
      cancelAnimationFrame(animationId);
      setAnimationId(null);
    }

    // 重置反向播放狀態
    setIsReversing(false);

    if (video.mode === 'ping-pong') {
      // 來回播放模式：手動控制時間軸
      videoElement.playbackRate = video.speed; // 只設定正數速度
      
      const handleTimeUpdate = () => {
        if (!isReversing && videoElement.currentTime >= videoElement.duration - 0.1) {
          // 到達結尾，開始反向播放
          videoElement.pause();
          setTimeout(() => {
            setIsReversing(true);
            startReversePlay();
          }, video.pause * 1000);
        }
      };

      const startReversePlay = () => {
        let lastTime = performance.now();
        const duration = videoElement.duration;
        
        const reverseFrame = (currentTime) => {
          const deltaTime = (currentTime - lastTime) / 1000; // 轉換為秒
          const timeStep = deltaTime * video.speed; // 考慮播放速度
          
          if (videoElement.currentTime > timeStep) {
            videoElement.currentTime -= timeStep;
            lastTime = currentTime;
            
            const newAnimationId = requestAnimationFrame(reverseFrame);
            setAnimationId(newAnimationId);
          } else {
            // 反向播放結束，重新開始正向播放
            videoElement.currentTime = 0;
            setIsReversing(false);
            setTimeout(() => {
              videoElement.play();
            }, video.pause * 1000);
          }
        };
        
        const newAnimationId = requestAnimationFrame(reverseFrame);
        setAnimationId(newAnimationId);
      };

      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      
      // 確保影片開始播放
      if (!isReversing) {
        videoElement.play().catch(console.warn);
      }

      return () => {
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
      
    } else if (video.mode === 'loop') {
      // 循環播放模式
      videoElement.playbackRate = video.speed;
      
      const handleEnded = () => {
        setTimeout(() => {
          videoElement.currentTime = 0;
          videoElement.play();
        }, video.pause * 1000);
      };

      videoElement.addEventListener('ended', handleEnded);
      videoElement.play().catch(console.warn);
      
      return () => {
        videoElement.removeEventListener('ended', handleEnded);
      };
    } else {
      // 預設播放模式
      videoElement.playbackRate = video.speed;
      videoElement.play().catch(console.warn);
    }
  }, [video.mode, video.speed, video.pause, isReversing]);

  // 開始拖曳
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    // 儲存預覽區域引用
    const previewArea = e.currentTarget.closest('.preview-area');
    setPreviewAreaRef(previewArea);
    
    e.preventDefault();
  };

  // 拖曳中
  const handleMouseMove = (e) => {
    if (!isDragging || !previewAreaRef) return;

    const previewRect = previewAreaRef.getBoundingClientRect();
    const newX = e.clientX - previewRect.left - dragOffset.x;
    const newY = e.clientY - previewRect.top - dragOffset.y;

    // 限制在預覽區域內，並考慮影片尺寸
    const maxX = Math.max(0, previewRect.width - video.width);
    const maxY = Math.max(0, previewRect.height - video.height);
    
    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));

    // 更新影片位置
    setVideos(prevVideos =>
      prevVideos.map((v, idx) =>
        idx === index ? { ...v, x: Math.round(clampedX), y: Math.round(clampedY) } : v
      )
    );
  };

  // 結束拖曳
  const handleMouseUp = () => {
    setIsDragging(false);
    setPreviewAreaRef(null); // 清除引用
  };

  // 監聽全域滑鼠事件
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, previewAreaRef]); // 加入 previewAreaRef 依賴

  // 清理動畫
  useEffect(() => {
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [animationId]);

  // 如果影片設為不可見，不渲染
  if (!video.visible) return null;

  return (
    <div
      className={`video-overlay ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'absolute',
        left: video.x,
        top: video.y,
        width: video.width,
        height: video.height,
        zIndex: 10 + index,
        cursor: isDragging ? 'grabbing' : 'grab',
        border: '2px solid rgba(0, 122, 204, 0.5)',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}
      onMouseDown={handleMouseDown}
    >
      <video
        ref={videoRef}
        src={video.file}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain', // 改為 contain，確保完整顯示影片
          borderRadius: '2px',
          backgroundColor: 'rgba(0,0,0,0.1)' // 加入淡背景，方便識別影片區域
        }}
        loop={video.mode === 'loop'} // 只有循環模式才設定 loop
        autoPlay
        muted // 預設靜音，避免自動播放被瀏覽器阻擋
        controls={false} // 隱藏預設控制列，改用自定義控制
      />
      
      {/* 影片資訊顯示 */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          left: '0',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          pointerEvents: 'none'
        }}
      >
        影片 {index + 1} ({video.speed}x) {isReversing ? '⏪' : '▶️'}
      </div>

      {/* 拖曳指示 */}
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            bottom: '-25px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,122,204,0.9)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          X: {video.x}, Y: {video.y}
        </div>
      )}
    </div>
  );
}

export default VideoOverlay; 