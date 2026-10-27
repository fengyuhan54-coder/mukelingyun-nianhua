'use client';

import React, { useState, useEffect } from 'react';

interface ApiConfigProps {
  apiToken: string;
  onTokenChange: (token: string) => void;
}

export default function ApiConfig({ apiToken, onTokenChange }: ApiConfigProps) {
  const [localToken, setLocalToken] = useState(apiToken);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setLocalToken(apiToken);
  }, [apiToken]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: localToken })
      });
      const data = await response.json();
      if (data.success) {
        onTokenChange(localToken);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidToken = localToken.length >= 20 || localToken === '';

  return (
    <div style={{
      background: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px'
    }}>
      <h3 style={{ 
        margin: '0 0 12px 0', 
        fontSize: '14px', 
        color: '#495057',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>⚙️</span> API Token 配置
      </h3>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <input
          type="password"
          value={localToken}
          onChange={(e) => setLocalToken(e.target.value)}
          placeholder="输入您的 API Token"
          style={{
            flex: 1,
            padding: '8px 12px',
            border: `1px solid ${isValidToken ? '#ced4da' : '#dc3545'}`,
            borderRadius: '6px',
            fontSize: '13px',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSave}
          disabled={isLoading || !localToken}
          style={{
            padding: '8px 16px',
            background: localToken ? '#8b5cf6' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: localToken ? 'pointer' : 'not-allowed',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? '保存中...' : isSaved ? '✓ 已保存' : '保存'}
        </button>
      </div>
      {!isValidToken && (
        <p style={{ color: '#dc3545', fontSize: '12px', marginTop: '8px' }}>
          Token 长度不足，请检查
        </p>
      )}
      <p style={{ color: '#6c757d', fontSize: '12px', marginTop: '8px' }}>
        请填写您自己的火山方舟密钥，仅用于当前浏览器会话；不会写入项目文件或提供给其他用户。
      </p>
    </div>
  );
}
