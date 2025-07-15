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
    // 新增：當前播放的影片來源狀態
    const [currentVideoSrc, setCurrentVideoSrc] = useState(video.file);

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
            // 來回播放模式：切換正向和倒播影片
            setCurrentVideoSrc(video.originalUrl || video.file); // 從正向影片開始
            videoElement.playbackRate = video.speed;
            videoElement.loop = false;
            
            const handleEnded = () => {
                if (playbackStateRef.current === 'forward') {
                    // 正向播放結束，切換到倒播影片
                    if (video.reverseFilePath && window.electronAPI) {
                        playbackStateRef.current = 'reverse';
                        setDisplayState('⏪');
                        
                        const switchToReverse = () => {
                            // 切換到倒播影片 (使用新的 protocol URL)
                            const reverseVideoUrl = video.reverseUrl || `file://${video.reverseFilePath}`;
                            console.log('切換到倒播影片 URL:', reverseVideoUrl);
                            setCurrentVideoSrc(reverseVideoUrl);
                            
                            // 等待影片載入後播放
                            const handleLoadedData = () => {
                                videoElement.currentTime = 0;
                                videoElement.playbackRate = video.speed;
                                videoElement.play().catch(console.warn);
                                videoElement.removeEventListener('loadeddata', handleLoadedData);
                            };
                            
                            videoElement.addEventListener('loadeddata', handleLoadedData);
                        };
                        
                        if (video.pause > 0) {
                            setDisplayState('⏸️');
                            setTimeout(switchToReverse, video.pause * 1000);
                        } else {
                            switchToReverse();
                        }
                    } else {
                        // 倒播影片還沒準備好，回到開頭重新播放
                        console.warn('倒播影片還沒準備好，回到正向播放');
                        videoElement.currentTime = 0;
                        videoElement.play().catch(console.warn);
                    }
                } else if (playbackStateRef.current === 'reverse') {
                    // 倒播結束，切換回正向影片
                    playbackStateRef.current = 'forward';
                    setDisplayState('▶️');
                    
                    const switchToForward = () => {
                        // 切換回正向影片 (使用新的 protocol URL)
                        const forwardVideoUrl = video.originalUrl || video.file;
                        console.log('切換回正向影片 URL:', forwardVideoUrl);
                        setCurrentVideoSrc(forwardVideoUrl);
                        
                        // 等待影片載入後播放
                        const handleLoadedData = () => {
                            videoElement.currentTime = 0;
                            videoElement.playbackRate = video.speed;
                            videoElement.play().catch(console.warn);
                            videoElement.removeEventListener('loadeddata', handleLoadedData);
                        };
                        
                        videoElement.addEventListener('loadeddata', handleLoadedData);
                    };
                    
                    if (video.pause > 0) {
                        setDisplayState('⏸️');
                        setTimeout(switchToForward, video.pause * 1000);
                    } else {
                        switchToForward();
                    }
                }
            };

            videoElement.addEventListener('ended', handleEnded);
            
            // 開始正向播放
            playbackStateRef.current = 'forward';
            setDisplayState('▶️');
            setTimeout(() => {
                videoElement.play().catch(console.warn);
            }, 100);

            return () => {
                videoElement.removeEventListener('ended', handleEnded);
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
                setCurrentVideoSrc(video.originalUrl || video.file); // 重置為正向影片
            };
            
        } else if (video.mode === 'loop') {
            // 循環播放模式：手動控制循環以支援停頓功能
            setCurrentVideoSrc(video.originalUrl || video.file); // 確保使用正向影片
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
                videoElement.play().catch(console.warn);
            }, 100);
            
            return () => {
                videoElement.removeEventListener('ended', handleEnded);
                setDisplayState('▶️');
                setCurrentVideoSrc(video.originalUrl || video.file); // 重置為正向影片
            };
        } else {
            // 預設播放模式
            setCurrentVideoSrc(video.originalUrl || video.file); // 確保使用正向影片
            videoElement.playbackRate = video.speed;
            setDisplayState('▶️');
            setTimeout(() => {
                videoElement.play().catch(console.warn);
            }, 100);
        }
    }, [video.mode, video.speed, video.pause, video.reverseFilePath]); // 加入 reverseFilePath 依賴

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
                src={currentVideoSrc} // 使用動態影片來源
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