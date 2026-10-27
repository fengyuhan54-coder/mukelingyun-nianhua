'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const QR_CODE_IMAGE = 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F5aeae45d3823b4c612000300fd1d5649.png&nonce=c22f7185-b42b-45af-94fa-ad8110cfd778&project_id=7648277783952490548&sign=5d3afb0e5b6dd82c1c4316be43fbe281315b0ec5b901fe4e9ec218790fa6137d';

const INTRO_TEXT = `扫描上方二维码，即刻进入木版年画互动小游戏。游戏拆解刻板、修版、上墨、敷纸、套色全套传统工序，以指尖交互的趣味形式，模拟完整年画制作流程。游玩过程中同步推送非遗背景故事，展示各地年画流派的艺术特点，科普传统纹样文化。同时展示衍生 IP 形象与文创产品的创作溯源，加深现代文创与传统技艺之间的联结。游戏通关后开启盲盒抽奖，抽取专属原创年画表情包，在轻松娱乐的过程中完成非遗知识学习！快来体验吧！`;

export default function H5GamePage() {
  const router = useRouter();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={styles.container}>
      {/* 返回按钮 */}
      <button style={styles.backButton} onClick={() => router.push('/')}>
        <span style={styles.backIcon}>←</span>
        <span>返回</span>
      </button>
      
      <div style={styles.content}>
        {/* 二维码图片 */}
        <div style={styles.qrWrapper}>
          <img 
            src={QR_CODE_IMAGE} 
            alt="H5交互游戏体验二维码" 
            style={styles.qrImage}
          />
        </div>

        {/* 介绍文字 */}
        <div style={styles.introBox}>
          <p style={styles.introText}>{INTRO_TEXT}</p>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fdf6e3 0%, #fef9f3 50%, #fff8dc 100%)',
    padding: '40px 20px',
    position: 'relative' as const,
  },
  backButton: {
    position: 'absolute' as const,
    top: '20px',
    right: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    background: '#8b5a2b',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: '"Noto Serif SC", "Songti SC", "SimSun", serif',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(139, 90, 43, 0.3)',
    transition: 'all 0.3s ease',
  },
  backIcon: {
    fontSize: '16px',
  },
  content: {
    maxWidth: '700px',
    margin: '0 auto',
    textAlign: 'center' as const,
  },
  qrWrapper: {
    background: '#fff',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 8px 32px rgba(139, 90, 43, 0.15)',
    border: '3px solid #8b5a2b',
    display: 'inline-block',
    marginBottom: '32px',
  },
  qrImage: {
    width: '280px',
    height: '280px',
    objectFit: 'contain' as const,
    display: 'block',
  },
  introBox: {
    background: '#fffbf0',
    borderRadius: '12px',
    padding: '28px 32px',
    boxShadow: '0 4px 16px rgba(139, 90, 43, 0.1)',
    border: '2px solid #deb887',
  },
  introText: {
    fontSize: '16px',
    lineHeight: '1.9',
    color: '#5d4037',
    fontFamily: '"Noto Serif SC", "Songti SC", "SimSun", serif',
    margin: 0,
    textAlign: 'justify' as const,
    textIndent: '2em',
  },
};
