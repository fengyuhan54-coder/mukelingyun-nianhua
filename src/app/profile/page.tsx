'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAnimateWork, listAnimateWorks, migrateLegacyAnimateWorks, type AnimateWork } from '@/lib/animate-works-storage';
import type { CreativeTask } from '@/lib/creative-task-types';
import { creativeTaskHref, creativeTaskProgress, deleteCreativeTask, getCreativeTaskAsset, listCreativeTasks } from '@/lib/creative-task-storage';

// 默认作品图片 - 木版年画（门神年画系列）
// 注意：请将实际图片保存到 /public/images/nianhua/ 目录
const DEFAULT_NIANHUA_IMAGES: Artwork[] = [
  {
    id: -1,
    user_id: 'default',
    category: 'nianhua' as const,
    title: '门神年画 - 彩色版',
    image_url: '/images/nianhua/menshen-color.jpg',
    description: '传统门神年画，秦琼与尉迟恭，朱仙镇风格，色彩鲜艳',
    prompt: '',
    style: '朱仙镇',
    dynasty: '明代',
    evaluation_data: null,
    culture_content: '',
    is_favorite: false,
    created_at: new Date().toISOString(),
  },
  {
    id: -2,
    user_id: 'default',
    category: 'nianhua' as const,
    title: '门神年画 - 线稿版',
    image_url: '/images/nianhua/menshen-lineart.png',
    description: '门神年画线稿版本，展示传统木版雕刻技艺',
    prompt: '',
    style: '杨柳青',
    dynasty: '清代',
    evaluation_data: null,
    culture_content: '',
    is_favorite: false,
    created_at: new Date().toISOString(),
  },
  {
    id: -3,
    user_id: 'default',
    category: 'nianhua' as const,
    title: '门神年画 - 黑白版',
    image_url: '/images/nianhua/menshen-bw.png',
    description: '门神年画黑白版本，展现木版印刷原始风貌',
    prompt: '',
    style: '杨家埠',
    dynasty: '清代',
    evaluation_data: null,
    culture_content: '',
    is_favorite: false,
    created_at: new Date().toISOString(),
  },
  {
    id: -4,
    user_id: 'default',
    category: 'nianhua' as const,
    title: '门神年画 - 淡彩版',
    image_url: '/images/nianhua/menshen-light.png',
    description: '门神年画淡彩版本，色彩柔和雅致',
    prompt: '',
    style: '桃花坞',
    dynasty: '清代',
    evaluation_data: null,
    culture_content: '',
    is_favorite: false,
    created_at: new Date().toISOString(),
  },
  {
    id: -5,
    user_id: 'default',
    category: 'nianhua' as const,
    title: '门神年画 - 红底版',
    image_url: '/images/nianhua/menshen-red.png',
    description: '门神年画红底版本，传统喜庆风格',
    prompt: '',
    style: '绵竹',
    dynasty: '清代',
    evaluation_data: null,
    culture_content: '',
    is_favorite: false,
    created_at: new Date().toISOString(),
  },
  {
    id: -6,
    user_id: 'default',
    category: 'nianhua' as const,
    title: '财神年画 - 福禄寿',
    image_url: '/images/nianhua/caishen.jpeg',
    description: '财神年画，寓意招财进宝，福禄双全',
    prompt: '',
    style: '杨柳青',
    dynasty: '清代',
    evaluation_data: null,
    culture_content: '',
    is_favorite: false,
    created_at: new Date().toISOString(),
  },
  {
    id: -7,
    user_id: 'default',
    category: 'nianhua' as const,
    title: '仕女年画 - 戏曲人物',
    image_url: '/images/nianhua/shinv.jpeg',
    description: '仕女年画，展现传统戏曲人物风采',
    prompt: '',
    style: '桃花坞',
    dynasty: '清代',
    evaluation_data: null,
    culture_content: '',
    is_favorite: false,
    created_at: new Date().toISOString(),
  },
  {
    id: -8,
    user_id: 'default',
    category: 'nianhua' as const,
    title: '门神年画 - 铜锤门神',
    image_url: '/images/nianhua/menshen-tongchui.jpeg',
    description: '铜锤门神年画，传统驱邪避凶寓意',
    prompt: '',
    style: '朱仙镇',
    dynasty: '明代',
    evaluation_data: null,
    culture_content: '',
    is_favorite: false,
    created_at: new Date().toISOString(),
  },
];

// 默认作品图片 - 古建筑
const DEFAULT_ARCHITECTURE_IMAGES: Artwork[] = [
  {
    id: -101,
    user_id: 'default',
    category: 'architecture' as const,
    title: '唐代宫殿 - 大明宫',
    image_url: '/images/architecture/daming-palace.jpeg',
    description: '唐代大明宫复原图，展现盛唐建筑风貌',
    prompt: '',
    style: '唐代',
    dynasty: '唐代',
    evaluation_data: null,
    culture_content: '',
    is_favorite: false,
    created_at: new Date().toISOString(),
  },
  {
    id: -102,
    user_id: 'default',
    category: 'architecture' as const,
    title: '宋代寺庙 - 佛光寺',
    image_url: '/images/architecture/foguang-temple.jpeg',
    description: '宋代佛光寺大殿，展现宋代建筑特色',
    prompt: '',
    style: '宋代',
    dynasty: '宋代',
    evaluation_data: null,
    culture_content: '',
    is_favorite: false,
    created_at: new Date().toISOString(),
  },
  {
    id: -103,
    user_id: 'default',
    category: 'architecture' as const,
    title: '明清园林 - 苏州园林',
    image_url: '/images/architecture/suzhou-garden.jpeg',
    description: '苏州园林建筑，展现明清园林艺术',
    prompt: '',
    style: '明代',
    dynasty: '明代',
    evaluation_data: null,
    culture_content: '',
    is_favorite: false,
    created_at: new Date().toISOString(),
  },
];

interface Artwork {
  id: number;
  user_id: string;
  category: 'nianhua' | 'architecture';
  title: string;
  image_url: string;
  description: string;
  prompt: string;
  style: string;
  dynasty: string;
  evaluation_data: any;
  culture_content: string;
  is_favorite: boolean;
  created_at: string;
}

type DynamicWorkView = AnimateWork & { playbackUrl: string };
interface UserProfile {
  id: number;
  user_id: string;
  nickname: string;
  real_name: string;
  id_card: string;
  phone: string;
  email: string;
  avatar_url: string;
  bio: string;
  is_verified: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tasks' | 'nianhua' | 'architecture' | 'animate' | 'profile'>('tasks');
  const [creativeTasks, setCreativeTasks] = useState<CreativeTask[]>([]);
  const [nianhuaWorks, setNianhuaWorks] = useState<Artwork[]>([]);
  const [architectureWorks, setArchitectureWorks] = useState<Artwork[]>([]);
  const [dynamicWorks, setDynamicWorks] = useState<DynamicWorkView[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Artwork | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dynamicObjectUrlsRef = useRef<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState({
    nickname: '',
    real_name: '',
    id_card: '',
    phone: '',
    email: '',
    bio: '',
  });

  // 获取用户ID（使用localStorage模拟）
  const getUserId = () => {
    if (typeof window === 'undefined') return 'default-user';
    let userId = localStorage.getItem('user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('user_id', userId);
    }
    return userId;
  };

  // 加载数据
  useEffect(() => {
    setUserId(getUserId());
    loadData();
    void loadDynamicWorks();
    void listCreativeTasks().then(setCreativeTasks);
    return () => {
      dynamicObjectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      dynamicObjectUrlsRef.current = [];
    };
  }, []);

  const loadDynamicWorks = async () => {
    try {
      await migrateLegacyAnimateWorks();
      const works = await listAnimateWorks();
      dynamicObjectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      const objectUrls: string[] = [];
      const visibleWorks = works.map(work => {
        const playbackUrl = work.videoBlob ? URL.createObjectURL(work.videoBlob) : (work.remoteUrl || '');
        if (work.videoBlob && playbackUrl) objectUrls.push(playbackUrl);
        return { ...work, playbackUrl };
      }).filter(work => Boolean(work.playbackUrl));
      dynamicObjectUrlsRef.current = objectUrls;
      setDynamicWorks(visibleWorks);
    } catch (error) {
      console.error('加载动态视频作品失败:', error);
      setDynamicWorks([]);
    }
  };

  const handleDeleteDynamicWork = async (id: string) => {
    if (!confirm('确定要删除这个动态视频作品吗？')) return;
    try {
      await deleteAnimateWork(id);
      await loadDynamicWorks();
    } catch (error) {
      console.error('删除动态视频作品失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleDownloadDynamicWork = (work: DynamicWorkView) => {
    const link = document.createElement('a');
    link.href = work.playbackUrl;
    link.download = `${work.title || '国风动态作品'}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportCreativeTask = async (task: CreativeTask) => {
    const artifact = task.artifacts[0];
    const stored = artifact?.assetId ? await getCreativeTaskAsset(artifact.assetId) : undefined;
    const blob = stored instanceof Blob ? stored : stored && typeof stored === 'string' && stored.startsWith('data:') ? await fetch(stored).then(response => response.blob()) : new Blob([JSON.stringify(task, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = typeof stored === 'string' && !stored.startsWith('data:') ? stored : URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url;
    link.download = artifact ? artifact.title + (artifact.type === 'video' ? '.mp4' : '.png') : task.title + '-任务记录.json';
    document.body.appendChild(link); link.click(); link.remove(); if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  };

  const removeCreativeTask = async (task: CreativeTask) => {
    if (!confirm('确定删除任务“' + task.title + '”及其统一归档记录吗？')) return;
    await deleteCreativeTask(task.id); setCreativeTasks(current => current.filter(item => item.id !== task.id));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载作品
      const [nianhuaRes, archRes, profileRes] = await Promise.all([
        fetch(`/api/artworks?category=nianhua&user_id=${userId}`),
        fetch(`/api/artworks?category=architecture&user_id=${userId}`),
        fetch(`/api/profile?user_id=${userId}`),
      ]);

      if (nianhuaRes.ok) {
        const data = await nianhuaRes.json();
        const userWorks = data.data || [];
        // 如果没有用户作品，显示默认作品
        setNianhuaWorks(userWorks.length > 0 ? userWorks : DEFAULT_NIANHUA_IMAGES);
      } else {
        // API请求失败时也显示默认作品
        setNianhuaWorks(DEFAULT_NIANHUA_IMAGES);
      }

      if (archRes.ok) {
        const data = await archRes.json();
        const userWorks = data.data || [];
        // 如果没有用户作品，显示默认作品
        setArchitectureWorks(userWorks.length > 0 ? userWorks : DEFAULT_ARCHITECTURE_IMAGES);
      } else {
        // API请求失败时也显示默认作品
        setArchitectureWorks(DEFAULT_ARCHITECTURE_IMAGES);
      }

      if (profileRes.ok) {
        const data = await profileRes.json();
        if (data.data) {
          setProfile(data.data);
          setFormData({
            nickname: data.data.nickname || '',
            real_name: data.data.real_name || '',
            id_card: data.data.id_card || '',
            phone: data.data.phone || '',
            email: data.data.email || '',
            bio: data.data.bio || '',
          });
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      // 出错时显示默认作品
      setNianhuaWorks(DEFAULT_NIANHUA_IMAGES);
      setArchitectureWorks(DEFAULT_ARCHITECTURE_IMAGES);
    } finally {
      setLoading(false);
    }
  };

  // 头像上传处理
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('仅支持 JPG、PNG、GIF、WebP 格式的图片');
      return;
    }

    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('图片大小不能超过5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('user_id', userId);

      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        // 更新头像显示
        if (profile) {
          setProfile({ ...profile, avatar_url: data.avatar_url });
        }
        alert('头像上传成功！');
      } else {
        alert(data.error || '头像上传失败');
      }
    } catch (error) {
      console.error('头像上传失败:', error);
      alert('头像上传失败，请重试');
    } finally {
      setUploadingAvatar(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 保存个人信息
  const handleSaveProfile = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ...formData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.data);
        setEditingProfile(false);
        alert('保存成功！');
      } else {
        alert('保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    }
  };

  // 删除作品
  const handleDeleteWork = async (workId: number) => {
    if (!confirm('确定要删除这个作品吗？')) return;

    try {
      const res = await fetch(`/api/artworks/${workId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadData();
        setSelectedWork(null);
        alert('删除成功！');
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 更新作品
  const handleUpdateWork = async () => {
    if (!selectedWork) return;

    try {
      const res = await fetch(`/api/artworks/${selectedWork.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedWork.title,
          description: selectedWork.description,
          is_favorite: selectedWork.is_favorite,
        }),
      });

      if (res.ok) {
        loadData();
        setShowEditModal(false);
        alert('更新成功！');
      } else {
        alert('更新失败');
      }
    } catch (error) {
      console.error('更新失败:', error);
      alert('更新失败');
    }
  };

  // 切换收藏
  const handleToggleFavorite = async (work: Artwork) => {
    try {
      const res = await fetch(`/api/artworks/${work.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_favorite: !work.is_favorite,
        }),
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #faf7f2 0%, #f5f0e8 100%)',
      padding: '20px',
    },
    header: {
      maxWidth: '1200px',
      margin: '0 auto 30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      boxShadow: '0 4px 12px rgba(196, 30, 58, 0.3)',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#2c1810',
      fontFamily: 'STKaiti, "KaiTi", serif',
    },
    tabs: {
      maxWidth: '1200px',
      margin: '0 auto 20px',
      display: 'flex',
      gap: '10px',
      borderBottom: '2px solid #e8ddd0',
      paddingBottom: '10px',
    },
    tab: (active: boolean) => ({
      padding: '12px 24px',
      background: active ? 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)' : 'transparent',
      color: active ? '#fff' : '#666',
      border: 'none',
      borderRadius: '8px 8px 0 0',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: active ? 'bold' : 'normal',
      transition: 'all 0.3s',
    }),
    content: {
      maxWidth: '1200px',
      margin: '0 auto',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '20px',
    },
    card: {
      background: '#fff',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      cursor: 'pointer',
      transition: 'transform 0.3s, box-shadow 0.3s',
    },
    cardImage: {
      width: '100%',
      height: '200px',
      objectFit: 'cover' as const,
    },
    cardContent: {
      padding: '15px',
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#2c1810',
      marginBottom: '8px',
      fontFamily: 'STKaiti, "KaiTi", serif',
    },
    cardDesc: {
      fontSize: '13px',
      color: '#666',
      lineHeight: '1.5',
    },
    cardActions: {
      display: 'flex',
      gap: '10px',
      marginTop: '10px',
    },
    actionBtn: (color: string) => ({
      padding: '6px 12px',
      background: color,
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
    }),
    emptyState: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: '#999',
    },
    profileCard: {
      background: '#fff',
      borderRadius: '16px',
      padding: '30px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    },
    profileHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      marginBottom: '30px',
      paddingBottom: '20px',
      borderBottom: '1px solid #f0e6d8',
    },
    avatar: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '32px',
      fontWeight: 'bold',
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      color: '#666',
      marginBottom: '8px',
      fontWeight: '500',
    },
    input: {
      width: '100%',
      padding: '12px 15px',
      border: '1px solid #e8ddd0',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.3s',
    },
    textarea: {
      width: '100%',
      padding: '12px 15px',
      border: '1px solid #e8ddd0',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      resize: 'vertical' as const,
      minHeight: '100px',
    },
    saveBtn: {
      padding: '12px 30px',
      background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: 'bold',
    },
    editBtn: {
      padding: '10px 20px',
      background: 'linear-gradient(135deg, #d4a574 0%, #b8860b 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
    },
    modal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      background: '#fff',
      borderRadius: '16px',
      padding: '30px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
    },
    verified: {
      display: 'inline-block',
      padding: '4px 12px',
      background: '#52c41a',
      color: '#fff',
      borderRadius: '12px',
      fontSize: '12px',
      marginLeft: '10px',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push('/')}>
          ← 返回首页
        </button>
        <h1 style={styles.title}>个人中心</h1>
        <div style={{ width: '100px' }}></div>
      </div>

      {/* 标签页 */}
      <div style={styles.tabs}>
        <button style={styles.tab(activeTab === 'tasks')} onClick={() => setActiveTab('tasks')}>🧭 按任务查看</button>
        <button
          style={styles.tab(activeTab === 'nianhua')}
          onClick={() => setActiveTab('nianhua')}
        >
          🎨 木版年画作品
        </button>
        <button
          style={styles.tab(activeTab === 'architecture')}
          onClick={() => setActiveTab('architecture')}
        >
          🏛️ 古建筑作品
        </button>
        <button
          style={styles.tab(activeTab === 'animate')}
          onClick={() => setActiveTab('animate')}
        >
          🎬 动态视频作品
        </button>        <button
          style={styles.tab(activeTab === 'profile')}
          onClick={() => setActiveTab('profile')}
        >
          👤 个人信息
        </button>
      </div>

      {/* 内容区 */}
      <div style={styles.content}>
        {activeTab === 'tasks' && (
          <div>
            {creativeTasks.length === 0 ? <div style={styles.emptyState}><div style={{ fontSize: 52 }}>🧭</div><div>还没有持续创作任务，请从首页告诉木灵一件生活里的事。</div></div> : (
              <div style={{ display: 'grid', gap: 18 }}>
                {creativeTasks.map(task => { const progress = creativeTaskProgress(task); return <article key={task.id} style={{ padding: 20, border: '1px solid #ead5c5', borderRadius: 16, background: '#fffaf5', boxShadow: '0 8px 24px rgba(92,48,35,.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><small style={{ color: '#a45645' }}>{task.type === 'culture-tour' ? '文化伴游任务' : '生活场景创作'}</small><h3 style={{ margin: '5px 0', color: '#582e26' }}>{task.title}</h3><p style={{ margin: 0, color: '#806b62' }}>{task.brief}</p></div><strong style={{ color: '#9b372d' }}>{progress.percent}%</strong></div>
                  <div style={{ height: 8, borderRadius: 99, background: '#eadfd5', margin: '14px 0', overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: progress.percent + '%', background: '#a43c31' }} /></div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: '#765d53', fontSize: 13 }}><span>静态作品 {task.artifacts.filter(item => item.type === 'image').length}</span><span>视频 {task.artifacts.filter(item => item.type === 'video').length}</span><span>文化素材 {task.materials.length}</span>{task.eventDate && <span>日期 {task.eventDate}</span>}</div>
                  {!!task.materials.length && <p style={{ color: '#8a6659', margin: '12px 0' }}>已收集：{task.materials.slice(0, 4).map(item => item.title).join('、')}</p>}
                  {!!task.artifacts.length && <p style={{ color: '#8a6659', margin: '10px 0' }}>作品版本：{task.artifacts.slice(0, 5).map(item => item.title).join('、')}</p>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}><button style={styles.actionBtn('#9d392f')} onClick={() => router.push(creativeTaskHref(task))}>继续任务</button><button style={styles.actionBtn('#94634e')} onClick={() => void exportCreativeTask(task)}>导出作品</button><button style={styles.actionBtn('#666')} onClick={() => void removeCreativeTask(task)}>删除任务</button></div>
                </article>; })}
              </div>
            )}
          </div>
        )}
        {/* 木版年画作品 */}
        {activeTab === 'nianhua' && (
          <div>
            {nianhuaWorks.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎨</div>
                <div style={{ fontSize: '18px', marginBottom: '10px' }}>暂无木版年画作品</div>
                <div style={{ fontSize: '14px' }}>去创作吧，您的作品会显示在这里</div>
              </div>
            ) : (
              <div style={styles.grid}>
                {nianhuaWorks.map((work) => (
                  <div
                    key={work.id}
                    style={styles.card}
                    onClick={() => setSelectedWork(work)}
                  >
                    <img
                      src={work.image_url}
                      alt={work.title}
                      style={styles.cardImage}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/default-nianhua.jpg';
                      }}
                    />
                    <div style={styles.cardContent}>
                      <div style={styles.cardTitle}>{work.title}</div>
                      <div style={styles.cardDesc}>{work.description}</div>
                      <div style={styles.cardActions}>
                        <button
                          style={styles.actionBtn(work.is_favorite ? '#f5a623' : '#999')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(work);
                          }}
                        >
                          {work.is_favorite ? '★ 已收藏' : '☆ 收藏'}
                        </button>
                        <button
                          style={styles.actionBtn('#c41e3a')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWork(work);
                            setShowEditModal(true);
                          }}
                        >
                          编辑
                        </button>
                        <button
                          style={styles.actionBtn('#666')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWork(work.id);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 古建筑作品 */}
        {activeTab === 'architecture' && (
          <div>
            {architectureWorks.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '60px', marginBottom: '20px' }}>🏛️</div>
                <div style={{ fontSize: '18px', marginBottom: '10px' }}>暂无古建筑作品</div>
                <div style={{ fontSize: '14px' }}>去创作吧，您的作品会显示在这里</div>
              </div>
            ) : (
              <div style={styles.grid}>
                {architectureWorks.map((work) => (
                  <div
                    key={work.id}
                    style={styles.card}
                    onClick={() => setSelectedWork(work)}
                  >
                    <img
                      src={work.image_url}
                      alt={work.title}
                      style={styles.cardImage}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/default-architecture.jpg';
                      }}
                    />
                    <div style={styles.cardContent}>
                      <div style={styles.cardTitle}>{work.title}</div>
                      <div style={styles.cardDesc}>{work.description}</div>
                      <div style={styles.cardActions}>
                        <button
                          style={styles.actionBtn(work.is_favorite ? '#f5a623' : '#999')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(work);
                          }}
                        >
                          {work.is_favorite ? '★ 已收藏' : '☆ 收藏'}
                        </button>
                        <button
                          style={styles.actionBtn('#c41e3a')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWork(work);
                            setShowEditModal(true);
                          }}
                        >
                          编辑
                        </button>
                        <button
                          style={styles.actionBtn('#666')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWork(work.id);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 动态视频作品 */}
        {activeTab === 'animate' && (
          <div>
            {dynamicWorks.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎬</div>
                <div style={{ fontSize: '18px', marginBottom: '10px' }}>暂无动态视频作品</div>
                <div style={{ fontSize: '14px' }}>在“光影新生 · AI 动效创作”生成视频后，点击“保存到个人中心”即可在这里查看。</div>
              </div>
            ) : (
              <div style={styles.grid}>
                {dynamicWorks.map((work) => (
                  <div key={work.id} style={{ ...styles.card, cursor: 'default' }}>
                    <video src={work.playbackUrl} controls preload="metadata" style={{ ...styles.cardImage, background: '#211915' }} />
                    <div style={styles.cardContent}>
                      <div style={styles.cardTitle}>{work.title}</div>
                      <div style={styles.cardDesc}>{work.summary}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', color: '#8b5a45', fontSize: '12px' }}>
                        <span>{work.resolution}</span>
                        {work.duration > 0 && <span>· {work.duration} 秒</span>}
                        <span>· {new Date(work.createdAt).toLocaleString('zh-CN')}</span>
                      </div>
                      <div style={styles.cardActions}>
                        <button style={styles.actionBtn('#a33a2d')} onClick={() => handleDownloadDynamicWork(work)}>下载 MP4</button>
                        <button style={styles.actionBtn('#666')} onClick={() => void handleDeleteDynamicWork(work.id)}>删除</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* 个人信息 */}
        {activeTab === 'profile' && (
          <div style={styles.profileCard}>
            <div style={styles.profileHeader}>
              <div
                style={{
                  ...styles.avatar,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={handleAvatarClick}
                title="点击更换头像"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="头像"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '50%',
                    }}
                  />
                ) : (
                  profile?.nickname?.charAt(0) || '用'
                )}
                {uploadingAvatar && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  >
                    上传中...
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
              <div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c1810' }}>
                  {profile?.nickname || '未设置昵称'}
                  {profile?.is_verified && <span style={styles.verified}>已认证</span>}
                </div>
                <div style={{ fontSize: '14px', color: '#999', marginTop: '5px' }}>
                  用户ID: {userId}
                </div>
                <div style={{ fontSize: '12px', color: '#c41e3a', marginTop: '5px', cursor: 'pointer' }} onClick={handleAvatarClick}>
                  {profile?.avatar_url ? '更换头像' : '上传头像'}
                </div>
              </div>
            </div>

            {editingProfile ? (
              <div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>昵称</label>
                  <input
                    style={styles.input}
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    placeholder="请输入昵称"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>真实姓名（实名认证）</label>
                  <input
                    style={styles.input}
                    value={formData.real_name}
                    onChange={(e) => setFormData({ ...formData, real_name: e.target.value })}
                    placeholder="请输入真实姓名"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>身份证号</label>
                  <input
                    style={styles.input}
                    value={formData.id_card}
                    onChange={(e) => setFormData({ ...formData, id_card: e.target.value })}
                    placeholder="请输入身份证号"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>手机号</label>
                  <input
                    style={styles.input}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="请输入手机号"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>邮箱</label>
                  <input
                    style={styles.input}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="请输入邮箱"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>个人简介</label>
                  <textarea
                    style={styles.textarea}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="介绍一下自己吧..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={styles.saveBtn} onClick={handleSaveProfile}>
                    保存
                  </button>
                  <button
                    style={{ ...styles.saveBtn, background: '#999' }}
                    onClick={() => setEditingProfile(false)}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={styles.label}>真实姓名</div>
                  <div style={{ fontSize: '16px', color: '#2c1810' }}>
                    {profile?.real_name || '未认证'}
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={styles.label}>手机号</div>
                  <div style={{ fontSize: '16px', color: '#2c1810' }}>
                    {profile?.phone || '未设置'}
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={styles.label}>邮箱</div>
                  <div style={{ fontSize: '16px', color: '#2c1810' }}>
                    {profile?.email || '未设置'}
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={styles.label}>个人简介</div>
                  <div style={{ fontSize: '16px', color: '#2c1810', lineHeight: '1.6' }}>
                    {profile?.bio || '这个人很懒，什么都没写~'}
                  </div>
                </div>
                <button style={styles.editBtn} onClick={() => setEditingProfile(true)}>
                  编辑资料
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 作品详情弹窗 */}
      {selectedWork && !showEditModal && (
        <div style={styles.modal} onClick={() => setSelectedWork(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedWork.image_url}
              alt={selectedWork.title}
              style={{ width: '100%', borderRadius: '12px', marginBottom: '20px' }}
            />
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
              {selectedWork.title}
            </h2>
            <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '20px' }}>
              {selectedWork.description}
            </p>
            {selectedWork.style && (
              <div style={{ marginBottom: '10px' }}>
                <span style={{ color: '#999' }}>风格：</span>
                <span>{selectedWork.style}</span>
              </div>
            )}
            {selectedWork.dynasty && (
              <div style={{ marginBottom: '10px' }}>
                <span style={{ color: '#999' }}>朝代：</span>
                <span>{selectedWork.dynasty}</span>
              </div>
            )}
            <div style={{ color: '#999', fontSize: '13px', marginBottom: '20px' }}>
              创建于 {new Date(selectedWork.created_at).toLocaleString('zh-CN')}
            </div>
            <button
              style={{ ...styles.saveBtn, width: '100%' }}
              onClick={() => setSelectedWork(null)}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEditModal && selectedWork && (
        <div style={styles.modal} onClick={() => setShowEditModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
              编辑作品
            </h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>作品标题</label>
              <input
                style={styles.input}
                value={selectedWork.title}
                onChange={(e) => setSelectedWork({ ...selectedWork, title: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>作品描述</label>
              <textarea
                style={styles.textarea}
                value={selectedWork.description}
                onChange={(e) => setSelectedWork({ ...selectedWork, description: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={styles.saveBtn} onClick={handleUpdateWork}>
                保存
              </button>
              <button
                style={{ ...styles.saveBtn, background: '#999' }}
                onClick={() => setShowEditModal(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
