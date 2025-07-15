// src/components/VideoOverlay.jsx
// 單一影片物件組件，負責顯示、拖曳與播放控制
import React, { useRef, useEffect, useState } from 'react';

function VideoOverlay({ video, index, setVideos }) {
  const videoRef = useRef(null);
  const reverseVideoRef = useRef(null); // 新增：倒播影片的引用
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [previewAreaRef, setPreviewAreaRef] = useState(null); // 儲存預覽區域引用
  
  // 來回播放狀態 - 使用 useRef 避免觸發 useEffect 重新執行
  const isReversingRef = useRef(false);
  const animationIdRef = useRef(null);
  const playbackStateRef = useRef('forward'); // 'forward' | 'reverse' | 'paused'
  // 用於 UI 顯示的狀態，不影響播放邏輯
  const [displayState, setDisplayState] = useState('▶️');
  // 新增：當前顯示的影片狀態 ('forward' | 'reverse')
  const [currentVideoDisplay, setCurrentVideoDisplay] = useState('forward');

    // 處理影片播放控制（播放模式、速度、停頓等）
    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        // 清除之前的動畫和狀態
        if (animationIdRef.current) {
            if (typeof animationIdRef.current === 'number' && animationIdRef.current > 0) {
                clearInterval(animationIdRef.current); // 清理 interval
            } else {
                cancelAnimationFrame(animationIdRef.current); // 清理 animation frame
            }
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
            // 來回播放模式：使用雙影片元素實現無縫切換
            const reverseVideoElement = reverseVideoRef.current;
            
            // 確保兩個影片元素都存在，且倒播影片已經生成完成
            if (!reverseVideoElement || !video.reverseFilePath || !video.reverseUrl) {
                console.warn('倒播影片元素或倒播檔案尚未準備好，使用循環播放模式');
                // 暫時使用循環播放模式，直到倒播影片準備完成
                setCurrentVideoDisplay('forward');
                videoElement.playbackRate = video.speed;
                videoElement.loop = true;
                setDisplayState('🔄');
                setTimeout(() => {
                    if (videoElement.readyState >= 3) {
                        videoElement.play().catch(console.warn);
                    } else {
                        const playWhenReady = () => {
                            videoElement.play().catch(console.warn);
                            videoElement.removeEventListener('canplay', playWhenReady);
                        };
                        videoElement.addEventListener('canplay', playWhenReady);
                    }
                }, 100);
                return;
            }
            
            // 初始化兩個影片元素
            videoElement.playbackRate = video.speed;
            videoElement.loop = false;
            videoElement.currentTime = 0;
            
            reverseVideoElement.playbackRate = video.speed;
            reverseVideoElement.loop = false;
            reverseVideoElement.currentTime = 0;
            
            // 開始顯示正向影片
            setCurrentVideoDisplay('forward');
            playbackStateRef.current = 'forward';
            setDisplayState('▶️');
            
            // 正向影片播放結束事件
            const handleForwardEnded = () => {
                if (playbackStateRef.current === 'forward') {
                    playbackStateRef.current = 'reverse';
                    setDisplayState('⏪');
                    
                    const switchToReverse = () => {
                        // 切換到倒播影片顯示
                        setCurrentVideoDisplay('reverse');
                        reverseVideoElement.currentTime = 0;
                        reverseVideoElement.playbackRate = video.speed;
                        
                        // 嘗試播放倒播影片，如果失敗則回到正向播放
                        reverseVideoElement.play().catch((error) => {
                            console.warn('倒播影片播放失敗，回到正向播放:', error);
                            setCurrentVideoDisplay('forward');
                            videoElement.currentTime = 0;
                            videoElement.playbackRate = video.speed;
                            videoElement.play().catch(console.warn);
                        });
                    };
                    
                    if (video.pause > 0) {
                        setDisplayState('⏸️');
                        setTimeout(switchToReverse, video.pause * 1000);
                    } else {
                        switchToReverse();
                    }
                }
            };
            
            // 倒播影片播放結束事件
            const handleReverseEnded = () => {
                if (playbackStateRef.current === 'reverse') {
                    playbackStateRef.current = 'forward';
                    setDisplayState('▶️');
                    
                    const switchToForward = () => {
                        // 切換回正向影片顯示
                        setCurrentVideoDisplay('forward');
                        videoElement.currentTime = 0;
                        videoElement.playbackRate = video.speed;
                        videoElement.play().catch(console.warn);
                    };
                    
                    if (video.pause > 0) {
                        setDisplayState('⏸️');
                        setTimeout(switchToForward, video.pause * 1000);
                    } else {
                        switchToForward();
                    }
                }
            };

            videoElement.addEventListener('ended', handleForwardEnded);
            reverseVideoElement.addEventListener('ended', handleReverseEnded);
            
            // 開始正向播放
            setTimeout(() => {
                if (videoElement.readyState >= 3) { // 檢查影片是否已載入足夠數據
                    videoElement.play().catch(console.warn);
                } else {
                    // 如果影片還沒準備好，等待載入完成
                    const playWhenReady = () => {
                        videoElement.play().catch(console.warn);
                        videoElement.removeEventListener('canplay', playWhenReady);
                    };
                    videoElement.addEventListener('canplay', playWhenReady);
                }
            }, 100);

            return () => {
                videoElement.removeEventListener('ended', handleForwardEnded);
                reverseVideoElement.removeEventListener('ended', handleReverseEnded);
                if (animationIdRef.current) {
                    if (typeof animationIdRef.current === 'number' && animationIdRef.current > 0) {
                        clearInterval(animationIdRef.current);
                    } else {
                        cancelAnimationFrame(animationIdRef.current);
                    }
                    animationIdRef.current = null;
                }
                isReversingRef.current = false;
                playbackStateRef.current = 'forward';
                setDisplayState('▶️');
                setCurrentVideoDisplay('forward'); // 重置為正向影片顯示
            };
            
        } else if (video.mode === 'loop') {
            // 循環播放模式：手動控制循環以支援停頓功能
            setCurrentVideoDisplay('forward'); // 確保使用正向影片顯示
            videoElement.playbackRate = video.speed;
            videoElement.loop = false; // 關閉自動循環，改用手動控制
            setDisplayState('🔄'); // 設置循環播放指示器
            
            const handleEnded = () => {
                // 處理停頓：如果停頓秒數為0則立即執行
                const restartPlay = () => {
                    videoElement.currentTime = 0;
                    videoElement.playbackRate = video.speed; // 重新設置播放速度
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
                if (videoElement.readyState >= 3) {
                    videoElement.play().catch(console.warn);
                } else {
                    const playWhenReady = () => {
                        videoElement.play().catch(console.warn);
                        videoElement.removeEventListener('canplay', playWhenReady);
                    };
                    videoElement.addEventListener('canplay', playWhenReady);
                }
            }, 100);
            
            return () => {
                videoElement.removeEventListener('ended', handleEnded);
                setDisplayState('▶️');
                setCurrentVideoDisplay('forward'); // 重置為正向影片顯示
            };
        } else {
            // 預設播放模式
            setCurrentVideoDisplay('forward'); // 確保使用正向影片顯示
            videoElement.playbackRate = video.speed;
            setDisplayState('▶️');
            setTimeout(() => {
                if (videoElement.readyState >= 3) {
                    videoElement.play().catch(console.warn);
                } else {
                    const playWhenReady = () => {
                        videoElement.play().catch(console.warn);
                        videoElement.removeEventListener('canplay', playWhenReady);
                    };
                    videoElement.addEventListener('canplay', playWhenReady);
                }
            }, 100);
        }
    }, [video.mode, video.speed, video.pause, video.reverseFilePath]); // 加入 reverseFilePath 依賴

  // 監聽 reverseUrl 的變化，當倒播影片準備好時重新設定 src
  useEffect(() => {
    const reverseVideoElement = reverseVideoRef.current;
    if (reverseVideoElement && video.reverseUrl) {
      console.log('倒播影片 URL 已更新，重新設定 src:', video.reverseUrl);
      reverseVideoElement.src = video.reverseUrl;
      reverseVideoElement.load(); // 強制重新載入
    }
  }, [video.reverseUrl]);

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
            {/* 正向影片 */}
            <video
                ref={videoRef}
                src={video.originalUrl || video.file}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: '2px',
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    display: currentVideoDisplay === 'forward' ? 'block' : 'none'
                }}
                autoPlay
                muted
                controls={false}
            />
            
            {/* 倒播影片 */}
            {video.reverseFilePath && (
                <video
                    ref={reverseVideoRef}
                    src={video.reverseUrl || ''} // 只有在 reverseUrl 存在時才設定 src
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: '2px',
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        display: currentVideoDisplay === 'reverse' ? 'block' : 'none'
                    }}
                    muted
                    controls={false}
                    onError={(e) => {
                        console.warn('倒播影片載入錯誤:', e);
                        // 如果倒播影片載入失敗，切換回正向影片
                        if (currentVideoDisplay === 'reverse') {
                            setCurrentVideoDisplay('forward');
                        }
                    }}
                    onLoadStart={() => {
                        console.log('倒播影片開始載入');
                    }}
                    onCanPlay={() => {
                        console.log('倒播影片可以播放');
                    }}
                />
            )}
            
            {/* LOGO 顯示 */}
            {video.logo && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: `${15 * video.scale}px`,
                        left: '50%', // 左邊緣距離容器左邊 50%
                        transform: 'translateX(-50%)', // 向左移動自身寬度的 50%
                        zIndex: 10,
                        pointerEvents: 'none'
                    }}
                >
                    <img
                        src={video.logo}
                        alt="LOGO"
                        style={{
                            maxWidth: `${120 * video.scale}px`, // 根據影片縮放比例調整大小
                            maxHeight: `${120 * video.scale}px`,
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                            borderRadius: '2px',
                            opacity: 0.9, // 稍微透明，避免過於突出
                            transform: `scale(${video.logoScale})` // 應用 LOGO 縮放
                        }}
                        onError={(e) => {
                            e.target.src = './default-logo.png'; // 載入失敗時使用預設 LOGO
                        }}
                    />
                </div>
            )}
            
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