'use client';

import React, { useEffect, useRef, useState } from 'react';

interface RadarChartProps {
  dimensions: { name: string; max: number; description?: string }[];
  values: number[];
  totalScore: number;
}

export default function RadarChart({ dimensions, values, totalScore }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置 canvas 尺寸
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2 - 30;
    const maxRadius = Math.min(width, height) * 0.35;
    const numDimensions = dimensions.length;
    const angleStep = (Math.PI * 2) / numDimensions;

    // 绘制背景网格
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    for (let level = 1; level <= 4; level++) {
      const levelRadius = (maxRadius / 4) * level;
      ctx.beginPath();
      for (let i = 0; i <= numDimensions; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * levelRadius;
        const y = centerY + Math.sin(angle) * levelRadius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 绘制轴线
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    for (let i = 0; i < numDimensions; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * maxRadius;
      const y = centerY + Math.sin(angle) * maxRadius;
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 绘制数据区域
    ctx.beginPath();
    for (let i = 0; i < numDimensions; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const value = values[i] / 100;
      const radius = maxRadius * value;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    
    // 填充
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, 'rgba(196, 86, 86, 0.4)');
    gradient.addColorStop(1, 'rgba(196, 86, 86, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // 描边
    ctx.strokeStyle = '#c45656';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制数据点
    for (let i = 0; i < numDimensions; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const value = values[i] / 100;
      const radius = maxRadius * value;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#c45656';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 绘制标签
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < numDimensions; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const labelRadius = maxRadius + 30;
      const x = centerX + Math.cos(angle) * labelRadius;
      const y = centerY + Math.sin(angle) * labelRadius;
      ctx.fillText(dimensions[i].name, x, y);
      
      // 绘制数值
      ctx.fillStyle = '#c45656';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`${values[i]}`, x, y + 14);
      ctx.fillStyle = '#333';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    }

    // 绘制标题
    ctx.fillStyle = '#c45656';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`综合得分: ${totalScore}`, centerX, 20);
    ctx.fillStyle = '#666';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('六维能力评估', centerX, 45);

  }, [isClient, dimensions, values, totalScore]);

  if (!isClient) {
    return (
      <div className="radar-chart-container">
        <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
          图表加载中...
        </div>
        <style jsx>{`
          .radar-chart-container {
            background: linear-gradient(135deg, #fff 0%, #fdf6f6 100%);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="radar-chart-container">
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '400px', display: 'block' }} 
      />
      <style jsx>{`
        .radar-chart-container {
          background: linear-gradient(135deg, #fff 0%, #fdf6f6 100%);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }
      `}</style>
    </div>
  );
}
