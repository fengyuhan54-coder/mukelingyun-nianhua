/**
 * 木版年画数字化知识库 - 朱仙镇纹样数据
 * 整合了开封朱仙镇木版年画的三大核心分类：
 * 1. 人物服饰纹 - 包含衣物纹样、头饰纹样等
 * 2. 吉祥瑞兽纹 - 包含各类瑞兽、动物纹样
 * 3. 装饰底纹 - 包含背景垫花纹、植物纹、器物纹等
 */

// ==================== 类型定义 ====================
export interface PatternItem {
  id: string;
  name: string;
  // symbol 字段已废弃，图片渲染由 pattern-assets-map.ts 素材映射决定
  // 匹配到素材显示素材图片，未匹配显示占位图
  symbol?: string | null;
  meaning: string;
  example?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
}

export interface PatternCategory {
  id: string;
  name: string;
  description: string;
  subcategories: PatternSubcategory[];
}

export interface PatternSubcategory {
  id: string;
  name: string;
  patterns: PatternItem[];
}

// ==================== 人物服饰纹 ====================
export const PERSONNEL_COSTUME_PATTERNS = {
  id: 'personnel-costume',
  name: '人物服饰纹',
  description: '传统木版年画中人物服饰上的装饰纹样，体现工匠对衣物细节的精妙刻画',
  subcategories: [
    {
      id: 'clothing',
      name: '衣物纹样',
      patterns: [
        { id: 'jihe', name: '几何纹', symbol: 'jihe', meaning: '规整的几何色块线条构成，简洁大方', example: '以规整的几何色块、线条构成，色彩搭配鲜明，横向分层斜向交叉排列' },
        { id: 'longlin', name: '龙鳞纹', symbol: 'longlin', meaning: '模仿龙鳞的排列形态，层叠的鱼鳞状纹样', example: '层叠的梯形鳞片，黄绿配色，有规律的排列感' },
        { id: 'shui', name: '水纹', symbol: 'shui', meaning: '用折线、色块模拟水流形态', example: '折线弧形组合模拟水波，黄橙与深色搭配，体现水的流动感' },
        { id: 'yun', name: '云纹', symbol: 'yun', meaning: '以交错的曲线、色块构成，呈现云朵飘逸感', example: '卷曲回纹+对称弧形云头，深绿底配红黄撞色' },
        { id: 'yu', name: '鱼纹', symbol: 'yu', meaning: '将鱼的形态提炼为服饰纹样，寓意富足', example: '黄深色搭配，呈现鱼的轮廓纹理，鳍部朱红点缀' },
        { id: 'ding', name: '丁字纹', symbol: 'ding', meaning: '以类似"丁"字的重复几何图案构成', example: '紫黄搭配，规整且富有秩序感' },
        { id: 'sanjiao', name: '三角纹', symbol: 'sanjiao', meaning: '由密集的三角形纹样构成，呈网状排列', example: '密集的三角形纹样构成，呈网状排列，深绿底米白纹' },
        { id: 'dian', name: '点状纹', symbol: 'dian', meaning: '以密集的点状元素排列在服饰区域', example: '朱红底色，黄色圆点，形成错落的肌理感' },
        { id: 'shuibo', name: '水波纹', symbol: 'shuibo', meaning: '用平行的彩色线条模拟水波', example: '平行的彩色波浪线条，色彩丰富，线条流畅' },
        { id: 'tuanhua', name: '团花纹', symbol: 'tuanhua', meaning: '以圆形为基础，内部搭配线条与符号', example: '多层回旋的圆形纹样，米白底色金红点缀' },
        { id: 'hui', name: '回纹', symbol: 'hui', meaning: '以连续回旋的线条构成', example: '绿红紫搭配，线条规整，寓意连绵不断' },
      ]
    },
    {
      id: 'headwear',
      name: '头饰纹样',
      patterns: [
        // 男子头饰
        { id: 'caomao', name: '草帽', symbol: 'jihe', meaning: '男子草帽，质朴造型', example: '黄褐配色，椭圆形质朴造型，下沿金色边缘' },
        { id: 'huangmao', name: '皇帽', symbol: 'qilin', meaning: '华丽威严的皇帝头饰', example: '绿金配色，多层结构，华丽威严' },
        { id: 'fangchimao', name: '方翅纱帽', symbol: 'shoutao', meaning: '官员样式头饰', example: '墨黑底金黄装饰，方正造型' },
        { id: 'zijinkui', name: '紫金盔', symbol: 'qilin', meaning: '武将样式的头盔', example: '绿金配色，多层结构，武将样式' },
        { id: 'hualuomao', name: '花罗帽', symbol: 'shoutao', meaning: '装饰华丽的帽子', example: '金黄配色，圆顶装饰华丽' },
        { id: 'ruanluomao', name: '软罗帽', symbol: 'shoutao', meaning: '轻便造型的帽子', example: '墨黑配色，柔质圆顶' },
        // 女子头饰
        { id: 'cuiyehonghua', name: '翠叶红花', symbol: 'hehua', meaning: '女子清新雅致头饰', example: '绿红配色，花叶组合，清新雅致' },
        { id: 'zhuhuarongqiu', name: '珠花绒球', symbol: 'tuanhua', meaning: '华丽繁复的女子头饰', example: '多彩配色，圆形绒球装饰' },
        { id: 'banfenguan', name: '半凤冠', symbol: 'feng', meaning: '端庄华贵的女子头饰', example: '红金配色，凤鸟装饰，端庄华贵' },
        { id: 'honghua', name: '红花', symbol: 'hehua', meaning: '简洁艳丽的女子头饰', example: '红黑配色，简洁花朵造型' },
        // 孩童头饰
        { id: 'panfa', name: '盘发', symbol: 'hehua', meaning: '孩童发髻样式', example: '黑绿配色，圆形发髻' },
        { id: 'danfaji', name: '单发髻', symbol: 'hehua', meaning: '单髻孩童头饰', example: '黑绿配色，单髻造型' },
        { id: 'shuangfaji', name: '双发髻', symbol: 'juhua', meaning: '双髻孩童头饰', example: '黑棕配色，双髻金饰' },
      ]
    },
    {
      id: 'opera',
      name: '戏装纹样',
      patterns: [
        { id: 'dahuamianpu', name: '大花脸谱', symbol: 'hu', meaning: '夸张的色彩、线条勾勒面部图案', example: '浓烈对比鲜明的脸谱，朱红白粉彩绘' },
        { id: 'lingzizhuang', name: '翎子戏装', symbol: 'feng', meaning: '头插翎子的戏装造型', example: '翎羽装饰，华丽戏装造型' },
        { id: 'shengjue', name: '生角纹样', symbol: 'shoutao', meaning: '戏曲生角服饰纹样', example: '生角服饰纹样，儒雅飘逸' },
        { id: 'danmianpu', name: '旦角面妆', symbol: 'tuanhua', meaning: '戏曲旦角面部纹样', example: '旦角面妆纹样，柔美细腻' },
      ]
    }
  ]
};

// ==================== 吉祥瑞兽纹 ====================
export const AUSPICIOUS_BEAST_PATTERNS = {
  id: 'auspicious-beast',
  name: '吉祥瑞兽纹',
  description: '传统木版年画中的瑞兽与动物纹样，寓意吉祥如意、福寿安康',
  subcategories: [
    {
      id: 'four-sacred',
      name: '四灵神兽',
      patterns: [
        { id: 'long', name: '龙纹', symbol: 'long', meaning: '尊贵、权威、祥瑞的象征', example: '矫健威严，龙身蜿蜒，黄黑配色' },
        { id: 'feng', name: '凤凰纹', symbol: 'feng', meaning: '百鸟之王，祥瑞之兆', example: '色彩丰富华丽，羽毛飘逸，尾羽舒展' },
        { id: 'qilin', name: '麒麟纹', symbol: 'qilin', meaning: '吉祥如意、送子神兽', example: '兼具龙与兽的特征，黄绿配色，造型生动' },
        { id: 'xuanwu', name: '玄武纹', symbol: 'qilin', meaning: '北方之神，代表长寿', example: '龟蛇合体造型，黄绿配色' },
      ]
    },
    {
      id: 'mammals',
      name: '走兽纹样',
      patterns: [
        { id: 'ma-anjiaoma', name: '鞍马纹', symbol: 'ma', meaning: '马到成功，矫健有力', example: '红绿配色的矫健鞍马，四肢抬起' },
        { id: 'ma-huanghei', name: '骏马纹', symbol: 'ma', meaning: '黄黑配色，动态感强', example: '黄黑配色，奔跑姿态，搭配人物' },
        { id: 'lv', name: '驴纹', symbol: 'hudie', meaning: '质朴务实，民间常见', example: '黑棕配色，造型写实中带有夸张' },
        { id: 'hu-zhangbi', name: '虎纹（张臂）', symbol: 'hu', meaning: '张开双臂的拟人化老虎', example: '红棕为主色彩，张臂拟人化造型' },
        { id: 'hu-quanwo', name: '虎纹（蜷卧）', symbol: 'hu', meaning: '蜷卧的老虎，纹理清晰', example: '黄黑配色，蜷卧姿态，虎斑清晰' },
        { id: 'niu', name: '牛纹', symbol: 'ma', meaning: '勤恳、富足的象征', example: '黄黑配色，造型健壮有力' },
        { id: 'yang', name: '羊纹', symbol: 'shoutao', meaning: '吉祥如意，三阳开泰', example: '米白底色，温顺造型' },
        { id: 'lu', name: '鹿纹', symbol: 'qilin', meaning: '福禄寿喜，俸禄象征', example: '黄棕配色，体态优雅' },
        { id: 'bao', name: '豹纹', symbol: 'hu', meaning: '矫健敏捷，英勇威猛', example: '黄底黑斑纹，色彩鲜明' },
      ]
    },
    {
      id: 'birds',
      name: '飞禽纹样',
      patterns: [
        { id: 'hudie-caiyi', name: '彩翼蝴蝶', symbol: 'hudie', meaning: '美好自由，"福迭"谐音吉祥', example: '色彩丰富的彩翼造型，绿白棕三色拼接' },
        { id: 'hudie-xieshi', name: '写实蝴蝶', symbol: 'hudie', meaning: '形态写实，寓意美好', example: '深色系，形态逼真优美' },
        { id: 'zuque', name: '朱雀纹', symbol: 'feng', meaning: '南方之神，祥瑞之兆', example: '造型华丽，色彩鲜明，黄红配色' },
        { id: 'baihe', name: '仙鹤纹', symbol: 'niao', meaning: '延年益寿，君子风骨', example: '体态优雅舒展，黄红配色' },
        { id: 'yingwu', name: '鹦鹉纹', symbol: 'niao', meaning: '聪明伶俐，吉祥如意', example: '色彩艳丽，黄绿配色，造型生动' },
        { id: 'lu', name: '鹭鸶纹', symbol: 'niao', meaning: '一路连科，仕途顺遂', example: '体态优美，黄绿配色' },
      ]
    },
    {
      id: 'aquatic',
      name: '水族纹样',
      patterns: [
        { id: 'yu-hongjin', name: '鲤鱼纹', symbol: 'yu', meaning: '年年有余，富足有余', example: '红金配色，造型饱满圆润' },
        { id: 'yu-huangqing', name: '鳜鱼纹', symbol: 'yu', meaning: '富贵有余，吉祥美好', example: '黄绿配色，形态优美' },
        { id: 'longliyu', name: '龙鳞鱼纹', symbol: 'yu', meaning: '鱼跃龙门，学业有成', example: '龙鳞纹理，鱼形姿态' },
        { id: 'liaoyu', name: '鲳鱼纹', symbol: 'yu', meaning: '生活富足，吉祥如意', example: '造型圆润，黄绿配色' },
      ]
    },
    {
      id: 'mythical',
      name: '神话瑞兽',
      patterns: [
        { id: 'jinchan', name: '金蟾纹', symbol: 'shoutao', meaning: '招财进宝，财源广进', example: '绿黄配色，造型生动，寓意财源广进' },
        { id: 'zhulong', name: '烛龙纹', symbol: 'long', meaning: '掌管光明，驱散黑暗', example: '龙形火焰造型，神秘威严，黄黑配色' },
        { id: 'taotie', name: '饕餮纹', symbol: 'hu', meaning: '驱邪避害，镇守平安', example: '神秘威严的兽面纹样，黄黑配色' },
        { id: 'taishi', name: '獬豸纹', symbol: 'qilin', meaning: '正义公平，辨是非曲直', example: '独角造型，威严正义，黄绿配色' },
      ]
    },
    {
      id: 'insects',
      name: '虫蝶纹样',
      patterns: [
        { id: 'qicao', name: '蜻蜓纹', symbol: 'hudie', meaning: '亭亭玉立，轻盈美好', example: '翅膀轻盈，姿态优雅，黄绿配色' },
        { id: 'mayi', name: '蚂蚁纹', symbol: 'caohua', meaning: '勤劳团结，勤奋努力', example: '体型虽小，寓意深刻，黄绿配色' },
        { id: 'xuanwu', name: '蝙蝠纹', symbol: 'bianfu', meaning: '"遍福"谐音，福气满盈', example: '有抽象化曲线造型（绿黑）和写实形态（红黑）两种' },
      ]
    }
  ]
};

// ==================== 装饰底纹 ====================
export const DECORATIVE_PATTERN_PATTERNS = {
  id: 'decorative-pattern',
  name: '装饰底纹',
  description: '传统木版年画中的背景装饰纹样，包括器物纹、植物纹和几何纹等',
  subcategories: [
    {
      id: 'auspicious-ornaments',
      name: '吉祥器物',
      patterns: [
        { id: 'ruyi-hong', name: '如意纹（红棕）', symbol: 'ruyi', meaning: '吉祥如意，顺心顺意', example: '弯曲造型搭配飘带，红棕色' },
        { id: 'ruyi-huanglu', name: '如意纹（黄绿）', symbol: 'ruyi', meaning: '吉祥如意，心想事成', example: '弯曲造型搭配飘带，黄绿色' },
        { id: 'yinbao', name: '银宝纹', symbol: 'ruyi', meaning: '富足有余，财宝满盈', example: '传统银锭造型搭配飘带，黑红色' },
        { id: 'xijiao-huang', name: '犀角纹（黑黄）', symbol: 'ruyi', meaning: '辟邪祈福，吉祥安康', example: '弯曲造型，黑黄色搭配' },
        { id: 'xijiao-zong', name: '犀角纹（棕红）', symbol: 'ruyi', meaning: '辟邪祈福，护佑平安', example: '弯曲造型，棕红色搭配' },
        { id: 'jianqian', name: '金钱纹', symbol: 'ruyi', meaning: '招财进宝，财源广进', example: '圆形方孔钱造型，红黑色' },
        { id: 'shuce', name: '书册纹', symbol: 'ruyi', meaning: '学识文雅，诗书传家', example: '展开的书册造型搭配飘带，红绿色' },
        { id: 'baoping', name: '宝瓶纹', symbol: 'caohua', meaning: '平安吉祥，护佑健康', example: '花瓶搭配花卉，红黄色' },
        { id: 'jubaopen', name: '聚宝盆纹', symbol: 'caohua', meaning: '汇聚财富，财源滚滚', example: '装满宝物的盆器，色彩丰富' },
      ]
    },
    {
      id: 'vehicles',
      name: '交通器物',
      patterns: [
        { id: 'che', name: '车马纹', symbol: 'caohua', meaning: '出行顺遂，马到成功', example: '传统样式车辆，色彩丰富' },
        { id: 'luochuan', name: '骆驼纹', symbol: 'ma', meaning: '丝绸之路，商贸繁荣', example: '造型高大，寓意通商，黄绿配色' },
        { id: 'chuanbo', name: '船舶纹', symbol: 'ma', meaning: '一帆风顺，航行平安', example: '传统帆船造型，黄绿配色' },
      ]
    },
    {
      id: 'weapons',
      name: '兵器仪仗',
      patterns: [
        { id: 'yaoqianshu', name: '摇钱树纹', symbol: 'caohua', meaning: '招财进宝，财富常在', example: '带人物的摇钱树造型，红绿色' },
        { id: 'bian', name: '长鞭纹', symbol: 'shoutao', meaning: '驱邪勇武，正义凛然', example: '传统长鞭造型，红紫色' },
        { id: 'jian', name: '宝剑纹', symbol: 'shoutao', meaning: '辟邪正义，镇宅护身', example: '传统宝剑造型，红紫色' },
        { id: 'guandan', name: '官帽纹', symbol: 'shoutao', meaning: '加官进爵，仕途顺遂', example: '官员帽子造型，寓意升迁' },
      ]
    },
    {
      id: 'festival',
      name: '节庆器物',
      patterns: [
        { id: 'denglong', name: '灯笼纹', symbol: 'caohua', meaning: '喜庆光明，前程似锦', example: '传统灯笼造型，红黄色' },
        { id: 'baoxiang', name: '宝匣纹', symbol: 'caohua', meaning: '珍贵宝物，收藏保佑', example: '装饰精美的匣子造型，黄绿配色' },
        { id: 'baojuan', name: '宝卷纹', symbol: 'ruyi', meaning: '经文宝卷，智慧传承', example: '卷轴造型，寓意学问，黄绿配色' },
      ]
    },
    {
      id: 'plants',
      name: '植物纹样',
      patterns: [
        // 花卉类
        { id: 'hehua-shjing', name: '荷花纹（带茎）', symbol: 'hehua', meaning: '清廉高洁，和合美满', example: '带茎叶的荷花，红绿色' },
        { id: 'hehua-dandu', name: '荷花纹（单朵）', symbol: 'hehua', meaning: '纯洁高雅，吉祥美好', example: '单独的荷花造型，黄红色' },
        { id: 'mutan', name: '牡丹纹', symbol: 'hehua', meaning: '富贵荣华，繁荣昌盛', example: '花朵饱满，红紫色彩' },
        { id: 'meihua', name: '梅花纹', symbol: 'hehua', meaning: '坚韧不拔，高洁傲骨', example: '枝干与花朵搭配，红棕色' },
        { id: 'juhua', name: '菊花纹', symbol: 'hehua', meaning: '延年益寿，清雅高洁', example: '造型舒展，黄红色' },
        { id: 'taohua', name: '桃花纹', symbol: 'hehua', meaning: '爱情甜蜜，桃李天下', example: '粉色花瓣，娇美动人，黄红色' },
        { id: 'lanhua', name: '兰花纹', symbol: 'caohua', meaning: '品性高洁，典雅脱俗', example: '叶片修长，清雅别致，黄绿色' },
        { id: 'caohua', name: '草花纹', symbol: 'caohua', meaning: '生机盎然，自然活力', example: '简洁的草本植物造型，深绿色' },
        { id: 'huaduo', name: '花朵纹', symbol: 'hehua', meaning: '美好祝福，绚丽多彩', example: '有黄黑色和绿红色两种造型' },
        // 果实类
        { id: 'shoutao', name: '寿桃纹', symbol: 'shoutao', meaning: '福寿安康，长命百岁', example: '造型饱满，黄绿色' },
        { id: 'shiliu', name: '石榴纹', symbol: 'shoutao', meaning: '多子多福，子孙满堂', example: '带有果实的石榴枝，黄绿色' },
        { id: 'lianzi', name: '莲子纹', symbol: 'hehua', meaning: '多子多福，连生贵子', example: '莲蓬带莲子的造型，紫黑色' },
        { id: 'huliu', name: '葫芦纹', symbol: 'shoutao', meaning: '"福禄"谐音，福禄双全', example: '葫芦造型，黄红色' },
        { id: 'putao', name: '葡萄纹', symbol: 'shoutao', meaning: '子孙繁多，硕果累累', example: '葡萄串造型，寓意丰收，黄绿色' },
        // 枝叶类
        { id: 'zhwen', name: '竹纹', symbol: 'caohua', meaning: '节节高升，清高正直', example: '竹节造型，寓意高洁，黄绿色' },
        { id: 'songshu', name: '松树纹', symbol: 'caohua', meaning: '长寿坚韧，坚贞不屈', example: '松树造型，寓意长寿，黄绿色' },
        { id: 'yangliu', name: '杨柳纹', symbol: 'caohua', meaning: '春意盎然，生机勃勃', example: '柳枝造型，婀娜多姿，黄绿色' },
      ]
    },
    {
      id: 'geometric',
      name: '几何纹样',
      patterns: [
        { id: 'wan', name: '万字纹', symbol: 'geoyi', meaning: '万寿无疆，吉祥不断', example: '旋转的万字符号，连续不断' },
        { id: 'lianqian', name: '连钱纹', symbol: 'geoyi', meaning: '财源滚滚，富足有余', example: '铜钱相连造型，黄绿色' },
        { id: 'panchang', name: '盘长纹', symbol: 'geoyi', meaning: '连绵不绝，长生不老', example: '盘曲的长条纹样，黄绿色' },
        { id: 'tongqian', name: '铜钱纹', symbol: 'geoyi', meaning: '招财进宝，富贵荣华', example: '单个铜钱造型，红黑色' },
        { id: 'lin', name: '鳞纹', symbol: 'lin', meaning: '鱼鳞层层，富贵连连', example: '鱼鳞状排列纹样，黄绿色' },
        { id: 'lei', name: '雷纹', symbol: 'geoyi', meaning: '驱邪避害，雷霆万钧', example: '雷云纹样，神秘威严，黄绿色' },
        { id: 'fangsheng', name: '方胜纹', symbol: 'geoyi', meaning: '胜利吉祥，勇敢无畏', example: '两个菱形相叠，黄红色' },
        { id: 'suowen', name: '锁纹', symbol: 'geoyi', meaning: '平安吉祥，守护安全', example: '锁具造型纹样，黄绿色' },
      ]
    }
  ]
};

// ==================== 导出所有分类 ====================
export const ALL_PATTERN_CATEGORIES = [
  PERSONNEL_COSTUME_PATTERNS,
  AUSPICIOUS_BEAST_PATTERNS,
  DECORATIVE_PATTERN_PATTERNS
];

// 根据ID获取分类
export function getCategoryById(id: string) {
  return ALL_PATTERN_CATEGORIES.find(cat => cat.id === id);
}

// 根据ID获取子分类
export function getSubcategoryById(categoryId: string, subcategoryId: string) {
  const category = getCategoryById(categoryId);
  if (!category) return null;
  return category.subcategories.find(sub => sub.id === subcategoryId);
}

// 根据纹样ID获取完整信息
export function getPatternById(patternId: string) {
  for (const category of ALL_PATTERN_CATEGORIES) {
    for (const subcategory of category.subcategories) {
      const pattern = subcategory.patterns.find(p => p.id === patternId);
      if (pattern) {
        return {
          ...pattern,
          categoryId: category.id,
          categoryName: category.name,
          subcategoryId: subcategory.id,
          subcategoryName: subcategory.name
        };
      }
    }
  }
  return null;
}

// 获取所有纹样（扁平列表）
export function getAllPatterns() {
  const patterns: any[] = [];
  for (const category of ALL_PATTERN_CATEGORIES) {
    for (const subcategory of category.subcategories) {
      for (const pattern of subcategory.patterns) {
        patterns.push({
          ...pattern,
          categoryId: category.id,
          categoryName: category.name,
          subcategoryId: subcategory.id,
          subcategoryName: subcategory.name
        });
      }
    }
  }
  return patterns;
}
