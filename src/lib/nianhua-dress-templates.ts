export type NianhuaDressTemplate = {
  id: string;
  name: string;
  image: string;
  origin: string;
  summary: string;
  story: string[];
  composition: string;
  primaryPerson: string;
};

export const NIANHUA_DRESS_TEMPLATES: NianhuaDressTemplate[] = [
  {
    id: 'jiang-ziya',
    name: '姜子牙',
    image: '/images/nianhua-dress/jiang-ziya.png',
    origin: '神话人物 · 镇宅纳福',
    summary: '持打神鞭、骑四不像的守护者形象。',
    story: [
      '姜子牙在年画中常持打神鞭、骑四不像，寄托镇宅辟邪、护佑家宅安宁的愿望。',
      '传说姜子牙受元始天尊之命封神，这一形象体现了民众对守护力量的期盼，以及对安稳生活的追求。',
    ],
    composition: '骑四不像的姜子牙、举起的打神鞭、鲜艳战袍与完整坐骑轮廓',
    primaryPerson: '姜子牙的面部',
  },
  {
    id: 'zhao-kuangyin',
    name: '赵匡胤',
    image: '/images/nianhua-dress/zhao-kuangyin.png',
    origin: '朱仙镇年画 · 龙虎门神',
    summary: '历史传说与门神艺术交融的英雄形象。',
    story: [
      '赵匡胤在朱仙镇木版年画中的形象，是历史传说、民间信仰与艺术创造的结合。',
      '作为“龙虎门神”，这一独特形象既体现了宋太祖在百姓心中的崇高地位，也映射出中原文化对忠义与秩序的推崇。年画艺术代代相传，至今仍焕发着生命力。',
    ],
    composition: '骑马的龙虎门神、层叠盔甲、兵器与鲜明的朱仙镇套色',
    primaryPerson: '赵匡胤的面部',
  },
  {
    id: 'wuzi-dengke',
    name: '五子登科',
    image: '/images/nianhua-dress/wuzi-dengke.png',
    origin: '吉祥题材 · 光耀门楣',
    summary: '家族兴盛与教子有方的吉庆图像。',
    story: [
      '“五子登科”典出五代十国时期窦禹钧（窦燕山）教子有方的故事。据《宋史》记载，窦禹钧五子仪、俨、侃、偁、僖相继考中进士，成为父子皆进士、兄弟俱登科的典范。',
      '这一典故被赋予“五子齐荣”“光耀门楣”的象征意义，表达了人们对家风传承与子孙成才的美好期盼。',
    ],
    composition: '中央主角与环绕的五位童子、吉祥花卉，保持多人群像构图',
    primaryPerson: '画面中央的成年主角窦禹钧的面部；五位童子的面部必须保持各自原貌',
  },
  {
    id: 'yuchi-gong',
    name: '尉迟恭',
    image: '/images/nianhua-dress/yuchi-gong.png',
    origin: '朱仙镇年画 · 门神守护',
    summary: '唐代名将成为民间守护门神。',
    story: [
      '尉迟恭是唐初名将，在玄武门之变中立下头功，也是凌烟阁二十四功臣之一。他与秦琼（秦叔宝）成为门神，源于一段广为流传的故事。',
      '相传唐太宗李世民晚年夜不能寐，便让两位将军全副武装守卫宫门，当夜遂安然无事。后来太宗体恤二人辛苦，命画师绘制其画像贴于宫门，邪祟遂绝。',
      '这一传说在《西游记》和《隋唐演义》中都有相关叙述。两位将军也因此成为民间信仰中驱邪避鬼、守护家宅的门神。',
    ],
    composition: '尉迟恭的武将坐姿、盔甲、兵器、喜庆而庄重的门神构图',
    primaryPerson: '尉迟恭的面部',
  },
  {
    id: 'yangjiabu-woman',
    name: '杨家埠仕女',
    image: '/images/nianhua-dress/yangjiabu-woman.png',
    origin: '山东杨家埠 · 谐音吉庆',
    summary: '挑花篮的女性形象，寓意连生贵子。',
    story: [
      '山东杨家埠木版年画中，这类挑花篮的女性形象运用了谐音吉庆的表达。民间常将莲花（莲）、桂花（贵）与竹笙（生）组合，寓意“连生贵子”，祈求多子多福、人丁兴旺。',
      '这类人物画传统上常成对印制。若将花篮、配景与成对的童子结合，也会延伸出“岁岁丰登、连年有余”的吉祥内涵。',
    ],
    composition: '手持花篮的女性、传统服饰、花卉配景与杨家埠民间套色',
    primaryPerson: '挑花篮女性的面部',
  },
];

export function getNianhuaDressTemplate(id: string) {
  return NIANHUA_DRESS_TEMPLATES.find(item => item.id === id);
}
