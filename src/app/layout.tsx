import type { Metadata, Viewport } from 'next';
import './globals.css';
import NianhuaAssistant from '@/components/NianhuaAssistant';
import DesktopPet3D from '@/components/DesktopPet3D';

export const metadata: Metadata = {
  title: '木灵 · 国风创作陪伴 Agent',
  description: '面向日常生活与设计学习的国风创作陪伴 Agent，支持照片转国风、多 Agent 协作、知识检索与动效创作',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#8b0000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <DesktopPet3D />
        <NianhuaAssistant />
      </body>
    </html>
  );
}
