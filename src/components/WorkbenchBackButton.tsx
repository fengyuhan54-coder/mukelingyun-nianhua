'use client';

import Link from 'next/link';
import styles from './WorkbenchBackButton.module.css';

export default function WorkbenchBackButton() {
  return (
    <Link className={styles.backButton} href="/" aria-label="返回 AI 对话工作台">
      <span aria-hidden="true">←</span>
      <span>返回首页</span>
    </Link>
  );
}
