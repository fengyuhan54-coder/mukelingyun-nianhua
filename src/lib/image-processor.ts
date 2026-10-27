/**
 * 雕版拓印图像处理工具
 * 实现色彩分层剥离和分层叠加功能
 */

export interface Layer {
  id: number;
  name: string;
  imageData: ImageData;
  thumbnail: string; // Base64缩略图
  type: 'outline' | 'color-block' | 'detail' | 'background' | 'highlight';
  opacity: number;
  blendMode: GlobalCompositeOperation;
}

export interface ImageProcessingOptions {
  numLayers: number; // 3-5层
  threshold?: number; // 分割阈值
}

/**
 * 将图片分成多个颜色通道层
 */
function separateColorChannels(imageData: ImageData): { r: Uint8ClampedArray; g: Uint8ClampedArray; b: Uint8ClampedArray } {
  const { data, width, height } = imageData;
  const r = new Uint8ClampedArray(width * height);
  const g = new Uint8ClampedArray(width * height);
  const b = new Uint8ClampedArray(width * height);
  
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    r[i] = data[idx];
    g[i] = data[idx + 1];
    b[i] = data[idx + 2];
  }
  
  return { r, g, b };
}

/**
 * 提取轮廓层（线条）
 */
function extractOutlineLayer(imageData: ImageData, threshold: number = 60): ImageData {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  const grayscale = new Uint8ClampedArray(width * height);
  
  // 转灰度
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    grayscale[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }
  
  // 边缘检测 (Sobel算子简化版)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const gIdx = y * width + x;
      
      // 简单边缘检测
      const left = grayscale[gIdx - 1];
      const right = grayscale[gIdx + 1];
      const top = grayscale[gIdx - width];
      const bottom = grayscale[gIdx + width];
      
      const diff = Math.abs(left - right) + Math.abs(top - bottom);
      
      if (diff > threshold) {
        result.data[idx] = 0;
        result.data[idx + 1] = 0;
        result.data[idx + 2] = 0;
        result.data[idx + 3] = 255;
      } else {
        result.data[idx] = 255;
        result.data[idx + 1] = 255;
        result.data[idx + 2] = 255;
        result.data[idx + 3] = 255;
      }
    }
  }
  
  return result;
}

/**
 * 提取单色层（根据颜色主调）
 */
function extractColorLayer(imageData: ImageData, colorRange: { r: number; g: number; b: number }, tolerance: number = 50): ImageData {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const dr = Math.abs(data[idx] - colorRange.r);
    const dg = Math.abs(data[idx + 1] - colorRange.g);
    const db = Math.abs(data[idx + 2] - colorRange.b);
    
    if (dr + dg + db < tolerance * 3) {
      result.data[idx] = data[idx];
      result.data[idx + 1] = data[idx + 1];
      result.data[idx + 2] = data[idx + 2];
      result.data[idx + 3] = 255;
    } else {
      result.data[idx] = 255;
      result.data[idx + 1] = 255;
      result.data[idx + 2] = 255;
      result.data[idx + 3] = 255;
    }
  }
  
  return result;
}

/**
 * 提取高光层
 */
function extractHighlightLayer(imageData: ImageData, brightnessThreshold: number = 180): ImageData {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    
    if (brightness > brightnessThreshold) {
      result.data[idx] = 255;
      result.data[idx + 1] = 255;
      result.data[idx + 2] = 255;
      result.data[idx + 3] = 255;
    } else {
      result.data[idx] = 0;
      result.data[idx + 1] = 0;
      result.data[idx + 2] = 0;
      result.data[idx + 3] = 0;
    }
  }
  
  return result;
}

/**
 * 提取暗部层
 */
function extractShadowLayer(imageData: ImageData, brightnessThreshold: number = 60): ImageData {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    
    if (brightness < brightnessThreshold) {
      result.data[idx] = 0;
      result.data[idx + 1] = 0;
      result.data[idx + 2] = 0;
      result.data[idx + 3] = 255;
    } else {
      result.data[idx] = 255;
      result.data[idx + 1] = 255;
      result.data[idx + 2] = 255;
      result.data[idx + 3] = 255;
    }
  }
  
  return result;
}

/**
 * 提取中间调层
 */
function extractMidtoneLayer(imageData: ImageData, low: number = 60, high: number = 180): ImageData {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    
    if (brightness >= low && brightness <= high) {
      result.data[idx] = data[idx];
      result.data[idx + 1] = data[idx + 1];
      result.data[idx + 2] = data[idx + 2];
      result.data[idx + 3] = 200;
    } else {
      result.data[idx] = 255;
      result.data[idx + 1] = 255;
      result.data[idx + 2] = 255;
      result.data[idx + 3] = 0;
    }
  }
  
  return result;
}

/**
 * 生成主色调分析
 */
function analyzeDominantColors(imageData: ImageData): Array<{ r: number; g: number; b: number; count: number }> {
  const { data, width, height } = imageData;
  const colorMap = new Map<string, number>();
  
  // 简化颜色到16级
  const step = 16;
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const key = `${Math.floor(data[idx] / step) * step},${Math.floor(data[idx + 1] / step) * step},${Math.floor(data[idx + 2] / step) * step}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }
  
  return Array.from(colorMap.entries())
    .map(([key, count]) => {
      const [r, g, b] = key.split(',').map(Number);
      return { r, g, b, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * 主处理函数：分层剥离
 */
export async function extractLayers(sourceImage: HTMLImageElement, numLayers: number = 4): Promise<Layer[]> {
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.width;
  canvas.height = sourceImage.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sourceImage, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  const layers: Layer[] = [];
  const dominantColors = analyzeDominantColors(imageData);
  
  // 层1：轮廓线稿（必须）
  const outlineLayer = extractOutlineLayer(imageData, 50);
  layers.push({
    id: 1,
    name: '轮廓线稿',
    imageData: outlineLayer,
    thumbnail: imageDataToBase64(outlineLayer, 150),
    type: 'outline',
    opacity: 1,
    blendMode: 'source-over'
  });
  
  // 层2：暗部/线条加深
  const shadowLayer = extractShadowLayer(imageData, 80);
  layers.push({
    id: 2,
    name: '暗部线条',
    imageData: shadowLayer,
    thumbnail: imageDataToBase64(shadowLayer, 150),
    type: 'detail',
    opacity: 0.8,
    blendMode: 'multiply'
  });
  
  // 层3：主色调提取
  if (dominantColors.length > 0) {
    const mainColor = dominantColors[0];
    const colorLayer = extractColorLayer(imageData, mainColor, 60);
    layers.push({
      id: 3,
      name: `${getColorName(mainColor)}主色`,
      imageData: colorLayer,
      thumbnail: imageDataToBase64(colorLayer, 150),
      type: 'color-block',
      opacity: 0.9,
      blendMode: 'source-over'
    });
  }
  
  // 层4：辅助色调
  if (numLayers >= 4 && dominantColors.length > 1) {
    const secondColor = dominantColors[1];
    const secondLayer = extractColorLayer(imageData, secondColor, 50);
    layers.push({
      id: 4,
      name: `${getColorName(secondColor)}辅色`,
      imageData: secondLayer,
      thumbnail: imageDataToBase64(secondLayer, 150),
      type: 'color-block',
      opacity: 0.85,
      blendMode: 'source-over'
    });
  }
  
  // 层5：高光层
  if (numLayers >= 5) {
    const highlightLayer = extractHighlightLayer(imageData, 170);
    layers.push({
      id: 5,
      name: '高光层次',
      imageData: highlightLayer,
      thumbnail: imageDataToBase64(highlightLayer, 150),
      type: 'highlight',
      opacity: 0.7,
      blendMode: 'source-over'
    });
  }
  
  return layers;
}

/**
 * 合并所有图层还原原图
 */
export function mergeLayers(layers: Layer[], canvas: HTMLCanvasElement): ImageData {
  const { width, height } = canvas;
  const result = new ImageData(width, height);
  
  // 填充白色背景
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = 255;
    result.data[i + 1] = 255;
    result.data[i + 2] = 255;
    result.data[i + 3] = 255;
  }
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  
  // 按顺序叠加图层
  for (const layer of layers) {
    tempCtx.clearRect(0, 0, width, height);
    tempCtx.putImageData(layer.imageData, 0, 0);
    
    const layerData = tempCtx.getImageData(0, 0, width, height);
    for (let i = 0; i < result.data.length; i += 4) {
      const srcA = layerData.data[i + 3] / 255;
      if (srcA > 0) {
        const dstA = result.data[i + 3] / 255;
        const outA = srcA + dstA * (1 - srcA);
        
        if (outA > 0) {
          result.data[i] = Math.round((layerData.data[i] * srcA + result.data[i] * dstA * (1 - srcA)) / outA);
          result.data[i + 1] = Math.round((layerData.data[i + 1] * srcA + result.data[i + 1] * dstA * (1 - srcA)) / outA);
          result.data[i + 2] = Math.round((layerData.data[i + 2] * srcA + result.data[i + 2] * dstA * (1 - srcA)) / outA);
          result.data[i + 3] = Math.round(outA * 255);
        }
      }
    }
  }
  
  return result;
}

/**
 * ImageData转Base64
 */
function imageDataToBase64(imageData: ImageData, maxSize: number): string {
  const { width, height } = imageData;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d')!;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);
  
  ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/**
 * 获取颜色名称
 */
function getColorName(color: { r: number; g: number; b: number }): string {
  const { r, g, b } = color;
  
  // 判断是否为红色系
  if (r > 150 && r > g * 1.5 && r > b * 1.5) return '红';
  // 判断是否为蓝色系
  if (b > 100 && b > r * 1.2 && b > g * 1.2) return '蓝';
  // 判断是否为绿色系
  if (g > 100 && g > r * 1.3 && g > b * 1.3) return '绿';
  // 判断是否为黄色系
  if (r > 180 && g > 180 && b < 150) return '黄';
  // 判断是否为紫色系
  if (r > 100 && b > 100 && g < 100) return '紫';
  // 金色
  if (r > 180 && g > 140 && g < 200 && b < 100) return '金';
  // 青色
  if (g > 100 && b > 100 && r < 100) return '青';
  
  return '彩';
}

/**
 * 加载图片
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 图片文件转DataURL
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
