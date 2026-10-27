import { NextRequest, NextResponse } from 'next/server';
import { annualPaintingStyles, getStyleById, getThemeById } from '@/lib/annual-painting-prompts';

// 年画流派详细知识库
const styleKnowledge = {
  'zhuxian': {
    history: '朱仙镇木版年画历史悠久，可追溯至宋代，是中国木版年画的发源地之一。明清时期达到鼎盛，与天津杨柳青、苏州桃花坞、山东杨家埠并称为中国四大木版年画产地。',
    features: '朱仙镇年画以门神、戏曲人物为主要题材，风格古朴豪放，具有浓郁的乡土气息。人物造型夸张，线条运用"铜锤"技法，刚劲有力。色彩以红、黄、绿、紫、黑为主，对比强烈。',
    technique: '采用传统雕版印刷技艺，刻工精细，线条流畅。色彩采用木版套印，一般需要5-6块版才能完成一幅作品。颜料选用天然矿物和植物染料，经久不褪色。',
    stories: ['门神神荼郁垒的传说', '秦琼敬德门神的故事', '新年贴门神的习俗由来'],
    tips: ['可关注朱仙镇年画博物馆', '学习传统雕版技艺可从临摹开始', '了解年画背后的民俗故事有助于理解作品内涵']
  },
  'yangliuqing': {
    history: '杨柳青年画始于明代末年，清代中期达到鼎盛。因产于天津杨柳青镇而得名，是中国北方年画中心。与南方年画代表苏州桃花坞齐名，有"南桃北柳"之誉。',
    features: '杨柳青年画以"细"著称，人物肌肤细腻，服饰华丽。擅长表现多人物、大场面的戏曲故事和民俗生活。画面精美雅致，富有诗意，被誉为"年画中的仕女画"。',
    technique: '采用木版套印与手绘相结合的技法，先印轮廓，再人工彩绘渲染，故称"半印半画"。这一独特工艺使杨柳青年画既有版画的整体效果，又有绘画的细腻神韵。',
    stories: ['莲年有鱼的文化寓意', '五子夺魁的教育意义', '胖娃娃形象的美好祝愿'],
    tips: ['杨柳青年画适合作为装饰画', '可学习"半印半画"技法', '关注年画中的戏曲元素可增加欣赏乐趣']
  },
  'taohuawu': {
    history: '桃花坞年画始于明代中期，清代雍正、乾隆年间最为兴盛。因产于苏州桃花坞而得名，是中国南方年画的代表。与天津杨柳青年画并称"南桃北柳"。',
    features: '桃花坞年画受吴门画派影响，构图借鉴西方透视法，画面层次分明。风格清秀细腻，富有文人画气息。色彩淡雅，以桃红、蓝绿、金黄为主调。',
    technique: '采用传统木版水印技艺，刻工精细，线条流畅。套色版一般4-5块，色彩柔和含蓄，追求淡雅清新的效果。画面多表现城市生活、戏曲故事。',
    stories: ['苏州园林与年画的结合', '桃花坞与唐伯虎的传说', '江南水乡年俗风情'],
    tips: ['桃花坞年画适合书房悬挂', '可关注其与文人画的融合', '学习年画中的构图技法对绘画有帮助']
  },
  'yangjiabu': {
    history: '杨家埠年画始于明代末年，清代乾隆年间最为兴旺。与天津杨柳青、四川绵竹并称为中国三大年画产地。是北方民间年画的代表，具有浓厚的农民画特点。',
    features: '杨家埠年画具有浓郁的农民画特点，形象夸张浪漫，构图饱满匀称。色彩追求大红大绿，对比强烈，充满喜庆气氛。人物造型生动，富有民间艺术活力。',
    technique: '采用木版套印技艺，刻工粗犷有力。色彩鲜艳明快，以大红、桃红、绿、黄、蓝、黑为主。一般6-7块套色版，印完后简单手绘点缀。',
    stories: ['杨家将故事与年画', '门神的驱邪功能', '年年有余的吉祥寓意'],
    tips: ['杨家埠年画色彩鲜艳，适合节日装饰', '可学习其夸张变形的造型手法', '了解农民画特点有助于欣赏']
  },
  'mianzhu': {
    history: '绵竹年画始于明代末年，清代达到鼎盛。是西南地区年画代表，与天津杨柳青、山东杨家埠并称中国三大年画产地。绵竹年画以"分水"技法著称，独具特色。',
    features: '绵竹年画兼具北方的粗犷与南方的秀美。人物形象生动传神，富有蜀中风情。色彩明快，线条流畅，神韵十足。门神、斗方、杂画最为著名。',
    technique: '采用"分水"技法，色彩有"明展明挂"之分。套色版3-4块，用笔蘸色渲染，色彩通透亮丽。人物开像生动，线条刚劲有力，自成一派。',
    stories: ['绵竹年画的起源传说', '三星堆文化与年画', '川西年俗与年画'],
    tips: ['绵竹年画适合收藏', '可学习"分水"技法', '关注其独特的色彩运用方式']
  }
};

// 主题知识库
const themeKnowledge = {
  'menshen': '门神是中国年画中最重要的题材之一，贴于大门上用于驱邪镇宅。最早的门神是神荼、郁垒，后来增加了秦琼、敬德等历史人物。门神形象威武庄严，寄托了人们保家平安的美好愿望。',
  'shoushou': '福禄寿喜是民间最受欢迎的吉祥图案。福星主福运，禄星主功名，寿星主长寿，喜神主喜庆。这些图案表达了人们对美好生活的向往和祝愿。',
  'caidan': '财神是民间信仰中主管财富的神灵。文财神比干、范蠡，武财神赵公明、关羽。贴财神年画寓意招财进宝、财运亨通。',
  'guanyin': '观音菩萨是民间最受崇拜的菩萨之一，以慈悲为怀、救苦救难著称。送子观音尤其受到百姓欢迎，寓意子嗣绵延、人丁兴旺。',
  'wawa': '胖娃娃是年画中的经典形象，通常表现为活泼可爱的孩童。莲笙贵子、欢天喜地等图案寓意连生贵子、人丁兴旺，体现了古人对子孙满堂的期盼。',
  'shinv': '仕女图是年画中的雅致题材，多表现古代美女和戏曲人物。西厢记、红楼梦等文学名著中的场景是常见题材，具有很高的艺术价值。',
  'opera': '戏曲年画将舞台上的戏剧场景定格在画面上，既有装饰功能又有教化意义。三国演义、水浒传、杨家将等历史故事是常见题材。',
  'flower': '花鸟鱼虫年画以自然之美为主题，表现吉祥寓意。如喜鹊登梅寓意喜事临门，鱼跃龙门寓意学业事业有成，牡丹象征富贵荣华。'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { styleId, themeId, specificElement } = body;

    const style = styleId ? getStyleById(styleId) : null;
    const theme = themeId ? getThemeById(themeId) : null;

    // 获取知识库内容
    const styleKey = styleId as keyof typeof styleKnowledge;
    const styleInfo = styleKnowledge[styleKey] || {
      history: '木版年画是中国传统的民间艺术形式，历史悠久，深受人民喜爱。',
      features: '木版年画具有鲜明的地域特色和独特的艺术风格。',
      technique: '采用雕版印刷技艺，色彩鲜艳喜庆。',
      stories: ['年画起源的传说', '年画与民俗的关系', '年画的文化意义'],
      tips: ['可通过博物馆学习年画知识', '动手实践是最好的学习方式', '了解民俗有助于深入理解年画']
    };

    const themeInfo = themeId ? themeKnowledge[themeId as keyof typeof themeKnowledge] : '木版年画题材丰富，寓意吉祥。';

    // 构建文化科普内容
    const culture = {
      overview: `${style?.name || '木版年画'}是${style?.region || '中国'}的传统民间艺术，${style?.description || '具有独特的艺术魅力。'}`,
      history: styleInfo.history,
      features: `${style?.name}年画的艺术特点：${styleInfo.features}`,
      technique: `制作工艺：${styleInfo.technique}`,
      theme: themeInfo,
      themeName: theme?.name || specificElement || '年画主题',
      stories: styleInfo.stories,
      tips: styleInfo.tips,
      styleName: style?.name || '木版年画',
      region: style?.region || ''
    };

    return NextResponse.json({
      success: true,
      culture
    });

  } catch (error: any) {
    console.error('Culture Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取文化科普失败'
    }, { status: 500 });
  }
}
