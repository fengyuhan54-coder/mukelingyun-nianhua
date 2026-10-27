export interface TraditionalColor {
  id: string;
  name: string;
  color: string;
  meaning: string;
}

// 与木版年画操作台色彩库使用相同的传统色定义，供 Agent 检索使用。
export const TRADITIONAL_COLORS: TraditionalColor[] = [
  { id: 'zhuhong', name: '朱红', color: '#D9381E', meaning: '喜庆、热烈、驱邪' },
  { id: 'jin', name: '金色', color: '#D4AF37', meaning: '尊贵、财富、光辉' },
  { id: 'lv', name: '石绿', color: '#4A7C59', meaning: '生机、自然、和谐' },
  { id: 'qing', name: '群青', color: '#4169E1', meaning: '深邃、宁静、雅致' },
  { id: 'lan', name: '石蓝', color: '#2E5A88', meaning: '稳重、典雅、清新' },
  { id: 'hei', name: '墨黑', color: '#1C1C1C', meaning: '沉稳、庄重、纳福' },
  { id: 'bai', name: '铅白', color: '#F5F5F5', meaning: '纯洁、干净、素雅' },
  { id: 'tu', name: '赭石', color: '#8B4513', meaning: '厚重、沉稳、朴实' },
  { id: 'xiao', name: '桃红', color: '#F08080', meaning: '春意、娇美' },
  { id: 'ping', name: '平安青', color: '#5F9EA0', meaning: '平安、吉祥、顺畅' },
  { id: 'he', name: '和合色', color: '#D2B48C', meaning: '和合、融洽、美好' },
  { id: 'taohuawuqing', name: '桃花坞青', color: '#4682B4', meaning: '江南水乡雅致' },
];
