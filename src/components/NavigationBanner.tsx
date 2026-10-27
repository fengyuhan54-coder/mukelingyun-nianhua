'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 导航配置
const NAV_ITEMS = [
  { href: '/', label: 'AI 对话工作台', icon: '✦' },
  { href: '/muling', label: '木灵 · 国风创作', icon: '🌿' },
  { href: '/annual-painting', label: '木版年画AIGC操作台', icon: '🎨' },
  { href: '/architecture-workbench', label: '年画古建筑AIGC操作台', icon: '🏯' },
  { href: '/intangible-heritage', label: '非遗科普', icon: '📖' },
  { href: '/pattern-library', label: '木版年画数字化知识库', icon: '📚' },
  { href: '/carving-imprint', label: '雕版拓印', icon: '🪵' },
  { href: '/annual-painting-animate', label: '木版年画动起来', icon: '🎬' },
  { href: '/h5-game', label: 'H5交互游戏体验', icon: '🎮' },
  { href: '/copyright-protection', label: '作品版权保护', icon: '📜' },
  { href: '/profile', label: '个人中心', icon: '👤' },
];

// 样式定义
const navStyles = {
  banner: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '12px 0',
  } as React.CSSProperties,
  container: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  link: {
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '22px',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  linkActive: {
    color: 'white',
    background: 'linear-gradient(135deg, #c45656 0%, #a34545 100%)',
    boxShadow: '0 4px 12px rgba(196, 86, 86, 0.3)',
  } as React.CSSProperties,
  linkInactive: {
    color: 'rgba(255,255,255,0.85)',
    background: 'rgba(255,255,255,0.15)',
  } as React.CSSProperties,
  linkHover: {
    background: 'rgba(255,255,255,0.25)',
    transform: 'translateY(-1px)',
  } as React.CSSProperties,
};

export default function NavigationBanner() {
  const pathname = usePathname();

  // 判断是否为当前激活链接
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '';
    }
    return pathname.startsWith(href);
  };

  return (
    <div style={navStyles.banner}>
      <div style={navStyles.container}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              ...navStyles.link,
              ...(isActive(item.href) ? navStyles.linkActive : navStyles.linkInactive),
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
