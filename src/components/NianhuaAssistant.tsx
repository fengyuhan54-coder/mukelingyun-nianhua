'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function NianhuaAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '🎊 欢迎来到年画小助手！\n\n我是您的年画知识小助手~\n\n📚 您可以：\n• 点击下方快捷按钮快速了解\n• 发送问题问我年画相关知识\n• 问我平台各功能的使用方法\n\n请输入您的问题~'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasDragged = useRef(false);

  // 快捷指令
  const quickCommands = ['朱仙镇年画', '五大流派', '制作工艺', '图案寓意', '平台使用'];

  // 每次进入页面时把入口放回可见区域，并在窗口尺寸变化后自动收回屏幕内
  useEffect(() => {
    const placeAtCorner = () => {
      setPosition({
        x: Math.max(12, window.innerWidth - 82),
        y: Math.max(12, window.innerHeight - 82)
      });
    };

    const keepVisible = () => {
      setPosition(prev => ({
        x: Math.max(12, Math.min(window.innerWidth - 70, prev.x)),
        y: Math.max(12, Math.min(window.innerHeight - 70, prev.y))
      }));
    };

    placeAtCorner();
    window.addEventListener('resize', keepVisible);
    return () => window.removeEventListener('resize', keepVisible);
  }, [pathname]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理鼠标按下（开始拖动）
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    hasDragged.current = false;
  };

  // 处理鼠标移动（拖动）
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasDragged.current = true;
    }
    
    setPosition(prev => ({
      x: Math.max(0, Math.min(window.innerWidth - 70, prev.x + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 70, prev.y + dy))
    }));
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  // 处理鼠标释放
  const handleMouseUp = () => {
    if (!hasDragged.current) {
      setIsOpen(!isOpen);
    }
    
    setIsDragging(false);
    hasDragged.current = false;
  };

  // 处理触摸事件（移动端）
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(true);
    hasDragged.current = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartPos.current.x;
    const dy = touch.clientY - dragStartPos.current.y;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasDragged.current = true;
    }
    
    setPosition(prev => ({
      x: Math.max(0, Math.min(window.innerWidth - 70, prev.x + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 70, prev.y + dy))
    }));
    
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    if (!hasDragged.current) {
      setIsOpen(!isOpen);
    }
    
    setIsDragging(false);
    hasDragged.current = false;
  };

  // 添加全局事件监听
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const sendMessage = async (messageText?: string) => {
    const userMessage = (messageText ?? input).trim();
    if (!userMessage || isLoading) return;

    setInput('');
    const nextMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '问答服务暂时不可用');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || '我暂时没有找到合适的回答，请换一种问法再试试。'
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，我遇到了一些问题，请稍后再试。'
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickCommand = (cmd: string) => {
    void sendMessage(cmd);
  };

  // 使用inline style确保z-index生效
  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '20px'
  };

  const modalContentStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: '16px',
    width: '480px',
    height: '600px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    fontFamily: 'Georgia, "Songti SC", serif',
    position: 'relative',
    border: '2px solid #e8d4c4'
  };

  const buttonStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 99998,
    width: '62px',
    height: '62px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    borderRadius: '50%',
    border: '2px solid #d9ad55',
    background: 'linear-gradient(145deg, #fff9ea 0%, #f1d9ad 100%)',
    boxShadow: '0 8px 24px rgba(73, 27, 18, 0.3)',
    cursor: isDragging ? 'grabbing' : 'pointer',
    userSelect: 'none',
    touchAction: 'none'
  };

  const assistantAvatar = '/images/assistant/avatar.png';

  if (pathname === '/') return null;

  return (
    <>
      {/* 年画小助手按钮 */}
      <div
        className="nianhua-assistant-trigger"
        style={buttonStyle}
        role="button"
        tabIndex={0}
        aria-label="打开年画语言交互助手"
        title="年画语言交互助手（可拖动）"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <img
          src={assistantAvatar}
          alt=""
          draggable={false}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            objectFit: 'cover',
            pointerEvents: 'none'
          }}
        />
      </div>
      {/* 悬浮聊天页面 - 无毛玻璃效果 */}
      {isOpen && (
        <div 
          className="nianhua-assistant-overlay"
          style={modalOverlayStyle}
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="nianhua-assistant-dialog"
            style={modalContentStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部标题栏 */}
            <div 
              style={{
                background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
                borderBottom: '2px solid #fbbf24',
                padding: '15px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  <img 
                    src={assistantAvatar} 
                    alt="年画小助手"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: 'bold' }}>
                    💬 年画问答助手
                  </h3>
                  <p style={{ margin: 0, color: '#fef3c7', fontSize: '12px' }}>
                    朱仙镇年画专家 · 在线
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '20px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ✕
              </button>
            </div>

            {/* 快捷指令区 */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                background: '#fffaf5',
                borderBottom: '1px solid #f0e6dc',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ fontSize: '13px', color: '#5d3a1a', fontWeight: 'bold' }}>
                快捷指令：
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {quickCommands.map(cmd => (
                  <button
                    key={cmd}
                    onClick={() => handleQuickCommand(cmd)}
                    style={{
                      padding: '6px 12px',
                      background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            {/* 消息区域 */}
            <div 
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                background: '#fef9f3'
              }}
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    marginBottom: '15px',
                    alignItems: 'flex-end',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                  }}
                >
                  {msg.role === 'assistant' && (
                    <div 
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden',
                        border: '2px solid #fbbf24'
                      }}
                    >
                      <img 
                        src={assistantAvatar} 
                        alt="年画小助手"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: '75%',
                      padding: '12px 16px',
                      margin: '0 10px',
                      borderRadius: '16px',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)'
                        : '#f5f5f5',
                      color: msg.role === 'user' ? '#ffffff' : '#333333',
                      borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                      borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'Georgia, "Songti SC", serif'
                    }}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div 
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#f0e6dc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0
                      }}
                    >
                      👤
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div style={{ display: 'flex', marginBottom: '15px', alignItems: 'flex-end' }}>
                  <div 
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                      border: '2px solid #fbbf24'
                    }}
                  >
                    <img 
                      src={assistantAvatar} 
                      alt="年画小助手"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div 
                    style={{
                      margin: '0 10px',
                      padding: '12px 16px',
                      background: '#f5f5f5',
                      borderRadius: '16px',
                      borderBottomLeftRadius: '4px',
                      display: 'flex',
                      gap: '4px'
                    }}
                  >
                    <span style={{ color: '#c41e3a', animation: 'bounce 1s infinite 0s' }}>●</span>
                    <span style={{ color: '#c41e3a', animation: 'bounce 1s infinite 0.2s' }}>●</span>
                    <span style={{ color: '#c41e3a', animation: 'bounce 1s infinite 0.4s' }}>●</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div 
              style={{
                display: 'flex',
                gap: '10px',
                padding: '15px 20px',
                borderTop: '1px solid #f0e6dc',
                background: '#fffaf5'
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="问我年画相关的问题..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '2px solid #e8d4c4',
                  borderRadius: '24px',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  background: '#ffffff'
                }}
              />
              <button
                onClick={() => void sendMessage()}
                disabled={isLoading || !input.trim()}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '24px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  opacity: isLoading || !input.trim() ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && input.trim()) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

