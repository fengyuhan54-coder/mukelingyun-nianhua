'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ArchitectureForm from '@/components/ArchitectureForm';
import ApiConfig from '@/components/ApiConfig';
import WorkbenchBackButton from '@/components/WorkbenchBackButton';
import TaskContextBar from '@/components/TaskContextBar';
import { addCreativeTaskArtifact, getCreativeTask, putCreativeTaskAsset, setActiveCreativeTaskId, updateCreativeTaskStep } from '@/lib/creative-task-storage';
import {
  getGenerationCache,
  setGenerationCache,
  clearGenerationCache,
  getCacheRemainingTime,
  formatCacheRemainingTime
} from '@/lib/generation-cache';

const RadarChart = dynamic(() => import('@/components/RadarChart'), { ssr: false });

// 上传图片类型
interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  extractedElements: string;
}

interface FormData {
  dynasty: string;
  architectureType: string;
  specificBuilding: string;
  newYearPrintStyle: string;
  additionalRequirements: string;
}

interface GenerationResult {
  imageUrls: string[];
  prompt: string;
}

interface EvaluationResult {
  dimensions: { name: string; max: number; description?: string }[];
  values: number[];
  totalScore: number;
  scores: Record<string, number>;
  analysis: string;
}

interface CultureResult {
  dynasty: { name: string; features: string[]; culturalContext: string } | null;
  architecture: { type: string; name: string; description: string; keyElements: string[] } | null;
  printStyle: { name: string; features: string[]; culturalSignificance: string } | null;
  description: string;
  tips: string[];
}

export default function HomePage() {
  const [taskId, setTaskId] = useState('');
  const [formData, setFormData] = useState<FormData>({
    dynasty: '',
    architectureType: '',
    specificBuilding: '',
    newYearPrintStyle: '',
    additionalRequirements: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageResult, setImageResult] = useState<GenerationResult | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [cultureResult, setCultureResult] = useState<CultureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiToken, setApiToken] = useState<string>('');

  // 上传图片相关状态
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showUploadPreview, setShowUploadPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const linked = new URLSearchParams(window.location.search).get('taskId') || '';
    if (!linked) return;
    setTaskId(linked); setActiveCreativeTaskId(linked);
    void getCreativeTask(linked).then(task => {
      if (!task) return;
      const culture = [...task.cultureSelections.patterns, ...task.cultureSelections.colors, ...task.cultureSelections.meanings].join('、');
      setFormData(previous => ({ ...previous, specificBuilding: previous.specificBuilding || task.purpose || '', additionalRequirements: [task.brief, culture].filter(Boolean).join('；') }));
    });
  }, []);


  // 加载配置状态
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          setApiToken(data.token);
        }
      })
      .catch(() => {});
  }, []);

  // ========== 会话缓存相关 ==========
  const [cacheRemainingTime, setCacheRemainingTime] = useState<string>('');
  const [hasCachedData, setHasCachedData] = useState(false);

  // 读取缓存
  useEffect(() => {
    const cached = getGenerationCache('architecture');
    if (cached) {
      setImageResult({
        imageUrls: cached.images.map(img => img.url),
        prompt: cached.images[0]?.prompt || ''
      });
      setEvaluationResult(cached.evaluation);
      // 修复类型：将 undefined 转换为 null
      setCultureResult(cached.culture ? {
        ...cached.culture,
        dynasty: cached.culture.dynasty || null,
        architecture: cached.culture.architecture || null,
        printStyle: cached.culture.printStyle || null,
      } : null);
      setFormData(prev => ({ ...prev, ...cached.formData }));
      setHasCachedData(true);
      const remaining = getCacheRemainingTime('architecture');
      setCacheRemainingTime(formatCacheRemainingTime(remaining));
    }
  }, []);

  // 定时更新剩余时间
  useEffect(() => {
    if (!hasCachedData) return;
    const interval = setInterval(() => {
      const remaining = getCacheRemainingTime('architecture');
      setCacheRemainingTime(formatCacheRemainingTime(remaining));
      if (remaining <= 0) {
        setHasCachedData(false);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [hasCachedData]);

  // 清空缓存
  const handleClearCache = () => {
    clearGenerationCache('architecture');
    setHasCachedData(false);
    setCacheRemainingTime('');
  };

  const handleGenerate = async () => {
    if (!formData.architectureType) {
      setError('请选择建筑类型');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setImageResult(null);
    setEvaluationResult(null);
    setCultureResult(null);
    if (taskId) await updateCreativeTaskStep(taskId, 'architecture', 'running');

    try {
      // 1. 生成图片
      const genResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const genData = await genResponse.json();

      if (!genResponse.ok) {
        throw new Error(genData.error || '图片生成失败');
      }
      setImageResult({
        imageUrls: genData.imageUrls,
        prompt: genData.prompt
      });

      // 2. 获取评估数据
      const evalResponse = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const evalData = await evalResponse.json();
      if (evalData.success) {
        setEvaluationResult(evalData.data);
      }

      // 3. 获取文化科普
      const cultureResponse = await fetch('/api/culture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const cultureData = await cultureResponse.json();
      if (cultureData.success) {
        setCultureResult(cultureData.data);
      }

      // 保存到会话缓存
      const generatedAt = Date.now();
      setGenerationCache('architecture', {
        images: genData.imageUrls.map((url: string, idx: number) => ({
          id: `arch_${generatedAt}_${idx}`,
          url,
          prompt: genData.prompt
        })),
        evaluation: evalData.success ? evalData.data : null,
        culture: cultureData.success ? cultureData.data : null,
        formData: { ...formData },
        generatedAt
      });
      setHasCachedData(true);
      setCacheRemainingTime(formatCacheRemainingTime(30 * 60 * 1000));

      if (taskId) {
        for (let idx = 0; idx < genData.imageUrls.length; idx++) {
          const assetId = await putCreativeTaskAsset(genData.imageUrls[idx]);
          await addCreativeTaskArtifact(taskId, { id: taskId + '-architecture-' + generatedAt + '-' + idx, type: 'image', title: '古建筑国风作品', sourceSkill: 'architecture', assetId, version: idx + 1, createdAt: generatedAt });
        }
        await updateCreativeTaskStep(taskId, 'architecture', 'completed');
      }

      // 自动保存到个人中心
      const userId = localStorage.getItem('userId') || 'default-user';
      for (let idx = 0; idx < genData.imageUrls.length; idx++) {
        const imageUrl = genData.imageUrls[idx];
        const dynastyName = formData.dynasty || '';
        const archTypeName = formData.architectureType || '';
        const title = `${dynastyName}${archTypeName ? ' - ' + archTypeName : ''}古建筑`;

        try {
          await fetch('/api/artworks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              category: 'architecture',
              title,
              image_url: imageUrl,
              description: `AI生成的古建筑年画作品`,
              prompt: genData.prompt || '',
              style: '',
              dynasty: dynastyName,
            }),
          });
        } catch (err) {
          console.error('保存作品失败:', err);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生错误');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateFormData = (data: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // 处理图片上传
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 检查最少1张、最多3张
    if (uploadedImages.length >= 3) {
      setError('最多只能上传3张图片');
      return;
    }

    const remainingSlots = 3 - uploadedImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    setIsExtracting(true);
    setError(null);
    setShowUploadPreview(true);

    try {
      for (const file of filesToProcess) {
        // 验证文件类型
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
          setError('仅支持 JPG、PNG 格式图片');
          continue;
        }

        // 创建预览
        const preview = URL.createObjectURL(file);
        const newImageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 先添加到列表
        const newImage: UploadedImage = {
          id: newImageId,
          file,
          preview,
          extractedElements: '',
        };
        
        setUploadedImages(prev => [...prev, newImage]);

        // 调用 API 提取建筑元素
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);
        formDataUpload.append('type', 'architecture'); // 标识为古建筑类型

        const response = await fetch('/api/extract-elements', {
          method: 'POST',
          body: formDataUpload,
        });

        const data = await response.json();
        
        if (data.success && data.elements) {
          // 更新该图片的提取结果
          setUploadedImages(prev => prev.map(img => 
            img.id === newImageId ? { ...img, extractedElements: data.elements } : img
          ));

          // 合并到额外要求输入框
          setFormData(prev => {
            const existing = prev.additionalRequirements;
            const newElements = existing 
              ? `${existing}、${data.elements}`
              : data.elements;
            return { ...prev, additionalRequirements: newElements };
          });
        } else if (data.error) {
          // 处理 API 返回的错误
          setError(data.error || '元素提取失败，请重试');
        }
      }
    } catch (err) {
      setError('图片处理失败，请重试');
    } finally {
      setIsExtracting(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 删除已上传的图片
  const handleRemoveImage = (imageId: string) => {
    const imageToRemove = uploadedImages.find(img => img.id === imageId);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    
    setUploadedImages(prev => {
      const remaining = prev.filter(img => img.id !== imageId);
      
      // 重新合并剩余图片的元素到输入框
      if (remaining.length === 0) {
        setShowUploadPreview(false);
        setFormData(prev => ({ ...prev, additionalRequirements: '' }));
      } else {
        const mergedElements = remaining
          .map(img => img.extractedElements)
          .filter(Boolean)
          .join('、');
        setFormData(prev => ({ ...prev, additionalRequirements: mergedElements }));
      }
      
      return remaining;
    });
  };

  return (
    <main>
      {/* Header */}
      <header className="header">
        <div className="container">
          <h1>木刻灵韵•智绘年画</h1>
          <p>基于扣子平台 · 内置古建筑专属Prompt模板 · 支持6维评估与文化科普</p>
        </div>
      </header>

      {/* Navigation Banner */}
      <WorkbenchBackButton />
      <TaskContextBar taskId={taskId || undefined} />

      {/* API Token Config - 直接显示 */}
      <div className="container" style={{ maxWidth: '800px', margin: '20px auto' }}>
        <div className="card" style={{ background: '#f8f9fa', border: '2px solid #8b5cf6' }}>
          <h2 className="card-title" style={{ color: '#8b5cf6' }}>
            <span className="icon">🔑</span>
            API Token 配置
          </h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
            请输入您的火山引擎 API Token（用于调用豆包生图模型）
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="请输入 API Token"
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
            <button
              onClick={async () => {
                if (!apiToken.trim()) {
                  alert('请输入 API Token');
                  return;
                }
                try {
                  const res = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiToken })
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert('API Token 保存成功！');
                  } else {
                    alert('保存失败: ' + data.error);
                  }
                } catch {
                  alert('保存失败');
                }
              }}
              style={{
                padding: '12px 24px',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              保存 Token
            </button>
          </div>
          <p style={{ color: '#999', fontSize: '12px', marginTop: '12px' }}>
            💡 Token 将保存在服务器配置文件中，下次访问自动加载
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="main">
        <div className="container">
          {/* Input Section */}
          <div className="content-grid">
            {/* Form Card */}
            <div className="card">
              <h2 className="card-title">
                <span className="icon">🎨</span>
                选择古建筑参数
              </h2>
              <ArchitectureForm formData={formData} onChange={updateFormData} />
              
              {/* 按钮区域 */}
              <div className="button-row">
                {/* 生成古建筑图像按钮 */}
                <button
                  className="btn btn-primary generate-btn"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? '生成中...' : '生成古建筑图像'}
                </button>

                {/* 上传本地图生成按钮 */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button
                  className="btn btn-upload"
                  onClick={() => {
                    if (uploadedImages.length >= 3) {
                      setError('最多只能上传3张图片');
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={isExtracting || isGenerating}
                >
                  {isExtracting ? '🔍 提取中...' : '📤 上传本地图生成'}
                </button>
              </div>

              {/* 上传预览区域 - 默认隐藏，仅上传后显示 */}
              {showUploadPreview && uploadedImages.length > 0 && (
                <div className="upload-preview-section">
                  <div className="upload-preview-header">
                    <span>已上传图片（{uploadedImages.length}/3）</span>
                    {uploadedImages.length >= 3 && (
                      <span className="upload-max-hint">已满3张，可直接生成</span>
                    )}
                  </div>
                  <div className="upload-image-grid">
                    {uploadedImages.map((img) => (
                      <div key={img.id} className="upload-image-item">
                        <img 
                          src={img.preview} 
                          alt="上传预览" 
                          className="upload-thumbnail"
                        />
                        <button
                          onClick={() => handleRemoveImage(img.id)}
                          className="upload-remove-btn"
                        >
                          ✕
                        </button>
                        {img.extractedElements && (
                          <div className="upload-elements-badge">
                            {img.extractedElements}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p style={{ color: '#c45656', marginTop: '12px', fontSize: '14px' }}>{error}</p>
              )}
            </div>

            {/* Instructions Card */}
            <div className="card">
              <h2 className="card-title">
                <span className="icon">📖</span>
                使用说明
              </h2>
              <div style={{ color: '#666', fontSize: '14px', lineHeight: '1.8' }}>
                <h4 style={{ color: '#333', marginBottom: '12px' }}>功能一：古建筑AI文生图</h4>
                <p>选择朝代（如唐代）、建筑类型（如佛寺）和年画风格（如杨柳青年画），系统会自动生成专业的图像描述词并调用AI生图。</p>
                
                <h4 style={{ color: '#333', margin: '16px 0 12px' }}>功能二：6维评估雷达图</h4>
                <p>基于生成的图像，自动评估形制准确性、艺术美感度、风格一致性等6个维度，生成专业的雷达图分析。</p>
                
                <h4 style={{ color: '#333', margin: '16px 0 12px' }}>功能三：文化科普说明</h4>
                <p>根据所选的古建筑类型和风格，自动生成建筑历史、特色工艺和文化故事的简要说明。</p>

                <div style={{ marginTop: '16px', padding: '12px', background: '#f8f8f8', borderRadius: '8px' }}>
                  <strong>示例输入：</strong><br/>
                  朝代：唐代 | 建筑类型：佛寺 | 具体建筑：佛光寺大殿 | 年画风格：杨柳青年画
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {(imageResult || evaluationResult || cultureResult || isGenerating || hasCachedData) && (
            <div className="result-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ marginBottom: 0, fontSize: '1.5rem' }}>生成结果</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {hasCachedData && cacheRemainingTime && (
                    <span style={{ fontSize: '13px', color: '#888', background: '#f5f5f5', padding: '4px 10px', borderRadius: '12px' }}>
                      缓存剩余: {cacheRemainingTime}
                    </span>
                  )}
                  {hasCachedData && (
                    <button
                      onClick={handleClearCache}
                      style={{
                        fontSize: '13px',
                        padding: '4px 12px',
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '12px',
                        color: '#666',
                        cursor: 'pointer'
                      }}
                    >
                      清空缓存
                    </button>
                  )}
                </div>
              </div>
              <div className="result-grid">
                {/* Image Result */}
                <div className="result-card">
                  <div className="result-card-header">
                    <span>🎨</span> 生成图像
                  </div>
                  <div className="result-card-body">
                    {isGenerating && !imageResult ? (
                      <div className="loading">正在生成图像...</div>
                    ) : imageResult && imageResult.imageUrls ? (
                      <>
                        <div className="result-image">
                          <img src={imageResult.imageUrls[0]} alt="古建筑生成图像" />
                        </div>
                        <div className="prompt-display">
                          <strong>Prompt:</strong>
                          <code>{imageResult.prompt}</code>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Evaluation Result */}
                <div className="result-card">
                  <div className="result-card-header">
                    <span>📊</span> 6维评估雷达图
                  </div>
                  <div className="result-card-body">
                    {isGenerating && !evaluationResult ? (
                      <div className="loading">正在评估...</div>
                    ) : evaluationResult ? (
                      <RadarChart
                        dimensions={evaluationResult.dimensions}
                        values={evaluationResult.values}
                        totalScore={evaluationResult.totalScore}
                      />
                    ) : (
                      <div className="empty-state">
                        <div className="icon">📊</div>
                        <p>生成图像后自动评估</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Culture Result */}
                <div className="result-card full-width">
                  <div className="result-card-header">
                    <span>📚</span> 文化科普说明
                  </div>
                  <div className="result-card-body">
                    {isGenerating && !cultureResult ? (
                      <div className="loading">正在生成文化科普...</div>
                    ) : cultureResult ? (
                      <div className="culture-info">
                        {cultureResult.dynasty && (
                          <>
                            <h4>{cultureResult.dynasty.name}建筑</h4>
                            <p>{cultureResult.dynasty.culturalContext}</p>
                            <div className="feature-tags">
                              {cultureResult.dynasty.features.map((f, i) => (
                                <span key={i} className="feature-tag">{f}</span>
                              ))}
                            </div>
                          </>
                        )}
                        {cultureResult.architecture && (
                          <>
                            <h4 style={{ marginTop: '16px' }}>{cultureResult.architecture.name}</h4>
                            <p>{cultureResult.architecture.description}</p>
                            <p><strong>主要元素：</strong>{cultureResult.architecture.keyElements.join('、')}</p>
                          </>
                        )}
                        {cultureResult.printStyle && (
                          <>
                            <h4 style={{ marginTop: '16px' }}>{cultureResult.printStyle.name}</h4>
                            <p>{cultureResult.printStyle.culturalSignificance}</p>
                          </>
                        )}
                        {cultureResult.description && (
                          <p style={{ marginTop: '16px', fontSize: '15px', color: '#444' }}>
                            {cultureResult.description}
                          </p>
                        )}
                        {cultureResult.tips.length > 0 && (
                          <ul>
                            {cultureResult.tips.map((tip, i) => (
                              <li key={i}>{tip}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="icon">📚</div>
                        <p>生成图像后自动生成文化科普</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>古建筑AI文生图智能体 · 基于扣子平台开发</p>
          <p style={{ marginTop: '8px', fontSize: '12px' }}>
            内置古建筑专属Prompt模板 | 支持杨柳青、桃花坞等年画风格
          </p>
        </div>
      </footer>
    </main>
  );
}

