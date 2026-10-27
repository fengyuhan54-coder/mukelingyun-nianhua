// 木版年画专属 Prompt 模板（增强版：流派主题绑定 + 标准素材库）

export interface AnnualPaintingStyle {
  id: string;
  name: string;
  region: string;
  description: string;
  features: string[];
  colors: string[];
  artisticFeatures: string;
  // 增强：构图规范
  compositionRules: string[];
  // 增强：造型特征
  figureStyles: string[];
}

export interface AnnualPaintingTheme {
  id: string;
  name: string;
  category: string;
  description: string;
  elements: string[];
}

// 五大年画流派（增强版）
export const annualPaintingStyles: AnnualPaintingStyle[] = [
  {
    id: 'zhuxian',
    name: '开封朱仙镇',
    region: '豫（河南）',
    description: '中国木版年画的发源地之一，以戏曲人物、门神最为著名。',
    features: ['人物造型夸张', '线条粗犷有力', '色彩浓重艳丽', '构图饱满'],
    colors: ['朱红', '槐黄', '石绿', '紫红', '黑'],
    artisticFeatures: '朱仙镇年画以门神、戏曲人物为主，风格古朴豪放，具有浓郁的乡土气息。人物多为正面站立，气宇轩昂，线条运用"铜锤"技法，刚劲有力。',
    compositionRules: ['人物居中正立', '对称构图', '背景简化留白', '饱满紧凑'],
    figureStyles: ['头大身小', '形象夸张', '正视威严', '服饰简化']
  },
  {
    id: 'yangliuqing',
    name: '天津杨柳青',
    region: '津（天津）',
    description: '北方年画中心，以仕女、娃娃、戏曲故事最为精美。',
    features: ['人物秀美', '笔法细腻', '色彩柔和', '场景丰富'],
    colors: ['粉红', '翠绿', '鹅黄', '淡蓝', '玫瑰红'],
    artisticFeatures: '杨柳青年画以"细"著称，人物肌肤细腻，服饰华丽，擅长表现多人物、大场面的戏曲故事和民俗生活。画面精美雅致，富有诗意。',
    compositionRules: ['人物与环境融合', '散点透视', '层次丰富', '留白透气'],
    figureStyles: ['身段修长', '面容圆润', '姿态优雅', '服饰精细']
  },
  {
    id: 'taohuawu',
    name: '苏州桃花坞',
    region: '苏（江苏）',
    description: '南方年画代表，以城市风光、戏曲故事最为独特。',
    features: ['画面精致', '色彩雅致', '构图讲究', '装饰性强'],
    colors: ['桃红', '蓝绿', '金黄', '淡紫', '月白'],
    artisticFeatures: '桃花坞年画受吴门画派影响，构图借鉴西方透视法，画面层次分明。风格清秀细腻，富有文人画气息，独具江南水乡韵味。',
    compositionRules: ['焦点透视', '远近层次', '建筑配景', '空间深远'],
    figureStyles: ['比例写实', '面容清秀', '线条流畅', '文人气质']
  },
  {
    id: 'yangjiabu',
    name: '山东杨家埠',
    region: '鲁（山东）',
    description: '北方民间年画重镇，以神像、门神、戏曲最为出名。',
    features: ['造型生动', '色彩鲜艳', '夸张变形', '装饰华丽'],
    colors: ['大红', '金黄', '翠绿', '品蓝', '黑'],
    artisticFeatures: '杨家埠年画具有浓厚的农民画特点，形象夸张浪漫，构图饱满匀称。色彩对比强烈，追求大红大绿的喜庆效果，富有民间艺术活力。',
    compositionRules: ['饱满匀称', '装饰繁复', '对比强烈', '喜庆热闹'],
    figureStyles: ['夸张浪漫', '变形装饰', '形象生动', '富有动感']
  },
  {
    id: 'mianzhu',
    name: '四川绵竹',
    region: '川（四川）',
    description: '西南年画代表，以门神、斗方、杂画最为精美。',
    features: ['色彩明快', '造型夸张', '线条流畅', '神韵生动'],
    colors: ['朱红', '槐黄', '品绿', '丹紫', '银朱'],
    artisticFeatures: '绵竹年画以"分水"技法著称，色彩有"明展明挂"之分。人物形象生动传神，富有蜀中风情，兼具北方的粗犷与南方的秀美。',
    compositionRules: ['主次分明', '疏密有致', '神韵为上', '南北融合'],
    figureStyles: ['形象生动', '神韵兼备', '粗细结合', '富有灵气']
  }
];

// 年画主题分类
export const annualPaintingThemes = [
  {
    id: 'menshen',
    name: '门神',
    category: '神像类',
    description: '驱邪镇宅，保家平安',
    elements: ['秦琼', '尉迟恭', '将军门神', '文官门神', '步下门神', '哼哈二将']
  },
  {
    id: 'shoushou',
    name: '福禄寿喜',
    category: '吉祥类',
    description: '福星高照，添丁进财',
    elements: ['福星', '禄星', '寿星', '喜神', '和合二仙', '摇钱树', '聚宝盆']
  },
  {
    id: 'caidan',
    name: '财神',
    category: '神像类',
    description: '招财进宝，财运亨通',
    elements: ['文财神比干', '武财神关羽', '利市仙官', '招财童子', '进宝天尊', '赵公明']
  },
  {
    id: 'guanyin',
    name: '观音',
    category: '神像类',
    description: '慈悲为怀，救苦救难',
    elements: ['送子观音', '杨柳观音', '千手观音', '白衣观音', '滴水观音', '慈航真人']
  },
  {
    id: 'wawa',
    name: '娃娃',
    category: '仕女类',
    description: '连生贵子，人丁兴旺',
    elements: ['莲笙贵子', '欢天喜地', '五子夺魁', '金玉满堂', '蟾宫折桂', '连生贵子']
  },
  {
    id: 'shinv',
    name: '仕女',
    category: '仕女类',
    description: '美人如画，婉约秀丽',
    elements: ['西厢记崔莺莺', '天仙配七仙女', '牡丹亭杜丽娘', '红楼梦金陵十二钗', '仕女游春']
  },
  {
    id: 'opera',
    name: '戏曲',
    category: '故事类',
    description: '戏曲故事，寓教于乐',
    elements: ['三英战吕布', '空城计', '白蛇传', '穆桂英挂帅', '杨家将', '西游记取经']
  },
  {
    id: 'flower',
    name: '花鸟鱼虫',
    category: '装饰类',
    description: '自然之美，生机盎然',
    elements: ['花开富贵', '喜鹊登梅', '鱼跃龙门', '凤凰牡丹', '蝶恋花', '松鹤延年']
  }
];

// ============== 流派-主题绑定标准素材库 ==============

interface ThemeMaterialLibrary {
  [styleId: string]: {
    [themeId: string]: {
      baseElements: string[];      // 基础元素
      compositionTemplate: string; // 构图模板
      figurePose: string[];        // 人物姿态
      colorScheme: string[];       // 配色方案
      decorativePatterns: string[]; // 装饰纹样
      shapeCharacteristics: string; // 造型特征描述
    }
  }
}

export const themeMaterialLibrary: ThemeMaterialLibrary = {
  // 开封朱仙镇
  'zhuxian': {
    'menshen': {
      baseElements: ['秦琼', '尉迟恭', '大唐武将装束', '双锏单鞭', '威严站姿', '门神年画'],
      compositionTemplate: '左右对称双门神布局，人物居中正立，背景简化为吉祥纹样边框',
      figurePose: ['正面站立', '双手执械', '怒目圆睁', '甲胄鲜明', '气宇轩昂'],
      colorScheme: ['朱红底色', '槐黄点缀', '石绿配饰', '黑线勾勒', '紫红渲染'],
      decorativePatterns: ['万字纹边框', '回纹底衬', '祥云装饰', '铜钱纹边饰'],
      shapeCharacteristics: '头大身小，造型夸张，线条粗犷如铜锤，刚劲有力，正视威严'
    },
    'shoushou': {
      baseElements: ['寿星', '禄星', '福星', '三星拱照', '吉祥纹样'],
      compositionTemplate: '三星居中布局，寿星居中稍高，福禄两旁，背景衬以松鹤祥云',
      figurePose: ['坐姿为主', '手持寿桃', '手持如意图', '手持折扇', '和蔼慈祥'],
      colorScheme: ['朱红喜庆', '槐黄尊贵', '石绿生机', '金粉装饰'],
      decorativePatterns: ['寿字纹', '蝙蝠纹', '祥云纹', '松枝纹'],
      shapeCharacteristics: '形象夸张，面容圆润，线条粗放，富有喜庆气氛'
    },
    'caidan': {
      baseElements: ['武财神赵公明', '关公', '招财进宝', '利市仙官'],
      compositionTemplate: '财神居中正坐或正立，身旁配以聚宝盆、摇钱树等吉祥物',
      figurePose: ['正襟危坐', '手持金元宝', '身着大红官服', '威严庄重'],
      colorScheme: ['大红官服', '金色配饰', '朱红底色', '黑线勾勒'],
      decorativePatterns: ['铜钱纹', '金元宝纹', '聚宝盆纹', '祥云纹'],
      shapeCharacteristics: '形象威严，服饰华丽，色彩浓烈，富有财气'
    },
    'guanyin': {
      baseElements: ['送子观音', '杨柳观音', '白衣观音', '净瓶杨枝'],
      compositionTemplate: '观音居中端坐或立于莲台之上，背景以佛光、祥云、莲花为主',
      figurePose: ['端坐莲台', '手持净瓶', '杨枝洒露', '面容慈祥', '慈悲庄严'],
      colorScheme: ['素雅白色', '淡黄光晕', '青色莲台', '金色佛光'],
      decorativePatterns: ['佛光纹', '莲瓣纹', '祥云纹', '璎珞纹'],
      shapeCharacteristics: '形象端庄，线条粗犷中见柔美，具有北方民间观音的豪放气质'
    },
    'wawa': {
      baseElements: ['胖娃娃', '莲年有鱼', '嬉戏孩童', '欢乐场面'],
      compositionTemplate: '娃娃居中或散点分布，姿态活泼可爱，背景配以莲、鱼、花卉',
      figurePose: ['活泼嬉戏', '怀抱鲤鱼', '骑鲤玩耍', '手捧莲花', '憨态可掬'],
      colorScheme: ['粉红肤色', '翠绿莲叶', '朱红锦鲤', '鹅黄服饰'],
      decorativePatterns: ['莲瓣纹', '鱼鳞纹', '如意纹', '福字纹'],
      shapeCharacteristics: '头大身小，圆润可爱，形象夸张，富有乡土气息'
    },
    'shinv': {
      baseElements: ['仕女游春', '戏曲人物', '红楼梦仕女', '古装美人'],
      compositionTemplate: '仕女居中或三两成群，背景配以亭台楼阁、花木山石',
      figurePose: ['古装立姿', '执扇拈花', '倚栏远眺', '轻纱曼舞'],
      colorScheme: ['粉红罗裙', '淡紫披帛', '翠绿点缀', '鹅黄面妆'],
      decorativePatterns: ['花卉纹', '祥云纹', '如意纹', '盘长纹'],
      shapeCharacteristics: '形象秀美，线条虽粗犷但不失江南仕女的婉约'
    },
    'opera': {
      baseElements: ['戏曲人物', '三国演义', '水浒传', '杨家将', '脸谱'],
      compositionTemplate: '戏剧化人物造型，身着戏服，分组展示戏曲场景',
      figurePose: ['戏曲亮相', '武打姿态', '唱腔手势', '人物对峙'],
      colorScheme: ['脸谱色彩', '戏服艳丽', '大红色为主', '金色装饰'],
      decorativePatterns: ['龙纹', '凤纹', '祥云纹', '花卉纹'],
      shapeCharacteristics: '戏曲脸谱特征，色彩浓烈，造型夸张，具有北方年画特色'
    },
    'flower': {
      baseElements: ['牡丹', '喜鹊', '鲤鱼', '莲花', '梅花'],
      compositionTemplate: '花卉为主角，配以鸟鱼虫兽，饱满构图，喜庆吉祥',
      figurePose: ['喜鹊登梅', '鱼戏莲叶', '牡丹盛放', '蝶恋花间'],
      colorScheme: ['大红牡丹', '翠绿枝叶', '金黄花蕊', '朱红锦鲤'],
      decorativePatterns: ['缠枝纹', '团花纹', '鱼鳞纹', '祥云纹'],
      shapeCharacteristics: '形象饱满，色彩浓烈，富有民间装饰美感'
    }
  },

  // 天津杨柳青
  'yangliuqing': {
    'menshen': {
      baseElements: ['秦琼', '尉迟恭', '将军门神', '武门神'],
      compositionTemplate: '左右对称布局，人物身材修长，姿态威武，背景精致细腻',
      figurePose: ['站式威武', '执锏举鞭', '甲胄精美', '目光炯炯', '气宇轩昂'],
      colorScheme: ['粉白肌肤', '大红袍服', '金黄铠甲', '翠绿披风', '宝蓝配饰'],
      decorativePatterns: ['龙纹', '凤纹', '祥云纹', '团花纹', '盘长纹'],
      shapeCharacteristics: '身段修长，面容秀美而不失威严，笔法细腻，富有北方年画的精美感'
    },
    'shoushou': {
      baseElements: ['福禄寿三星', '娃娃', '仕女', '吉祥人物'],
      compositionTemplate: '人物与环境融合，多人物组合，场景丰富，层次分明',
      figurePose: ['福星抱子', '禄星执杖', '寿星持桃', '和合二仙', '姿态优雅'],
      colorScheme: ['粉红仕女', '翠绿山水', '鹅黄服饰', '淡紫背景', '玫瑰重点'],
      decorativePatterns: ['花卉纹', '祥云纹', '缠枝纹', '蝠纹', '寿字纹'],
      shapeCharacteristics: '人物秀美细腻，肌肤圆润，服饰华丽，富有诗意和美感'
    },
    'caidan': {
      baseElements: ['文财神', '武财神', '招财童子', '利市仙官'],
      compositionTemplate: '财神为主角，身旁配以侍从和吉祥物，场景丰富，层次分明',
      figurePose: ['正坐太师椅', '手托元宝', '身旁立侍从', '环境雅致'],
      colorScheme: ['大红官服', '金色装饰', '粉白面容', '翠绿配景', '鹅黄点缀'],
      decorativePatterns: ['铜钱纹', '元宝纹', '祥云纹', '蝠纹', '盘长纹'],
      shapeCharacteristics: '形象秀美华丽，笔法细腻，富有杨柳青的精美雅致特点'
    },
    'guanyin': {
      baseElements: ['送子观音', '杨柳观音', '白衣观音', '千手观音'],
      compositionTemplate: '观音端坐或立于莲台，背景以山水云雾为主，画面精美如仕女图',
      figurePose: ['慈祥端坐', '手持杨枝净瓶', '送子姿态', '千手庄严', '身姿秀美'],
      colorScheme: ['素雅白衣', '粉红莲台', '淡青衣裙', '金色佛光', '翠绿云雾'],
      decorativePatterns: ['佛光纹', '莲瓣纹', '璎珞纹', '祥云纹', '缠枝纹'],
      shapeCharacteristics: '形象端庄秀美，面容圆润，笔法细腻，兼具佛相庄严与仕女秀美'
    },
    'wawa': {
      baseElements: ['胖娃娃', '莲笙贵子', '五子夺魁', '欢天喜地', '娃娃嬉戏'],
      compositionTemplate: '娃娃为主角，姿态活泼可爱，场景丰富生动，配以花卉莲鱼',
      figurePose: ['怀抱鲤鱼', '骑乘瑞兽', '手举莲花', '嬉戏玩耍', '憨态可掬'],
      colorScheme: ['粉嫩肤色', '粉红肚兜', '翠绿莲叶', '大红锦鲤', '鹅黄服饰'],
      decorativePatterns: ['莲瓣纹', '鱼鳞纹', '福字纹', '如意纹', '蝴蝶纹'],
      shapeCharacteristics: '娃娃圆润可爱，肌肤细腻，姿态生动，富有生活情趣'
    },
    'shinv': {
      baseElements: ['红楼梦仕女', '西厢记', '天仙配', '游园惊梦', '古装美人'],
      compositionTemplate: '仕女群像或独幅，姿态优雅，背景以亭台楼阁、山水花木为主',
      figurePose: ['执扇轻摇', '倚栏沉思', '拈花微笑', '漫步游春', '抚琴吟诗'],
      colorScheme: ['粉红罗裙', '淡紫披帛', '鹅黄面妆', '翠绿衣裙', '玫瑰点唇'],
      decorativePatterns: ['花卉纹', '祥云纹', '如意纹', '盘长纹', '缠枝纹'],
      shapeCharacteristics: '形象秀美婉约，身段修长，笔法细腻，富有文人画气息'
    },
    'opera': {
      baseElements: ['三英战吕布', '白蛇传', '穆桂英挂帅', '杨门女将', '红楼梦'],
      compositionTemplate: '戏剧化场景，多人物组合，服饰精美，背景精致，层次丰富',
      figurePose: ['戏曲亮相', '武打场面', '对唱姿态', '群戏场景', '人物特写'],
      colorScheme: ['戏服艳丽', '脸谱鲜明', '粉白面容', '大红点缀', '金色装饰'],
      decorativePatterns: ['龙凤纹', '祥云纹', '花卉纹', '团花纹', '盘长纹'],
      shapeCharacteristics: '人物秀美细腻，戏曲服饰华丽精美，场景丰富具有故事性'
    },
    'flower': {
      baseElements: ['牡丹', '玉兰', '海棠', '喜鹊', '蝴蝶', '仕女赏花'],
      compositionTemplate: '花卉与人物结合，仕女赏花为主，构图精美，层次丰富',
      figurePose: ['仕女赏花', '拈花微笑', '簪花弄姿', '蝶恋花间', '花间嬉戏'],
      colorScheme: ['粉红花卉', '翠绿枝叶', '仕女淡雅衣裙', '淡紫背景', '鹅黄点缀'],
      decorativePatterns: ['缠枝纹', '团花纹', '祥云纹', '蝶纹', '如意纹'],
      shapeCharacteristics: '画面精美细腻，色彩柔和淡雅，富有诗意和美感'
    }
  },

  // 苏州桃花坞
  'taohuawu': {
    'menshen': {
      baseElements: ['门神', '武将', '城隍庙门神', '将军'],
      compositionTemplate: '借鉴焦点透视，背景以江南水乡或城池建筑为主，具有城市年画特色',
      figurePose: ['站式威武', '身披铠甲', '执械怒目', '气势威严', '环境陪衬'],
      colorScheme: ['桃红为主', '蓝绿清雅', '金黄点缀', '月白背景', '淡紫渲染'],
      decorativePatterns: ['回纹', '万字纹', '冰裂纹', '网格纹', '几何纹'],
      shapeCharacteristics: '形象秀气文雅，线条细腻流畅，融合北方年画刚劲与南方文人画秀美'
    },
    'shoushou': {
      baseElements: ['福禄寿', '和合二仙', '读书仕子', '文人雅士'],
      compositionTemplate: '借鉴文人画构图，留白透气，画面清雅，诗书画结合',
      figurePose: ['读书姿态', '执笔挥毫', '品茶赏景', '雅集闲聊', '文人气度'],
      colorScheme: ['淡墨渲染', '桃红点缀', '蓝绿清雅', '金黄提亮', '月白背景'],
      decorativePatterns: ['水墨云纹', '山水纹', '诗文书卷纹', '梅兰竹菊纹'],
      shapeCharacteristics: '形象清秀文雅，线条流畅细腻，具有吴门画派的文人画气息'
    },
    'caidan': {
      baseElements: ['文财神', '利市仙官', '江南商人', '文人雅士'],
      compositionTemplate: '财神配以江南水乡背景，或商铺场景，文雅中见富贵',
      figurePose: ['正坐厅堂', '手持如意', '身着大褂', '配景雅致', '文人气质'],
      colorScheme: ['桃红喜庆', '蓝绿清雅', '金黄富贵', '淡紫雅致', '月白背景'],
      decorativePatterns: ['铜钱纹', '祥云纹', '水墨云纹', '如意纹', '回纹'],
      shapeCharacteristics: '形象文雅清秀，色彩清丽脱俗，具有江南商贾的文雅气质'
    },
    'guanyin': {
      baseElements: ['送子观音', '杨柳观音', '白衣观音', '水月观音'],
      compositionTemplate: '观音配以江南山水背景，莲台置于水月之间，清雅脱俗',
      figurePose: ['坐于莲台', '杨枝洒露', '水月倒映', '面容慈悲', '清雅端庄'],
      colorScheme: ['素雅白衣', '淡青衣裙', '月白背景', '桃红莲瓣', '蓝绿水波'],
      decorativePatterns: ['佛光纹', '莲瓣纹', '水波纹', '祥云纹', '璎珞纹'],
      shapeCharacteristics: '形象清秀端庄，线条细腻流畅，具有江南文人的清雅气质'
    },
    'wawa': {
      baseElements: ['江南娃娃', '采莲图', '嬉戏孩童', '节庆儿童'],
      compositionTemplate: '儿童配以江南水乡背景，采莲、游船、嬉戏等江南生活场景',
      figurePose: ['采莲嬉戏', '乘船游玩', '放风筝', '提灯观灯', '活泼可爱'],
      colorScheme: ['粉嫩肤色', '桃红衣衫', '翠绿莲叶', '蓝绿水波', '鹅黄点缀'],
      decorativePatterns: ['莲瓣纹', '鱼鳞纹', '水波纹', '如意纹', '福字纹'],
      shapeCharacteristics: '形象清秀可爱，身段灵动，富有江南水乡儿童的生活情趣'
    },
    'shinv': {
      baseElements: ['苏州仕女', '西厢记', '牡丹亭', '游园惊梦', '古装美人'],
      compositionTemplate: '借鉴吴门画派技法，仕女秀美婉约，背景以江南园林为主',
      figurePose: ['执扇半遮', '倚栏沉思', '拈花弄姿', '漫步园林', '抚琴吟诗'],
      colorScheme: ['粉紫罗裙', '桃红披帛', '淡青衣裙', '鹅黄面妆', '月白背景'],
      decorativePatterns: ['花卉纹', '祥云纹', '水墨山水纹', '如意纹', '盘长纹'],
      shapeCharacteristics: '形象秀美婉约，线条细腻流畅，笔法精妙，具有浓郁的文人画气息'
    },
    'opera': {
      baseElements: ['苏州戏曲', '昆曲人物', '评弹故事', '江南戏曲'],
      compositionTemplate: '戏曲人物配以江南园林背景，场景精美，借鉴焦点透视',
      figurePose: ['昆曲身段', '水袖舞动', '折扇轻摇', '戏曲亮相', '姿态优雅'],
      colorScheme: ['戏服艳丽清雅', '桃红粉紫', '蓝绿点缀', '金黄提亮', '月白背景'],
      decorativePatterns: ['团花纹', '祥云纹', '花卉纹', '水墨纹', '盘长纹'],
      shapeCharacteristics: '人物秀美优雅，线条细腻流畅，色彩清丽脱俗，具有江南戏曲的婉约之美'
    },
    'flower': {
      baseElements: ['玉兰', '桃花', '荷花', '梅花', '苏州园林花卉'],
      compositionTemplate: '借鉴文人画技法，花卉清雅脱俗，配以江南山水或园林背景',
      figurePose: ['花卉特写', '折枝花卉', '盆景摆设', '花鸟组合', '清雅意境'],
      colorScheme: ['桃红花瓣', '粉白如玉', '翠绿枝叶', '淡紫渲染', '月白背景'],
      decorativePatterns: ['水墨云纹', '山水纹', '缠枝纹', '冰裂纹', '网格纹'],
      shapeCharacteristics: '画面清雅细腻，色彩淡丽脱俗，具有吴门画派的文人画意境'
    }
  },

  // 山东杨家埠
  'yangjiabu': {
    'menshen': {
      baseElements: ['秦琼', '尉迟恭', '大门神', '房门神', '武门神'],
      compositionTemplate: '人物饱满紧凑，装饰繁复，对比强烈，富有民间喜庆气氛',
      figurePose: ['正面站立', '执锏举鞭', '怒目圆睁', '甲胄华丽', '气势逼人'],
      colorScheme: ['大红为主', '金黄装饰', '翠绿点缀', '品蓝对比', '黑线勾勒'],
      decorativePatterns: ['龙凤纹', '祥云纹', '万字纹', '回纹', '铜钱纹'],
      shapeCharacteristics: '形象夸张浪漫，造型生动活泼，色彩对比强烈，富有农民画的活力'
    },
    'shoushou': {
      baseElements: ['福禄寿', '摇钱树', '聚宝盆', '莲年有鱼', '喜庆人物'],
      compositionTemplate: '画面饱满繁密，装饰华丽，对比强烈，追求大红大绿的喜庆效果',
      figurePose: ['饱满造型', '姿态夸张', '手执吉祥物', '笑容满面', '热闹喜庆'],
      colorScheme: ['大红喜庆', '金黄富贵', '翠绿生机', '品蓝对比', '黑线勾勒'],
      decorativePatterns: ['福字纹', '寿字纹', '铜钱纹', '如意纹', '万字纹'],
      shapeCharacteristics: '形象夸张变形，色彩浓烈，对比强烈，富有北方农民的浪漫情怀'
    },
    'caidan': {
      baseElements: ['武财神', '文财神', '招财进宝', '赵公明', '利市仙官'],
      compositionTemplate: '财神形象饱满，装饰华丽，周围配以元宝铜钱聚宝盆等吉祥物',
      figurePose: ['正襟危坐', '手托元宝', '气势威严', '满堂富贵', '热闹喜庆'],
      colorScheme: ['大红官服', '金黄铠甲', '翠绿点缀', '品蓝对比', '黑线勾勒'],
      decorativePatterns: ['铜钱纹', '元宝纹', '龙纹', '祥云纹', '万字纹'],
      shapeCharacteristics: '形象威严华丽，色彩浓烈，装饰繁复，富有北方年画的喜庆气氛'
    },
    'guanyin': {
      baseElements: ['送子观音', '杨柳观音', '观音菩萨', '佛祖'],
      compositionTemplate: '观音形象饱满端庄，周围配以祥云莲花，佛光普照',
      figurePose: ['端坐莲台', '杨枝洒露', '送子姿态', '慈悲庄严', '神韵生动'],
      colorScheme: ['素雅白衣', '金黄佛光', '大红莲台', '翠绿祥云', '品蓝点缀'],
      decorativePatterns: ['佛光纹', '莲瓣纹', '祥云纹', '璎珞纹', '万字纹'],
      shapeCharacteristics: '形象端庄饱满，造型夸张浪漫，兼具北方年画的粗犷与喜庆'
    },
    'wawa': {
      baseElements: ['胖娃娃', '莲年有鱼', '五子夺魁', '金玉满堂', '麒麟送子'],
      compositionTemplate: '娃娃圆润可爱，画面饱满热闹，配以莲鱼花卉等吉祥图案',
      figurePose: ['怀抱鲤鱼', '骑乘麒麟', '手举莲花', '憨态可掬', '活泼可爱'],
      colorScheme: ['粉红肤色', '大红肚兜', '金黄服饰', '翠绿莲叶', '品蓝点缀'],
      decorativePatterns: ['莲瓣纹', '鱼鳞纹', '福字纹', '如意纹', '铜钱纹'],
      shapeCharacteristics: '娃娃圆润饱满，形象夸张可爱，富有北方农民的浪漫情怀'
    },
    'shinv': {
      baseElements: ['戏曲仕女', '红楼梦', '水浒女杰', '古装美人'],
      compositionTemplate: '仕女形象饱满，服饰华丽，色彩艳丽，富有北方年画的热闹气氛',
      figurePose: ['戏曲身段', '执扇姿态', '华服盛装', '喜庆热闹', '动态优美'],
      colorScheme: ['大红衣裙', '金黄配饰', '翠绿披帛', '粉紫点缀', '品蓝对比'],
      decorativePatterns: ['龙凤纹', '花卉纹', '祥云纹', '如意纹', '万字纹'],
      shapeCharacteristics: '形象饱满华丽，色彩艳丽热烈，富有北方年画的喜庆与活力'
    },
    'opera': {
      baseElements: ['水浒传', '三国演义', '杨家将', '西游记', '戏曲人物'],
      compositionTemplate: '戏曲场面热闹，人物众多，服饰华丽，色彩艳丽，对比强烈',
      figurePose: ['武打场面', '对阵交锋', '戏曲亮相', '群戏场景', '动态优美'],
      colorScheme: ['大红戏服', '金黄装饰', '翠绿点缀', '品蓝对比', '黑线勾勒'],
      decorativePatterns: ['龙凤纹', '祥云纹', '花卉纹', '铜钱纹', '万字纹'],
      shapeCharacteristics: '场面热闹喜庆，人物形象夸张，色彩对比强烈，富有民间艺术活力'
    },
    'flower': {
      baseElements: ['牡丹', '鲤鱼', '荷花', '喜鹊', '凤凰', '雄鸡'],
      compositionTemplate: '画面饱满繁密，装饰华丽，对比强烈，追求大红大绿的喜庆效果',
      figurePose: ['花开富贵', '鱼戏莲叶', '喜鹊登枝', '凤穿牡丹', '生机盎然'],
      colorScheme: ['大红花卉', '金黄花蕊', '翠绿枝叶', '品蓝水波', '黑线勾勒'],
      decorativePatterns: ['缠枝纹', '团花纹', '鱼鳞纹', '如意纹', '万字纹'],
      shapeCharacteristics: '形象饱满生动，色彩艳丽热烈，对比强烈，富有民间装饰美感'
    }
  },

  // 四川绵竹
  'mianzhu': {
    'menshen': {
      baseElements: ['门神', '武将', '将军', '镇宅辟邪'],
      compositionTemplate: '人物生动传神，疏密有致，兼具北方粗犷与南方秀美',
      figurePose: ['站式威武', '执械姿态', '怒目圆睁', '气势威严', '神韵兼备'],
      colorScheme: ['朱红为主', '槐黄点缀', '品绿装饰', '丹紫渲染', '银朱提亮'],
      decorativePatterns: ['回纹', '万字纹', '云纹', '龙纹', '铜钱纹'],
      shapeCharacteristics: '形象生动传神，线条流畅优美，粗细结合，富有蜀中灵气'
    },
    'shoushou': {
      baseElements: ['福禄寿', '和合二仙', '麻姑献寿', '吉祥人物'],
      compositionTemplate: '主次分明，疏密有致，神韵为上，具有蜀中风情',
      figurePose: ['慈祥和蔼', '手执吉祥', '姿态优雅', '神韵兼备', '喜庆热闹'],
      colorScheme: ['朱红喜庆', '槐黄尊贵', '品绿生机', '丹紫雅致', '银朱点缀'],
      decorativePatterns: ['寿字纹', '蝠纹', '祥云纹', '如意纹', '回纹'],
      shapeCharacteristics: '形象生动传神，线条流畅，色彩明快，富有蜀中风情'
    },
    'caidan': {
      baseElements: ['财神', '利市仙官', '招财进宝', '武财神'],
      compositionTemplate: '财神威严庄重，疏密有致，色彩明快，富有蜀中豪气',
      figurePose: ['正襟危坐', '手托元宝', '威严庄重', '气势非凡', '富贵满堂'],
      colorScheme: ['朱红官服', '金黄配饰', '品绿点缀', '丹紫渲染', '银朱提亮'],
      decorativePatterns: ['铜钱纹', '元宝纹', '祥云纹', '龙纹', '回纹'],
      shapeCharacteristics: '形象威严庄重，线条流畅，色彩明快，富有蜀中豪迈气质'
    },
    'guanyin': {
      baseElements: ['送子观音', '杨柳观音', '千手观音', '观音菩萨'],
      compositionTemplate: '观音端庄慈悲，疏密有致，神韵兼备，具有南北融合的特点',
      figurePose: ['端坐莲台', '杨枝洒露', '送子慈悲', '千手庄严', '神韵兼备'],
      colorScheme: ['素雅白衣', '朱红莲台', '品绿衣裙', '金黄佛光', '丹紫点缀'],
      decorativePatterns: ['佛光纹', '莲瓣纹', '祥云纹', '璎珞纹', '如意纹'],
      shapeCharacteristics: '形象端庄传神，线条流畅优美，兼具北方的粗犷与南方的秀美'
    },
    'wawa': {
      baseElements: ['胖娃娃', '莲年有鱼', '儿童嬉戏', '麒麟送子'],
      compositionTemplate: '娃娃生动可爱，神韵兼备，疏密有致，富有蜀中灵气',
      figurePose: ['活泼可爱', '怀抱鲤鱼', '嬉戏玩耍', '憨态可掬', '生动传神'],
      colorScheme: ['粉嫩肤色', '朱红肚兜', '品绿莲叶', '槐黄服饰', '丹紫点缀'],
      decorativePatterns: ['莲瓣纹', '鱼鳞纹', '福字纹', '如意纹', '祥云纹'],
      shapeCharacteristics: '娃娃生动可爱，形象传神，线条流畅，富有蜀中儿童的生活情趣'
    },
    'shinv': {
      baseElements: ['仕女', '戏曲人物', '古装美人', '绵竹仕女'],
      compositionTemplate: '仕女秀美灵动，疏密有致，具有蜀中风情的婉约与豪放',
      figurePose: ['姿态优雅', '执扇轻摇', '拈花弄姿', '衣裙飘动', '神韵兼备'],
      colorScheme: ['粉紫罗裙', '朱红点缀', '品绿披帛', '槐黄面妆', '丹紫渲染'],
      decorativePatterns: ['花卉纹', '祥云纹', '如意纹', '盘长纹', '回纹'],
      shapeCharacteristics: '形象秀美灵动，线条流畅，色彩明快，富有蜀中的灵气'
    },
    'opera': {
      baseElements: ['川剧人物', '变脸', '戏曲故事', '民间传说'],
      compositionTemplate: '戏曲场面生动，人物传神，疏密有致，富有川剧特色',
      figurePose: ['川剧身段', '变脸姿态', '武打场面', '戏曲亮相', '神韵兼备'],
      colorScheme: ['川剧艳丽色彩', '朱红为主', '品绿点缀', '丹紫渲染', '银朱提亮'],
      decorativePatterns: ['川剧脸谱纹', '祥云纹', '龙凤纹', '如意纹', '回纹'],
      shapeCharacteristics: '人物生动传神，线条流畅优美，富有川剧的灵动与特色'
    },
    'flower': {
      baseElements: ['牡丹', '竹', '梅花', '鲤鱼', '蜀中花卉'],
      compositionTemplate: '花卉生动活泼，疏密有致，具有蜀中风情的自然之美',
      figurePose: ['花开富贵', '竹报平安', '喜鹊登梅', '鱼戏莲叶', '生机盎然'],
      colorScheme: ['朱红花卉', '品绿竹叶', '槐黄点缀', '丹紫渲染', '银朱提亮'],
      decorativePatterns: ['缠枝纹', '竹节纹', '莲瓣纹', '如意纹', '祥云纹'],
      shapeCharacteristics: '花卉生动传神，线条流畅优美，色彩明快，富有蜀中的自然灵气'
    }
  }
};

// 获取流派信息
export function getStyleById(id: string): AnnualPaintingStyle | undefined {
  return annualPaintingStyles.find(style => style.id === id);
}

// 获取主题信息
export function getThemeById(id: string): typeof annualPaintingThemes[0] | undefined {
  return annualPaintingThemes.find(theme => theme.id === id);
}

// 获取流派-主题绑定的标准素材
export function getStyleThemeMaterial(styleId: string, themeId: string): {
  baseElements: string[];
  compositionTemplate: string;
  figurePose: string[];
  colorScheme: string[];
  decorativePatterns: string[];
  shapeCharacteristics: string;
} | undefined {
  return themeMaterialLibrary[styleId]?.[themeId];
}

// 生成增强版年画 Prompt（使用标准素材库）
export function generateEnhancedPrompt(
  style: AnnualPaintingStyle,
  theme: { id: string; name: string; elements: string[] },
  specificElement?: string,
  additionalPatterns?: string,
  additionalColors?: string
): string {
  // 判断是否为自定义主题
  const isCustomTheme = theme.id === 'custom';
  
  if (isCustomTheme) {
    // 自定义主题：以流派风格为基底进行适配生成
    const userTheme = theme.name;
    const userElements = theme.elements.join('、');
    
    return `【${style.name}年画·自定义主题：${userTheme}】作品。
严格遵循${style.name}年画的传统风格框架进行创作：
【主题】${userTheme}
【构图】${style.compositionRules?.[0] || '画面饱满，层次分明，主次分明'}
【色彩】以${style.colors.join('、')}为主色调${additionalColors ? `，使用${additionalColors}` : ''}
【装饰】采用${style.features[0] || '传统吉祥纹样'}${additionalPatterns ? `，融入${additionalPatterns}` : ''}
【造型】${style.artisticFeatures}
【内容】表现${userElements || userTheme}${specificElement ? `，可融入${specificElement}` : ''}的吉祥寓意
【规范】必须使用${style.name}年画的传统线稿、配色和构图技法
【风格】${style.artisticFeatures}，${style.region}木版年画特色
【品质】传统木版年画风格，雕版印刷质感，手工上色效果，高清细腻，专业品质`;
  }
  
  // 固定主题：使用标准素材库
  // 获取流派-主题绑定的标准素材
  const material = getStyleThemeMaterial(style.id, theme.id);
  
  // 基础元素组合
  const baseElements = material?.baseElements || theme.elements;
  const compositionTemplate = material?.compositionTemplate || '画面饱满，层次分明';
  const figurePoses = material?.figurePose?.slice(0, 3).join('、') || '';
  const colorScheme = material?.colorScheme?.join('、') || style.colors.join('、');
  const decorativePatterns = material?.decorativePatterns?.join('、') || '';
  const shapeCharacteristics = material?.shapeCharacteristics || style.artisticFeatures;

  // 用户输入的具体元素
  const userElements = specificElement ? `，可融入${specificElement}` : '';

  // 用户选择的额外纹样
  const userPatterns = additionalPatterns ? `，融入${additionalPatterns}` : '';

  // 用户选择的额外色彩
  const userColors = additionalColors ? `，使用${additionalColors}` : '';

  // 综合生成专业 Prompt
  return `【${style.name}年画·${theme.name}】标准题材作品。
严格遵循${style.name}年画的${theme.name}题材标准框架：
【构图】${compositionTemplate}
【人物姿态】${figurePoses}
【色彩】以${colorScheme}为主色调${userColors}
【装饰】采用${decorativePatterns}等传统纹样${userPatterns}
【造型】${shapeCharacteristics}
【内容】表现${baseElements.join('、')}${userElements}的吉祥寓意
【规范】必须使用${style.name}年画的传统线稿、配色和构图，禁止引入其他主题素材
【风格】${style.artisticFeatures}
【品质】传统木版年画风格，雕版印刷质感，手工上色效果，高清细腻，专业品质`;
}

// 生成双重校验 Prompt
export function generateValidationPrompts(
  style: AnnualPaintingStyle,
  theme: { id: string; name: string; elements: string[] },
  generatedImageUrl: string
): { themeValidation: string; styleValidation: string } {
  // 判断是否为自定义主题
  const isCustomTheme = theme.id === 'custom';
  
  // 第一关：主题元素校验
  let themeValidation: string;
  if (isCustomTheme) {
    // 自定义主题：校验是否包含用户描述的核心元素
    themeValidation = `请仔细分析这张年画图像，识别其中的核心元素。

这是一张${style.name}年画，用户自定义主题为："${theme.name}"

需要校验的内容：
1. 图像中是否包含主题"${theme.name}"所描述的核心元素
2. 核心人物/主体是否与用户自定义主题相符
3. 是否有明显偏离用户主题的元素
4. 整体构图是否合理协调

请返回JSON格式的校验结果：
{
  "passed": true/false,
  "matchedElements": ["匹配到的元素"],
  "missingElements": ["缺失的元素"],
  "deviationElements": ["偏离的元素"],
  "suggestion": "改进建议（如果未通过）"
}`;
  } else {
    // 固定主题：严格校验标准元素
    themeValidation = `请仔细分析这张年画图像，识别其中的核心元素。

需要校验的内容：
1. 图像中是否包含以下主题元素：${theme.elements.join('、')}
2. 核心人物/主体是否与"${theme.name}"主题相符
3. 是否有偏离主题的无关元素

请返回JSON格式的校验结果：
{
  "passed": true/false,
  "matchedElements": ["匹配到的元素"],
  "missingElements": ["缺失的元素"],
  "deviationElements": ["偏离的元素"],
  "suggestion": "改进建议（如果未通过）"
}`;
  }

  // 第二关：流派形制校验（固定）
  const styleValidation = `请仔细分析这张年画图像，评估其是否符合${style.name}年画的木版年画形制规范。

${style.name}年画的特征：
- 艺术风格：${style.artisticFeatures}
- 造型特征：${style.figureStyles?.join('、') || style.features.join('、')}
- 构图规范：${style.compositionRules?.join('、') || style.features.join('、')}
- 色彩特点：${style.colors.join('、')}
- 地域特色：${style.region}

需要校验的内容：
1. 人物造型是否符合${style.name}的${style.figureStyles?.[0] || '特征'}
2. 色彩搭配是否使用${style.name}的典型配色
3. 构图是否遵循${style.name}的${style.compositionRules?.[0] || '风格'}
4. 整体风格是否具有${style.name}的${style.features[0]}

请返回JSON格式的校验结果：
{
  "passed": true/false,
  "styleMatchScore": 0-100,
  "matchedFeatures": ["匹配的形制特征"],
  "deviationFeatures": ["偏离的形制特征"],
  "suggestion": "改进建议（如果未通过）"
}`;

  return { themeValidation, styleValidation };
}
