// src/components/VideoOverlay.jsx
// 單一影片物件組件，負責顯示、拖曳與播放控制
import React, { useRef, useEffect, useState } from 'react';

function VideoOverlay({ video, index, setVideos }) {
  const videoRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [previewAreaRef, setPreviewAreaRef] = useState(null); // 儲存預覽區域引用
  
  // 來回播放狀態 - 使用 useRef 避免觸發 useEffect 重新執行
  const isReversingRef = useRef(false);
  const animationIdRef = useRef(null);
  const playbackStateRef = useRef('forward'); // 'forward' | 'reverse' | 'paused'
  // 用於 UI 顯示的狀態，不影響播放邏輯
  const [displayState, setDisplayState] = useState('▶️');

  // 處理影片播放控制（播放模式、速度、停頓等）
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // 清除之前的動畫和狀態
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // 重置播放狀態和影片位置
    isReversingRef.current = false;
    playbackStateRef.current = 'forward';
    setDisplayState('▶️'); // 重置顯示狀態
    
    // 立即重置影片到開頭
    videoElement.currentTime = 0;
    videoElement.pause(); // 先暫停避免衝突

    if (video.mode === 'ping-pong') {
      // 來回播放模式：手動控制時間軸
      videoElement.playbackRate = video.speed;
      videoElement.loop = false; // 確保不會自動循環
      
      const handleEnded = () => {
        // 影片正向播放結束，開始反向播放
        if (playbackStateRef.current === 'forward') {
          playbackStateRef.current = 'reverse';
          isReversingRef.current = true;
          setDisplayState('⏪'); // 更新顯示狀態
          
          // 處理停頓：如果停頓秒數為0則立即執行
          const startReverse = () => {
            // 確保從影片結尾開始反向播放
            videoElement.currentTime = videoElement.duration;
            startReversePlay();
          };
          
          if (video.pause > 0) {
            setDisplayState('⏸️'); // 顯示暫停狀態
            setTimeout(startReverse, video.pause * 1000);
          } else {
            startReverse(); // 立即開始反向播放
          }
        }
      };

      const startReversePlay = () => {
        setDisplayState('⏪');
        
        // 使用更簡單的定時器方法而不是 requestAnimationFrame
        const reverseInterval = setInterval(() => {
          if (!isReversingRef.current || playbackStateRef.current !== 'reverse' || video.mode !== 'ping-pong') {
            clearInterval(reverseInterval);
            return;
          }
          
          // 根據播放速度調整時間步長 - 改為更小的步長確保精確控制
          const timeStep = 0.05 * video.speed; // 每次減少0.05秒，比較平滑
          
          // 檢查是否已經到達開頭
          if (videoElement.currentTime <= 0.05) {
            // 反向播放結束，重新開始正向播放
            clearInterval(reverseInterval);
            videoElement.currentTime = 0; // 確保重置到真正的開頭
            isReversingRef.current = false;
            playbackStateRef.current = 'forward';
            
            // 處理停頓：如果停頓秒數為0則立即執行
            const startForward = () => {
              if (video.mode === 'ping-pong') { // 確保還在來回播放模式
                setDisplayState('▶️');
                videoElement.play().catch(console.warn);
              }
            };
            
            if (video.pause > 0) {
              setDisplayState('⏸️'); // 顯示暫停狀態
              setTimeout(startForward, video.pause * 1000);
            } else {
              startForward(); // 立即開始正向播放
            }
          } else {
            // 繼續反向播放
            videoElement.currentTime = Math.max(0, videoElement.currentTime - timeStep);
          }
        }, 50); // 改為每50ms執行一次，讓反向播放更平滑且速度合理
        
        // 存儲 interval ID 以便清理
        animationIdRef.current = reverseInterval;
      };

      // 使用 ended 事件觸發反向播放
      videoElement.addEventListener('ended', handleEnded);
      
      // 開始正向播放
      playbackStateRef.current = 'forward';
      setDisplayState('▶️');
      setTimeout(() => {
        videoElement.play().catch(console.warn);
      }, 100); // 短暫延遲確保設置完成

      return () => {
        videoElement.removeEventListener('ended', handleEnded);
        if (animationIdRef.current) {
          if (typeof animationIdRef.current === 'number' && animationIdRef.current > 0) {
            clearInterval(animationIdRef.current); // 清理 interval
          } else {
            cancelAnimationFrame(animationIdRef.current); // 清理 animation frame
          }
          animationIdRef.current = null;
        }
        isReversingRef.current = false;
        playbackStateRef.current = 'forward';
        setDisplayState('▶️');
      };
      
    } else if (video.mode === 'loop') {
      // 循環播放模式：手動控制循環以支援停頓功能
      videoElement.playbackRate = video.speed;
      videoElement.loop = false; // 關閉自動循環，改用手動控制
      setDisplayState('🔄'); // 設置循環播放指示器
      
      const handleEnded = () => {
        // 處理停頓：如果停頓秒數為0則立即執行
        const restartPlay = () => {
          videoElement.currentTime = 0;
          videoElement.play().catch(console.warn);
        };
        
        if (video.pause > 0) {
          setTimeout(restartPlay, video.pause * 1000);
        } else {
          restartPlay(); // 立即重新播放
        }
      };

      videoElement.addEventListener('ended', handleEnded);
      setTimeout(() => {
        videoElement.play().catch(console.warn);
      }, 100);
      
      return () => {
        videoElement.removeEventListener('ended', handleEnded);
        setDisplayState('▶️');
      };
    } else {
      // 預設播放模式
      videoElement.playbackRate = video.speed;
      setDisplayState('▶️');
      setTimeout(() => {
        videoElement.play().catch(console.warn);
      }, 100);
    }
  }, [video.mode, video.speed, video.pause]); // 當模式或參數改變時立即重新初始化

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
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []); // 移除 animationId 依賴

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
        // 移除 loop 屬性，改用手動控制
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
        影片 {index + 1} ({video.speed}x) {displayState}
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