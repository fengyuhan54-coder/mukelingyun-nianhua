'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import WorkbenchBackButton from '@/components/WorkbenchBackButton';
import TaskContextBar from '@/components/TaskContextBar';
import type { CreativeTask } from '@/lib/creative-task-types';
import { addCreativeTaskMaterial, getCreativeTask, mergeCreativeTaskCulture, setActiveCreativeTaskId, updateCreativeTaskStep } from '@/lib/creative-task-storage';
import { getHandoffReference } from '@/lib/muling-storage';

// 消息类型
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'quiz' | 'knowledge';
  isStreaming?: boolean;
}

interface CultureTourContext {
  title: string;
  elements: string[];
  overview: string;
  observations: string[];
  interpretations: string[];
  uncertainty: string;
  questionSuggestions: string[];
  source: string;
  referenceId?: string;
  timestamp: number;
}

function toPlainChatText(content: string) {
  const cleaned = content
    .replace(/\r\n/g, '\n')
    .replace(/```[\w-]*\n?([\s\S]*?)```/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
    .replace(/__([\s\S]*?)__/g, '$1')
    .replace(/~~([\s\S]*?)~~/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/^\s*([-*_])(?:\s*\1){2,}\s*$/gm, '')
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, '$1')
    .replace(/[\*_`~]{1,3}/g, '');

  return cleaned
    .split('\n')
    .filter(line => !/^\s*\|?[\s:|-]+\|?\s*$/.test(line))
    .map(line => /^\s*\|.*\|\s*$/.test(line)
      ? line.split('|').map(cell => cell.trim()).filter(Boolean).join('　')
      : line)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
// 核心内容数据 - 带详细图文介绍
const CORE_CONTENT = [
  {
    id: 'intro',
    icon: '🏠',
    title: '基础入门科普',
    subtitle: '追溯千年历史，解读六大流派',
    color: '#c41e3a',
    sections: [
      {
        title: '年画起源',
        content: '木版年画始于汉代"门神画"，兴于宋元，盛于明清。\n\n【通俗讲】\n早在两千多年前，咱们老祖宗就开始在门上贴画驱邪了。那时候用的是桃木板，画上"神荼""郁垒"两位大神，往门上一贴，妖魔鬼怪就不敢进门。\n\n到了宋代，活字印刷术普及后，木头刻版印刷一下子火了起来，年画也跟着从宫廷走向民间，成为过年必备的"年货"。\n\n明清时期年画达到鼎盛，几乎家家户户过年都要贴，热闹程度堪比现在的集五福！',
        keywords: ['门神画', '汉代', '宋代', '明清鼎盛']
      },
      {
        title: '六大流派',
        content: '全国主要有六大年画产地，各有绝活！\n\n【通俗讲】\n同样是年画，北方和南方差别可大了——\n\n🏠 天津杨柳青（北方代表）\n• 细腻精美，色彩鲜艳\n• 人物画得特别传神\n• 代表作：胖娃娃抱鲤鱼\n\n🏠 苏州桃花坞（江南代表）\n• 线条细腻，色彩雅致\n• 带点文人画的韵味\n• 代表作：一团和气\n\n🏠 山东杨家埠（乡土代表）\n• 粗犷豪放，土味十足\n• 农民自创自画\n• 价格实惠接地气\n\n🏠 河南朱仙镇（老字号）\n• 历史最悠久，据说是岳飞留下的\n• 线条粗犷有力\n• 古朴厚重有年代感\n\n🏠 四川绵竹（套色高手）\n• 套版印刷最精湛\n• 色彩明快活泼\n• 技法独特叫"明展明挂"\n\n🏠 河北武强（民间草根）\n• 民间气息最浓\n• 被称为"农民画"\n• 以前销往全国各地',
        keywords: ['杨柳青', '桃花坞', '杨家埠', '朱仙镇', '绵竹', '武强']
      },
      {
        title: '吉祥寓意',
        content: '年画上的图案可不是随便画的，都是有讲究的！\n\n【通俗讲】\n老祖宗最爱用"谐音梗"——\n\n🎨 动物类：\n• 蝙蝠（福）→ 蝙蝠飞临，福气到家\n• 鹿（禄）→ 鹿与"禄"同音，寓意升官发财\n• 鹤（寿）→ 仙鹤是长寿象征\n• 喜鹊（喜）→ 喜鹊叫，喜事到\n\n🎨 植物类：\n• 牡丹 → 花中之王，象征富贵\n• 石榴 → 多籽=多子多福\n• 桃子 → 仙桃=长寿\n• 橘子 → 谐音"吉"\n\n🎨 经典组合：\n• 胖娃娃+鲤鱼 = "连年有余"\n• 喜鹊+梅花 = "喜上眉梢"\n• 蝙蝠+铜钱 = "福在眼前"',
        keywords: ['蝙蝠', '鹿', '鹤', '牡丹', '鱼', '连年有余']
      },
      {
        title: '南北方年画对比',
        content: '【南北年画大不同】\n\n🌡️ 气候影响风格\n北方冬天冷、干燥，年画色彩要浓烈才能烘托热闹气氛；南方湿润温婉，色彩就柔和雅致一些。\n\n🎨 题材差异\n• 北方年画：多武将门神、胖娃娃，追求喜庆热闹\n• 南方年画：多文人山水、花鸟虫鱼，追求意境雅致\n\n🖌️ 技法差别\n• 北方：大胆写意，色彩鲜明\n• 南方：精雕细琢，晕染细腻',
        keywords: ['南北方', '对比', '风格', '差异']
      }
    ]
  },
  {
    id: 'craft',
    icon: '🔨',
    title: '传统制作工艺',
    subtitle: '五道工序，一把刻刀铸就千年技艺',
    color: '#228b22',
    sections: [
      {
        title: '1. 绘稿',
        content: '【通俗讲】\n绘稿就像盖房子先画图纸，是最关键的创作环节！\n\n老艺人要先在纸上画出"画稿"，这一步要考虑很多：\n• 线条不能太细太密，不然刻版时容易断\n• 人物脸部要留"空板"，印刷后还要手工开脸\n• 颜色多的图要分出"套版"——每种颜色单独一块版\n\n💡【进阶知识】\n"空板"是杨柳青年画的特色技法，面部不提前印刷，由艺人用毛笔一笔画成叫"开相"，这是最见功力的环节。',
        keywords: ['绘稿', '空板', '套版']
      },
      {
        title: '2. 刻版',
        content: '【通俗讲】\n把画稿贴在梨木版上，然后用特制刻刀一刀刀雕刻。这活儿急不得，细致的版要刻一个多月！\n\n🔪 刻版基本功：\n• 阴刻：把线条部分挖掉，印出来是白线黑底\n• 阳刻：把空白部分挖掉，保留线条，印出来是黑线白底\n\n💡【白话注解】\n阴刻=把"线"挖掉，印刷时空白部分吃墨，画面显出"白线"\n阳刻=把"空白"挖掉，印刷时只在线条上墨，画面显出"黑线"\n\n【进阶知识】\n• 梨木纹理细密，是刻版最佳材料\n• 好刻工要用"拳刀"，讲究"推刀"和"拉刀"配合\n• 精细年画版可能需要几十万刀！',
        keywords: ['梨木版', '阴刻', '阳刻', '刻刀']
      },
      {
        title: '3. 上墨与套印',
        content: '【通俗讲】\n印刷环节就像盖章！\n\n🖌️ 步骤分解：\n1️⃣ 用棕刷蘸墨，均匀刷在刻好的版上\n2️⃣ 把宣纸覆在版上\n3️⃣ 用"马莲"轻轻压印\n\n💡【白话注解】\n棕刷=用棕榈树皮编的刷子\n马莲=压纸拓印的工具，像个小擀面杖\n\n⚠️【工艺难点】\n套色印刷最难的是"对位"——每种颜色要精准套在上一色旁边，误差大了就会"套歪"，前功尽弃！',
        keywords: ['棕刷', '马莲', '套印', '对位']
      },
      {
        title: '4. 手工彩绘',
        content: '【通俗讲】\n这是年画最展现"手艺"的环节！\n\n印刷好的墨线稿由艺人手工给人物"开脸"、晕染服饰。一幅年画好不好看，这一步至关重要！\n\n👁️ "开相"有多难？\n• 人物眼神要一笔画成，不能描\n• 面部比例要精准，差一点就变丑\n• 全凭手感，几十年功夫才能练成\n\n💡【传承讲究】\n老辈艺人说："三年学刻版，十年学开相。"开相是最难学的技艺，往往是家族秘传。',
        keywords: ['开脸', '开相', '彩绘', '手工']
      },
      {
        title: '5. 装裱',
        content: '【通俗讲】\n最后一步，给年画"打扮"一下！\n\n📦 装裱步骤：\n• 裁切整齐，去掉多余边角\n• 托一层宣纸加固画心\n• 配上喜庆的边框和轴头\n\n💡【进阶知识】\n传统装裱分"卷轴"和"镜片"两种：\n• 卷轴：配轴头可挂可卷，适合大幅年画\n• 镜片：直接裱在纸板上，方便张贴\n\n🎉 完成！\n一幅传统木版年画凝结了画师、刻工、印匠、裱画师的心血，每一道都是手艺！',
        keywords: ['装裱', '托纸', '卷轴', '镜片']
      }
    ]
  },
  {
    id: 'folklore',
    icon: '📖',
    title: '民俗与故事',
    subtitle: '年画里的传说、习俗与文化密码',
    color: '#4a90e2',
    sections: [
      {
        title: '门神典故',
        content: '【通俗讲】\n门神可是年画的"老祖宗"！\n\n🎭 故事是这样的：\n传说唐太宗李世民晚上总做噩梦，宫里闹鬼！大将秦琼和尉迟敬德主动请缨："陛下别怕，我们守门！"两人披挂整齐往宫门一站，果然一夜安稳。\n\n太宗心疼将军们，就让画师画下他们的威武形象贴在门上试试——还真管用！从此民间纷纷效仿，门神画就这么传开了。\n\n👑【进阶知识】\n秦琼、尉迟恭是最经典的武门神组合。但门神还有很多：\n• 神荼、郁垒：最早的"正版"门神\n• 钟馗：传说能打鬼驱邪\n• 关公：武财神，兼具镇宅功能',
        keywords: ['秦琼', '尉迟敬德', '唐太宗', '门神', '钟馗']
      },
      {
        title: '过年贴年画习俗',
        content: '【通俗讲】\n贴年画可是有讲究的！\n\n📅【时间】\n• 最佳时机：腊月二十三到除夕\n• 最好上午贴，寓意"开门见喜"\n• 现代人除夕中午贴也OK\n\n🚪【位置】\n• 大门 → 武门神（镇宅挡邪）\n• 屋内门 → 文门神或福字\n• 客厅 → 福禄寿、胖娃娃\n• 厨房 → 灶王爷\n• 卧室 → 送子娘娘\n\n⚠️【老规矩】\n• 门神脸要朝外——把邪气挡出门\n• 从里到外贴——寓意"由内而外"越来越旺\n• 破了要补——寓意圆满\n• 贴正不贴歪——端端正正',
        keywords: ['除夕', '武门神', '文门神', '镇宅', '习俗']
      },
      {
        title: '婚嫁祭祀年画',
        content: '【通俗讲】\n年画不只是过年用，人生大事都离不开它！\n\n💒【婚嫁年画】\n• 龙凤呈祥 → 龙凤合鸣，婚姻美满\n• 百年好合 → 祝福新人白头偕老\n• 并蒂同心 → 夫妻同心，相亲相爱\n\n🎊【祝寿年画】\n• 福禄寿三星 → 福气、功名、长寿齐全\n• 麻姑献寿 → 神话仙女送长寿\n• 寿比南山 → 寓意福寿绵长\n\n🙏【祭祀年画】\n• 天地全神 → 供奉天地神明\n• 灶王爷 → 腊月二十三祭灶王\n• 财神 → 正月初五迎财神',
        keywords: ['龙凤呈祥', '百年好合', '福禄寿', '灶王爷', '祭祀']
      },
      {
        title: '老年画与现代年画演变',
        content: '【百年演变史】\n\n📜【清末民初】\n• 年画风格最为鼎盛\n• 题材丰富：历史故事、戏曲人物、神仙佛像\n• 色彩鲜艳，构图饱满\n\n🏭【民国时期】\n• 石印年画冲击传统木版年画\n• 部分年画产地开始机械化生产\n• 传统技艺面临挑战\n\n🎨【新中国成立后】\n• 50年代：新年画运动，赋予新主题\n• 传统年画与新元素结合\n\n📺【改革开放后】\n• 电视机普及，年味变淡\n• 年画逐渐被挂历、春联取代\n• 传统年画技艺面临失传危机\n\n🌟【当代非遗保护】\n• 木版年画列入国家级非遗名录\n• 各地建立年画博物馆、传习所\n• 年轻传承人用新思维活化传统技艺',
        keywords: ['演变', '历史', '清末', '民国', '新中国', '非遗']
      }
    ]
  },
  {
    id: 'misconception',
    icon: '⚠️',
    title: '非遗误区科普',
    subtitle: '纠正认知误区，走进真实的年画世界',
    color: '#e67e22',
    sections: [
      {
        title: '误区一：年画就是印刷品',
        content: '❌【错误认知】\n很多人觉得年画不就是机器印的嘛，和普通印刷品没区别。\n\n✅【真相】\n传统木版年画是"手工+版画"的结合：\n• 每块版都是手工雕刻\n• 每张画都是手工印刷\n• 色彩由浅入深层层叠加\n• 有些工序（如开脸）完全靠毛笔手绘\n\n🎨【版画知识小科普】\n木版年画属于"木版画"艺术，和铜版画、石版画、丝网版画并称"四大版画"。每一块年画版都是独一无二的艺术品！\n\n💰【价值差异】\n机制印刷年画几元一张，老艺人手工年画价值数百甚至上千元。顶级藏家作品更是有价无市。',
        keywords: ['误区', '印刷', '版画', '手工']
      },
      {
        title: '误区二：年画都是红色的',
        content: '❌【错误认知】\n年画都是大红大绿，喜庆嘛！\n\n✅【真相】\n不同地域年画配色差异巨大：\n\n🎨【北方年画】\n以红、黄、绿为主，对比强烈，热闹喜庆\n代表：杨柳青、杨家埠\n\n🎨【南方年画】\n以蓝、绿、黄为主，色彩柔和，雅致清新\n代表：桃花坞、绵竹\n\n🎨【特殊配色】\n• 朱仙镇年画：用槐黄、章丹等传统颜料，色彩古朴\n• 武强年画：善用黑、红对比，形成独特风格',
        keywords: ['配色', '红色', '地域差异', '色彩']
      },
      {
        title: '误区三：年画只是迷信',
        content: '❌【错误认知】\n贴门神就是迷信，年画就是封建糟粕。\n\n✅【真相】\n年画承载的是美好的民俗愿望：\n\n🙏【文化意义】\n• 门神画 → 表达"保家平安"的愿望\n• 福禄寿 → 表达"美好生活"的期盼\n• 胖娃娃 → 表达"人丁兴旺"的祝愿\n• 牡丹鲤鱼 → 表达"富贵有余"的向往\n\n📚【民俗学价值】\n年画是研究中国民间美术、民俗信仰、社会心理的"活化石"，具有重要的民俗学、美术学、历史学价值。',
        keywords: ['迷信', '民俗', '文化', '愿望']
      },
      {
        title: '误区四：年画已经被淘汰了',
        content: '❌【错误认知】\n现在谁还贴年画啊，早就被时代淘汰了。\n\n✅【真相】\n年画正在"活态传承"：\n\n🌟【非遗保护】\n• 2006年，木版年画列入首批国家级非物质文化遗产\n• 全国建立了几十个年画博物馆、传习所\n• 老艺人带徒传艺，技艺后继有人\n\n🎨【创新发展】\n• 年画元素融入现代设计（服装、首饰、文创）\n• 年画+科技：AR年画、数字藏品\n• 年画进校园：培养新一代年画爱好者\n• 国际交流：年画走向世界舞台',
        keywords: ['非遗', '传承', '创新', '活态']
      }
    ]
  },
  {
    id: 'digital',
    icon: '💻',
    title: '数字融合创新',
    subtitle: '传统技艺与数字科技的完美邂逅',
    color: '#9b59b6',
    sections: [
      {
        title: 'AR增强现实年画',
        content: '【通俗讲】\nAR就是用手机摄像头让年画"动起来"！\n\n📱【怎么玩】\n1. 下载AR年画APP\n2. 用手机摄像头对准年画\n3. 屏幕上的年画就会动起来、发出声音！\n\n🎭【有趣体验】\n• 门神挥刀舞剑\n• 胖娃娃撒金币\n• 鲤鱼跃出水面\n\n💡【意义】\nAR技术让静态的年画变得生动有趣，特别吸引年轻人和小朋友，让传统艺术不再"冷冰冰"。',
        keywords: ['AR', '增强现实', '科技', '互动']
      },
      {
        title: 'AI智能年画创作',
        content: '【通俗讲】\nAI就是用电脑"学"会年画的画法，然后自己创作！\n\n🤖【怎么实现的】\n1. 把大量传统年画喂给AI"看"\n2. AI学习年画的线条、色彩、构图规律\n3. 你输入想要的描述，AI就能生成新的年画\n\n🎨【项目应用】\n我们项目就用了AI技术：\n• AI识别年画中的可动区域\n• AI生成年画的动态效果\n• AI辅助设计新的年画纹样\n\n⚠️【注意】\nAI是工具，不能取代传统艺人。真正的年画还是靠手艺人一刀刀刻出来的，AI只是辅助！',
        keywords: ['AI', '人工智能', '创作', '辅助']
      },
      {
        title: '项目原创作品展示',
        content: '【我们的作品】\n\n🖼️ 原创年画系列：\n• "数字门神"系列：传统门神+现代科技元素\n• "节气年画"系列：24节气对应24幅年画\n• "萌娃年画"系列：Q版胖娃娃，更可爱\n\n💡【设计理念】\n• 在传承中创新：保留传统年画的吉祥寓意\n• 在创新中守正：线条、色彩遵循传统规范\n• 让年画走进现代生活：可以做成手机壳、帆布包、冰箱贴\n\n🏆【创新亮点】\n• 传统+现代：把年画元素和当代审美结合\n• 静态+动态：让年画"动起来"\n• 线下+线上：线上传播，线下体验',
        keywords: ['原创', '设计', '创新', '作品']
      }
    ]
  },
  {
    id: 'practical',
    icon: '📋',
    title: '实用知识手册',
    subtitle: '贴年画、存年画、辨年画，一本就够',
    color: '#16a085',
    sections: [
      {
        title: '年画张贴完全指南',
        content: '【按空间选年画】\n\n🚪【大门】\n• 武门神（秦琼、尉迟恭）\n• 寓意：镇宅辟邪，保家平安\n• 技巧：门神脸朝外，贴在门板正中\n\n🚪【客厅】\n• 福禄寿三星、招财进宝\n• 寓意：迎福纳祥，财源广进\n• 技巧：挂在沙发背景墙正中，高度与视线平齐\n\n🍳【厨房】\n• 灶王爷、聚宝盆\n• 寓意：灶王保佑，饮食平安\n• 技巧：贴在灶台上方，不要正对灶火\n\n🛏️【卧室】\n• 送子娘娘、和合二仙\n• 寓意：姻缘美满，早生贵子\n• 技巧：贴在床头柜上方，位置适中\n\n📚【书房】\n• 一品清廉、独占鳌头\n• 寓意：学业进步，事业有成\n• 技巧：挂在书桌正上方',
        keywords: ['张贴', '位置', '空间', '指南']
      },
      {
        title: '古版年画保存与鉴别',
        content: '【保存技巧】\n\n📦【环境要求】\n• 温度：15-25℃为宜\n• 湿度：50-60%为宜，避免潮湿\n• 光照：避免阳光直射，会褪色\n\n🛡️【保护方法】\n• 装裱后悬挂，或平放收藏\n• 用宣纸间隔，防止粘连\n• 远离樟脑丸（会损害纸张）\n• 每年春秋两季通风晾晒\n\n🔍【鉴别老版年画】\n• 看纸张：老纸泛黄，有历史感\n• 看墨色：老墨沉稳，不刺眼\n• 看刀痕：手工刻版有刀味，机器仿品线条均匀\n• 看套印：老年画套印略有偏差，完美对齐的可能是现代印的\n• 闻气味：老画有淡淡纸香，仿品可能有油墨味',
        keywords: ['保存', '鉴别', '老版', '技巧']
      },
      {
        title: '新手DIY体验教程',
        content: '【简易体验：橡皮章年画】\n\n🖌️【准备材料】\n• 橡皮砖（淘宝有卖，几元一块）\n• 刻刀套装\n• 印台（红色、黑色）\n• 卡纸或宣纸\n\n📝【步骤】\n1️⃣ 在橡皮砖上画个简单的年画图案（如胖娃娃）\n2️⃣ 用刻刀沿线条刻掉空白部分\n3️⃣ 蘸上印台颜料\n4️⃣ 盖在纸上，用力压实\n5️⃣ 成品完成！\n\n💡【小贴士】\n• 先从简单的图案开始，不要太复杂\n• 刻的时候刀刃朝外，安全第一\n• 可以多做几个，送给朋友当新年礼物\n\n🎁【意义】\n亲手做一幅"年画"，比买来的更有心意！',
        keywords: ['DIY', '体验', '教程', '手工']
      }
    ]
  }
];

// 趣味答题数据
const QUIZ_QUESTIONS = [
  {
    question: '中国六大年画产地中，"粗犷豪放、土味十足"是哪个流派的特点？',
    options: ['A. 天津杨柳青', 'B. 山东杨家埠', 'C. 苏州桃花坞', 'D. 河南朱仙镇'],
    answer: 'B',
    explanation: '山东杨家埠年画以粗犷豪放、质朴乡土的风格著称，代表了北方农民的审美趣味。'
  },
  {
    question: '木版年画制作中，"阴刻"和"阳刻"的主要区别是什么？',
    options: ['A. 刻的深浅不同', 'B. 线条和空白部分的处理不同', 'C. 使用的刻刀不同', 'D. 印刷的顺序不同'],
    answer: 'B',
    explanation: '阴刻把线条部分挖掉，印出来是白线黑底；阳刻把空白部分挖掉，印出来是黑线白底。'
  },
  {
    question: '"连年有余"年画中，"连"和"余"分别代表什么？',
    options: ['A. 连=莲花，余=鱼', 'B. 连=连接，余=剩余', 'C. 连=连绵，余=余晖', 'D. 连=连心，余=余生'],
    answer: 'A',
    explanation: '"连年有余"是吉祥寓意，"连"谐音莲花，"余"谐音鱼类，寓意生活富足、年年有余。'
  },
  {
    question: '以下哪个不是传统年画的制作工序？',
    options: ['A. 绘稿', 'B. 刻版', 'C. 激光打印', 'D. 套印'],
    answer: 'C',
    explanation: '传统木版年画的工序包括绘稿、刻版、上墨、套印、装裱等，没有激光打印环节。'
  },
  {
    question: '门神画中，最经典的武将组合是谁和谁？',
    options: ['A. 关羽和张飞', 'B. 秦琼和尉迟恭', 'C. 项羽和刘邦', 'D. 岳飞和韩世忠'],
    answer: 'B',
    explanation: '秦琼和尉迟恭是唐太宗时期的两位大将，传说他们守门能驱邪辟鬼，成为最经典的门神组合。'
  },
  {
    question: '年画为什么被称为"木版年画"？',
    options: ['A. 因为画的是木头', 'B. 因为用木头刻版印刷', 'C. 因为产自木版地区', 'D. 因为挂在木板上'],
    answer: 'B',
    explanation: '"木版"指的是用木头雕刻的印刷模板，年画通过这个木板一张张印出来，所以叫木版年画。'
  },
  {
    question: '以下哪个年画寓意"福气到来"？',
    options: ['A. 蝙蝠纹样', 'B. 老虎纹样', 'C. 蛇纹样', 'D. 蝎子纹样'],
    answer: 'A',
    explanation: '蝙蝠的"蝠"谐音"福"，所以蝙蝠纹样在年画中寓意"福气到来"、"福在眼前"。'
  },
  {
    question: '2006年，木版年画被列入什么名录？',
    options: ['A. 世界文化遗产', 'B. 首批国家级非物质文化遗产', 'C. 国家重点文物保护单位', 'D. 中国传统工艺振兴计划'],
    answer: 'B',
    explanation: '2006年，木版年画被列入首批国家级非物质文化遗产名录，得到国家层面的保护。'
  },
  {
    question: '"马莲"在年画制作中的作用是什么？',
    options: ['A. 雕刻版', 'B. 研磨颜料', 'C. 压纸拓印', 'D. 调制纸张'],
    answer: 'C',
    explanation: '马莲是一种草茎做的工具，用来把纸压在已上墨的版上，使图案转印到纸上。'
  },
  {
    question: '过年贴年画的最佳时机是什么时候？',
    options: ['A. 正月初一', 'B. 腊月二十三到除夕', 'C. 元宵节', 'D. 腊月初一'],
    answer: 'B',
    explanation: '传统习惯是在腊月二十三（小年）到除夕之间贴年画，寓意辞旧迎新、迎祥纳福。'
  }
];

// 快捷指令映射
const QUICK_COMMANDS: { [key: string]: string } = {
  '入门科普': 'intro',
  '制作工艺': 'craft',
  '图案寓意': 'intro',
  '民俗故事': 'folklore',
  '趣味答题': 'quiz',
  '非遗创新': 'digital',
  '误区科普': 'misconception',
  '实用知识': 'practical',
  '数字创新': 'digital',
  '保存鉴别': 'practical'
};

export default function IntangibleHeritage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '🎊 欢迎来到非遗科普小课堂！\n\n我是您的年画知识小助手~ 无论您是普通游客、青少年，还是年画爱好者，这里都有适合您的内容！\n\n📚 您可以：\n• 点击上方卡片学习核心知识\n• 发送问题问我年画相关知识\n• 输入【趣味答题】开始知识挑战\n• 输入【入门科普】【制作工艺】等关键词快速跳转',
      type: 'text'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<typeof QUIZ_QUESTIONS[0] | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [expandedCards, setExpandedCards] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('intro');
  const [tourContext, setTourContext] = useState<CultureTourContext | null>(null);
  const [tourPhoto, setTourPhoto] = useState('');
  const [taskId, setTaskId] = useState('');
  const [creativeTask, setCreativeTask] = useState<CreativeTask | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const linked = new URLSearchParams(window.location.search).get('taskId') || '';
    if (!linked) return;
    setTaskId(linked); setActiveCreativeTaskId(linked);
    void getCreativeTask(linked).then(task => setCreativeTask(task || null));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = sessionStorage.getItem('__heritage_culture_tour_handoff__');
        if (!raw) return;
        const context = JSON.parse(raw) as CultureTourContext;
        if (!context || typeof context.timestamp !== 'number' || Date.now() - context.timestamp > 30 * 60 * 1000) return;
        setTourContext(context);
        if (typeof context.referenceId === 'string') {
          const photo = await getHandoffReference(context.referenceId);
          if (photo) setTourPhoto(photo);
        }
        const transferred = [
          '我刚在文化伴游中上传并分析了一张照片。',
          '照片主题：' + context.title,
          '识别元素：' + context.elements.join('、'),
          '整体说明：' + context.overview,
          '可见细节：' + context.observations.join('；'),
          '文化解释：' + context.interpretations.join('；'),
          '判断边界：' + context.uncertainty,
        ].join(String.fromCharCode(10));
        setMessages(previous => previous.some(item => item.id === 'culture-tour-photo-context') ? previous : [
          ...previous,
          { id: 'culture-tour-photo-context', role: 'user', content: transferred },
          { id: 'culture-tour-photo-ready', role: 'assistant', content: '我已经接收到这张旅行照片的分析记忆。你可以直接追问其中的建筑构件、纹样、年画元素或文化寓意，我会结合这次识别结果继续回答。' },
        ]);
        if (context.questionSuggestions?.[0]) setInputValue(context.questionSuggestions[0]);
      } catch {
        sessionStorage.removeItem('__heritage_culture_tour_handoff__');
      }
    })();
  }, []);

  // 切换卡片展开状态
  const toggleCard = (id: string) => {
    setExpandedCards(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    setSelectedTopic(id);
  };

  // 生成回复
  const generateResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    // 检查快捷指令
    for (const [key, sectionId] of Object.entries(QUICK_COMMANDS)) {
      if (input.includes(key)) {
        if (key === '趣味答题') {
          startQuiz();
          return '🎯 好嘞！趣味答题开始！请看题目~';
        }
        setSelectedTopic(sectionId);
        setExpandedCards(prev => prev.includes(sectionId) ? prev : [...prev, sectionId]);
        return `📖 为您找到【${key}】相关内容，请查看上方卡片~`;
      }
    }
    
    // 关键词匹配回复
    const keywordResponses: { [key: string]: string[] } = {
      '杨柳青': [
        '🏠 天津杨柳青年画可是北方年画的代表！\n\n特点：\n• 细腻精美，色彩鲜艳\n• 人物传神，特别注重面部刻画\n• 最有名的就是"胖娃娃抱鲤鱼"\n\n📜 历史：杨柳青距今已有400多年历史，鼎盛时期"家家点染、户户丹青"，全村人都画画！',
        '🎨 杨柳青年画最厉害的是"开相"技法——\n\n就是人物脸部由艺人用毛笔一笔画成，不用印刷！\n\n这种技法非常考验功力，老艺人说"十年学刻版，百年学开相"，可见其难度~'
      ],
      '桃花坞': [
        '🏠 苏州桃花坞是南方年画的代表！\n\n特点：\n• 线条细腻，色彩雅致\n• 带点文人画的韵味\n• 最有名的就是"一团和气"\n\n📜 历史：桃花坞年画始于明代，与江南园林、刺绣并称"苏州三绝"~',
        '🎨 桃花坞年画的特点是"雅"——\n\n不像北方年画那么热烈，色彩更柔和，更像江南人的性格，温婉细腻~'
      ],
      '门神': [
        '🚪 门神可是年画的"老祖宗"！\n\n最经典的故事：\n唐太宗晚上总做噩梦，大将秦琼和尉迟敬德主动请缨守门，果然安稳！\n\n太宗就让画师画下他们的形象贴门上，从此民间纷纷效仿~',
        '👑 门神不只是秦琼和尉迟恭！\n\n• 神荼、郁垒：最早的"正版"门神\n• 钟馗：能打鬼驱邪\n• 关公：武财神\n• 魏征：文官门神\n\n贴门神要脸朝外，这样才能把邪气挡出门！'
      ],
      '刻版': [
        '🔪 刻版可是年画制作的"核心技术"！\n\n步骤：\n1️⃣ 把画稿反贴在梨木版上\n2️⃣ 用特制刻刀一刀刀雕刻\n3️⃣ 精细的版要刻一个多月！\n\n💡 一块精细年画版可能需要几十万刀！',
        '⚠️ 刻版有两种技法：\n\n阴刻：把线条部分挖掉，印出来是白线黑底（像剪纸）\n阳刻：把空白部分挖掉，印出来是黑线白底\n\n老艺人说"阴刻沉稳，阳刻活泼"，各有各的美~'
      ],
      '历史': [
        '📜 年画历史可悠久了！\n\n• 汉代：出现"门神画"，用桃木板\n• 宋代：活字印刷普及，年画开始大规模生产\n• 明清：达到鼎盛，几乎家家户户过年必贴\n\n👍 可以说，一部年画史就是半部中国民间美术史！',
        '🏮 清末民初是年画的黄金时代——\n\n那时候年画题材丰富、色彩鲜艳、构图饱满。\n后来因为战争和现代化冲击，传统年画一度衰落。\n\n好在现在国家重视非遗，年画又活过来啦！'
      ],
      '寓意': [
        '🎨 年画上的图案都是"有讲究"的！\n\n老祖宗最爱用谐音梗：\n• 蝙蝠=福 • 鹿=禄 • 鹤=寿\n• 蝙蝠+铜钱=福在眼前\n• 胖娃娃+鲤鱼=连年有余\n\n😊 这些吉祥寓意体现了老百姓对美好生活的向往~',
        '📚 年画图案寓意大全：\n\n人物：福禄寿三星、胖娃娃\n动物：鲤鱼、仙鹤、蝙蝠\n植物：牡丹、石榴、桃子\n组合：龙凤呈祥、喜鹊登梅\n\n每个图案背后都是一段民俗故事呢~'
      ],
      '习俗': [
        '📅 贴年画有讲究！\n\n时间：腊月二十三到除夕最佳\n顺序：从里到外贴，寓意"由内而外"越来越旺\n位置：大门贴武门神，客厅贴福禄寿\n\n⚠️ 门神脸要朝外，破了要补，贴正不贴歪~',
        '🏠 不同房间贴不同年画：\n\n• 大门→武门神（镇宅）\n• 客厅→福禄寿（迎福）\n• 厨房→灶王爷（保平安）\n• 卧室→送子娘娘（求子）\n• 书房→一品清廉（促学业）'
      ],
      '杨家埠': [
        '🏠 山东杨家埠是"乡土年画"的代表！\n\n特点：\n• 粗犷豪放，土味十足\n• 农民自创自画自印\n• 价格实惠接地气\n• 色彩浓烈，热热闹闹\n\n📜 历史：杨家埠年画始于明代，和北京、上海、天津并称"四大年画产地"~',
        '🎨 杨家埠年画最能代表"民间味"！\n\n题材都是老百姓喜闻乐见的：\n门神、财神、胖娃娃、戏曲故事...\n画风热情饱满，就像山东人的性格一样直爽！'
      ],
      '朱仙镇': [
        '🏠 河南朱仙镇年画是"老字号"！\n\n特点：\n• 历史最悠久，据说是岳飞后人传承下来的\n• 线条粗犷有力\n• 古朴厚重，有年代感\n• 用传统天然颜料（如槐黄、章丹）\n\n📜 历史：朱仙镇年画始于宋代，是中国木版年画的"鼻祖"之一~',
        '🎨 朱仙镇年画的特别之处：\n\n• 用的是传统木版和天然颜料\n• 色彩古朴，不艳不俗\n• 最有名的门神线条特别粗犷有力\n\n有人说，看朱仙镇年画就像看一部活的民间美术史~'
      ],
      '制作': [
        '🎨 木版年画制作有五大工序！\n\n1️⃣ 绘稿：画师创作年画稿子\n2️⃣ 刻版：把稿子刻在梨木版上\n3️⃣ 上墨：在版上刷颜料\n4️⃣ 套印：把纸压上去印出图案\n5️⃣ 彩绘：手工给年画上色（有些作品）\n\n💡 整个过程纯手工，一刀都不能错！',
        '🛠️ 年画制作工具大揭秘：\n\n• 梨木版：选用百年老梨木，纹理细密\n• 刻刀：各种形状的专用刻刀\n• 棕刷：上墨用的刷子\n• 马莲：压纸拓印的草茎工具\n• 颜料：传统天然矿物和植物颜料\n\n这些工具都是老手艺人的"传家宝"！'
      ],
      '福禄寿': [
        '🎊 福禄寿三星可是年画里的"吉祥三宝"！\n\n• 福星：头戴官帽，手持福字，主管福气\n• 禄星：身穿官服，手捧元宝，主管功名\n• 寿星：额头突出，手持寿桃，主管长寿\n\n😊 三星高照寓意福气、功名、长寿三全其美~',
        '💫 福禄寿三星的由来：\n\n• 福星：源于木星，主管天下祸福\n• 禄星：北斗第六星，主管功名利禄\n• 寿星：南极老人星，主管健康长寿\n\n民间把他们组合在一起，寓意"三星高照、吉祥如意"！'
      ],
      '胖娃娃': [
        '👶 胖娃娃是年画里的"人气王"！\n\n最经典的形象：\n• 圆润饱满，笑眯眯的\n• 抱着大鲤鱼\n• 穿着红肚兜\n\n寓意：连年有余、子孙满堂、多福多寿~\n\n😊 看起来就想捏一下脸！',
        '🎨 年画胖娃娃为啥都胖嘟嘟的？\n\n因为在传统文化里，胖=富态=福气！\n\n而且胖娃娃寓意多子多福、添丁进口。\n以前家里添了娃娃，就会贴胖娃娃年画祈福~'
      ],
      '绵竹': [
        '🏠 四川绵竹年画是"西南一枝花"！\n\n特点：\n• 色彩明快，对比强烈\n• 人物夸张，趣味性强\n• 最有名的"竹马"形象\n\n📜 历史：绵竹年画始于宋代，和绵竹竹编并称"绵竹双绝"~',
        '🎨 绵竹年画的特别之处：\n\n• 用的是本地竹纸\n• 色彩特别鲜艳\n• 最有特色的是"填脚"——\n\n就是给人物脚下填一块红色，寓意"脚下有福"！'
      ],
      '武强': [
        '🏠 河北武强年画是"北方年画重镇"！\n\n特点：\n• 产量大，价格便宜\n• 题材广泛，贴近生活\n• 被誉为"农耕社会百科全书"\n\n📜 历史：武强年画始于元代，是中国最大的年画产地之一~',
        '🎨 武强年画为啥叫"百科全书"？\n\n因为题材太丰富了！\n• 门神、灶王爷等神像\n• 历史故事、戏曲人物\n• 花卉鸟虫、吉祥图案\n• 农耕生产、生活习俗\n\n一张年画就是一幅民间生活画卷~'
      ],
      '颜色': [
        '🎨 年画色彩有讲究！\n\n传统年画最爱用：\n• 红色：喜庆、驱邪\n• 黄色：尊贵、皇家气派\n• 绿色：生机、自然\n• 蓝色：沉稳、雅致\n• 金色：富贵、光彩\n\n😊 这些颜色搭配在一起，就是中国人最爱的"热闹红"！',
        '🌈 不同流派配色不同：\n\n• 杨柳青：细腻雅致，颜色过渡柔和\n• 桃花坞：清新淡雅，江南风韵\n• 杨家埠：浓烈对比，乡土气息\n• 朱仙镇：古朴厚重，天然颜料\n\n每个流派的配色都是当地人审美的体现~'
      ],
      '传承': [
        '👨‍🎨 年画传承不容易！\n\n老艺人说：\n• 三年学徒才能入门\n• 十年才能独立刻版\n• 一辈子都在钻研技法\n\n💔 但现在愿意学的年轻人越来越少，很多老艺人担心手艺失传...\n\n🎉 好在国家重视非遗，给老艺人们颁发了"非遗传承人"证书！',
        '🏆 国家级非遗传承人故事：\n\n很多老艺人一辈子只做一件事——\n\n刻版、刷色、拓印...\n\n他们说：\n"手艺人不能糊弄人，一刀一刀都是良心活。"\n\n这份匠心，值得我们尊敬！'
      ],
      '南方北方': [
        '🌏 南北年画差异大对比！\n\n🔵 北方年画：\n• 杨柳青：细腻精美\n• 杨家埠：粗犷豪放\n• 朱仙镇：古朴厚重\n→ 色彩浓烈，构图饱满\n\n🟢 南方年画：\n• 桃花坞：清新雅致\n• 绵竹：明快活泼\n→ 线条细腻，色彩柔和\n\n😊 一方水土养一方年画！',
        '❄️🌞 气候也影响年画风格：\n\n北方冬天冷，屋里烧炕——\n需要浓烈的红色看着才暖和！\n\n南方湿润四季绿——\n色彩可以更雅致细腻~\n\n年画就是各地民风的镜子！'
      ],
      '过年': [
        '🏮 过年贴年画是老祖宗传下来的！\n\n年画习俗：\n• 贴门神：腊月二十八或二十九\n• 贴春联：除夕当天\n• 贴福字：倒着贴，寓意"福到"\n\n🎉 年画要贴新不贴旧，辞旧迎新！',
        '🧧 除夕贴年画的顺序：\n\n1️⃣ 先贴大门（门神镇宅）\n2️⃣ 再贴内门（福禄寿）\n3️⃣ 然后贴墙壁（胖娃娃）\n4️⃣ 最后贴窗户（花卉鸟虫）\n\n📍 贴的时候要说吉祥话，讨个好彩头~'
      ],
      '阴刻': [
        '🔪 阴刻就像"地上挖沟"！\n\n技法：把线条部分挖掉，留下空白\n\n效果：印出来是白线黑底\n\n✨ 就像剪纸一样，有点像碑刻拓片\n\n老艺人说：阴刻适合表现沉稳庄重的题材~',
        '📜 阴刻年画的代表：\n\n朱仙镇门神就是典型的阴刻！\n\n白线黑底，线条粗犷有力。\n看着特别有年代感和力量感！\n\n这种技法要求艺人刀工精准，一刀都不能修~'
      ],
      '阳刻': [
        '🔪 阳刻就像"地上起墙"！\n\n技法：把空白部分挖掉，留下线条\n\n效果：印出来是黑线白底\n\n✨ 就像木刻版画，线条清晰\n\n老艺人说：阳刻适合表现活泼生动的题材~',
        '🎨 阳刻年画的代表：\n\n桃花坞和杨柳青多用阳刻！\n\n黑线白底，人物形象生动。\n线条细腻流畅，特别精致！\n\n这种技法难度在于要保持线条连贯不断~'
      ],
      '套印': [
        '🎨 套印就是"一层层叠加"！\n\n步骤：\n1️⃣ 刻好一套版（每色一块版）\n2️⃣ 第一版印轮廓\n3️⃣ 第二版印底色\n4️⃣ 第三版印细节...\n\n💡 一张复杂的年画可能需要十几块版！',
        '🌈 套印的色彩奥秘：\n\n传统年画最多用五种颜色：\n红、黄、绿、紫、茶（赭石）\n\n这叫"木版年画五原色"！\n\n五种颜色叠加变化，能印出几十种色调~'
      ],
      '怎么': [
        '🤔 您想知道怎么做年画吗？\n\n木版年画制作分五步：\n1️⃣ 绘稿——画师创作\n2️⃣ 刻版——刻在梨木上\n3️⃣ 上墨——刷颜料\n4️⃣ 套印——一张张印\n5️⃣ 彩绘——手工上色\n\n😊 整个过程纯手工，很考验功力！\n\n想了解哪一步的详情呢？'
      ],
      '起源': [
        '📜 年画起源于"门神画"！\n\n最早的记载：\n• 西汉《山海经》里说神荼、郁垒守门\n• 用桃木板画上神像挂门上\n\n这可是年画的"老祖宗"！\n\n🎊 到宋代活字印刷发明，年画才真正普及开来~',
        '🏮 年画名字的由来：\n\n"年画"这个名字是清道光年间才有的！\n\n之前叫"纸画"、"画贴"、"欢乐图"...\n\n因为过年时贴，所以叫"年画"~\n\n这个叫法一直沿用至今！'
      ],
      '梨木': [
        '🪵 梨木是刻年画版的首选！\n\n为什么用梨木？\n• 纹理细腻，不容易开裂\n• 硬度适中，好刻好印\n• 耐磨损，能印几万张\n\n老艺人用的都是几十年甚至上百年的老梨木~',
        '🌳 梨木版的讲究：\n\n1️⃣ 选材：要用秋天砍的梨木，水分少\n2️⃣ 阴干：砍下来要放两三年才能用\n3️⃣ 打磨：表面要磨得特别光滑\n\n一块好版可以用几十年甚至上百年！\n这也是老版年画能保存到现在的原因~'
      ],
      '灶王爷': [
        '🧞 灶王爷是家里的"监督员"！\n\n传说灶王爷腊月二十三上天汇报：\n• 这一家人做了多少好事\n• 说了多少坏话\n\n所以这天要"祭灶"——\n用糖瓜粘住灶王爷的嘴，甜言蜜语上天~',
        '🍬 祭灶习俗：\n\n• 时间：腊月二十三（小年）\n• 供品：糖瓜、清水、草料\n• 动作：烧香磕头，灶王爷上天\n\n😊 灶王爷画像两边还有对联：\n"上天言好事，下界保平安"'
      ],
      '鲤鱼': [
        '🐟 鲤鱼在年画里超常见！\n\n寓意：\n• "鲤鱼跃龙门"——学业进步、飞黄腾达\n• "连年有余"——生活富足、富贵有余\n• "鱼戏莲"——夫妻和睦、子孙满堂\n\n😊 鲤鱼=多子多福、富贵有余！',
        '🎏 年画里的大鲤鱼超可爱！\n\n特点：\n• 金色或红色，闪闪发光\n• 圆润饱满，看着就喜庆\n• 嘴边吐着水花\n\n为什么是鲤鱼不是别的鱼？\n因为"鲤"谐音"利"，寓意大吉大利！'
      ],
      '保护': [
        '🏛️ 木版年画是国家级非遗！\n\n保护现状：\n• 2006年列入首批国家级非遗名录\n• 全国建了多个年画博物馆\n• 老艺人们被认定为传承人\n\n🎉 各地还开设了年画体验课，让更多人了解这门手艺！',
        '📚 年画保护的挑战：\n\n现在面临的问题：\n• 老艺人年事已高\n• 年轻人不愿意学\n• 传统市场萎缩\n• 机器印刷冲击\n\n但也有好消息：\n数字化保护、创意衍生品、网络传播...\n让年画有了新的生命！'
      ],
      '怎么贴': [
        '📍 年画贴哪里有讲究！\n\n• 大门——武门神（秦琼、尉迟恭）\n• 院门——钟馗（驱邪镇宅）\n• 客厅——福禄寿三星\n• 卧室——送子娘娘或胖娃娃\n• 厨房——灶王爷\n• 书房——一品清廉（荷花）\n\n😊 贴对位置才能招福纳祥！',
        '⚠️ 贴年画的禁忌：\n\n1️⃣ 门神要脸朝外，不能朝里\n2️⃣ 福字要贴正，不能倒贴（除了大门外）\n3️⃣ 年画破了要及时换\n4️⃣ 不要贴太矮，要高于身高\n\n这些都是老辈人传下来的规矩~'
      ],
      '怎么保存': [
        '📦 年画保存有技巧！\n\n保存方法：\n• 避免阳光直射（会褪色）\n• 保持干燥（防潮防霉）\n• 不要折叠（会留下折痕）\n• 最好装裱起来\n\n💡 老版年画年代久远，更要注意保护！',
        '🔍 如何鉴别老版年画：\n\n1️⃣ 看纸张：老纸偏黄，有年代感\n2️⃣ 看颜色：天然颜料不鲜艳但持久\n3️⃣ 看墨色：老版墨色沉稳不浮躁\n4️⃣ 看刀痕：手工刻版有刀味，机器没有\n\n😊 有机会可以去博物馆看看真品！'
      ],
      '胖娃娃抱鲤鱼': [
        '👶🐟 "胖娃娃抱鲤鱼"是年画里的经典！\n\n画面：圆滚滚的娃娃抱着金色大鲤鱼\n\n寓意：\n• 胖娃娃——多子多福\n• 鲤鱼——年年有余\n• 合起来——连年有余、富贵满堂\n\n🎊 这是杨柳青年画最有名的题材！',
        '🎨 胖娃娃为啥都光溜溜的？\n\n在传统观念里：\n• 胖=富态=有福气\n• 光屁股=赤子之心=纯粹\n• 红肚兜=兜住福气\n\n😊 看着喜庆可爱，寓意又好，难怪成为年画经典！'
      ],
      '一团和气': [
        '😊 "一团和气"是桃花坞年画的招牌！\n\n画面：一个圆脸娃娃，笑眯眯的，双手捧着"一团和气"的字\n\n寓意：\n• 和气生财\n• 和和美美\n• 家庭和睦\n\n📜 这个题材流行了两百多年！',
        '🎨 "一团和气"的故事：\n\n据说这个形象源自一个传说——\n\n有个老汉家里总是吵架，\n后来请人画了这幅画挂墙上，\n看着看着心态就平和了，\n家里也越来越和睦~\n\n😊 所以这幅画寓意"和气生财、家和万事兴"！'
      ],
      '钟馗': [
        '👹 钟馗是年画里的"捉鬼大师"！\n\n形象：\n• 相貌威武（有点吓人）\n• 豹头环眼，铁面虬鬓\n• 手持宝剑，专门打鬼\n\n寓意：驱邪镇宅、保家平安\n\n🎊 端午节和春节都会贴钟馗！',
        '📜 钟馗的故事：\n\n钟馗是唐朝人，相貌丑陋但才华横溢。\n\n参加科举，皇帝嫌他丑不让当状元。\n钟馗一气之下撞台阶死了！\n\n后来皇帝做梦，钟馗说要把天下的鬼都抓光...\n\n从此，钟馗就成了"捉鬼大师"！'
      ],
      '神话': [
        '📚 年画里的神话人物超多！\n\n常见的神话题材：\n• 八仙过海——寓意各显神通\n• 哪吒闹海——寓意战胜困难\n• 牛郎织女——寓意爱情美满\n• 嫦娥奔月——寓意美好向往\n\n😊 这些故事都是老百姓喜闻乐见的~',
        '🎭 年画里的戏曲故事：\n\n传统戏曲是年画的重要题材！\n\n• 《白蛇传》——爱情故事\n• 《杨家将》——忠勇故事\n• 《西游记》——取经故事\n• 《水浒传》——英雄故事\n\n一幅年画就是一个故事，看画讲给孩子听~'
      ],
      '节日': [
        '🏮 不同节日贴不同年画！\n\n• 春节——门神、胖娃娃\n• 端午节——钟馗、天师\n• 中秋节——嫦娥、月饼\n• 婚嫁——送子娘娘、鸾凤和鸣\n• 祝寿——福禄寿三星\n\n📅 年画是中国人生活的一部分！',
        '🎊 过年贴年画的仪式感：\n\n小时候最期待的就是：\n• 跟爸爸一起贴春联\n• 帮妈妈糊年画\n• 贴好了放鞭炮庆祝\n\n🧧 现在城市里年味淡了，但贴年画的传统不能丢！\n这是我们文化的根~'
      ],
      '鉴别': [
        '🔍 鉴别年画有窍门！\n\n看四个方面：\n1️⃣ 纸张：老纸泛黄、偏薄\n2️⃣ 墨色：沉稳不浮躁\n3️⃣ 刀痕：手工刻版有韵味\n4️⃣ 颜料：天然色柔和不刺眼\n\n💡 最重要的是多看多比较！',
        '📚 传统年画vs现代印刷品：\n\n传统木版年画：\n• 手工刻版，一刀一刀\n• 天然颜料，色彩温润\n• 手工拓印，边缘略有毛边\n\n现代印刷年画：\n• 机器印刷，边缘整齐\n• 化学颜料，色彩鲜艳\n• 批量生产，千篇一律\n\n😊 一对比就知道区别了！'
      ],
      '文化': [
        '🏮 年画是中国文化的"活化石"！\n\n年画里藏着：\n• 老百姓的审美趣味\n• 传统的吉祥寓意\n• 民俗信仰和生活习俗\n• 民间文学和戏曲故事\n\n📚 看一张年画，就像打开了一扇窗，看到过去人们的生活~',
        '🎨 年画是"百科全书"：\n\n内容涵盖：\n• 历史故事（杨家将、封神演义）\n• 神话传说（八仙、哪吒）\n• 吉祥图案（蝙蝠、牡丹）\n• 民俗风情（过年、婚嫁）\n• 花卉鸟虫（梅兰竹菊）\n\n😊 可以说，年画就是中国民间文化的缩影！'
      ],
      '特点': [
        '🎨 年画的特点就是"喜"！\n\n• 色彩喜庆——红红火火\n• 构图饱满——热热闹闹\n• 寓意吉祥——都是好彩头\n• 造型夸张——生动有趣\n\n😊 看着就让人开心！',
        '🌟 年画和普通绘画不一样：\n\n• 题材有讲究——都是吉祥图案\n• 色彩有套路——红黄为主\n• 功能性强——不只是欣赏，还要祈福\n• 批量生产——让普通人家也能享用\n\n📜 年画是"为老百姓服务的艺术"！'
      ],
      '区别': [
        '🔍 年画、手绘年画、现代年画大不同！\n\n📜 木版年画：\n• 用木版印刷\n• 手工制作\n• 天然颜料\n• 独一无二\n\n✏️ 手绘年画：\n• 直接用笔画\n• 没有版\n• 费时费力\n\n🖨️ 现代印刷年画：\n• 机器印刷\n• 批量生产\n• 价格便宜\n• 没有手工味\n\n😊 木版年画最珍贵！',
        '🎭 年画和春联不一样！\n\n• 春联——文字对联，贴在门框上\n• 年画——图画，贴在门、墙、窗户上\n\n两者搭配，春节气氛才完整！'
      ],
      '价值': [
        '💎 木版年画价值连城！\n\n价值体现：\n• 艺术价值——民间美术精品\n• 历史价值——民俗文化的活化石\n• 工艺价值——精湛的传统技艺\n• 收藏价值——老版年画越来越珍贵\n\n🏆 博物馆都抢着收藏！',
        '📈 年画收藏有讲究：\n\n• 清代以前的老版——价值最高\n• 民国时期——也有收藏价值\n• 新中国成立后——反映时代特色\n• 名家作品——升值潜力大\n\n💡 收藏年画不仅是投资，更是保护非遗！'
      ]
    };

    // 匹配关键词（按优先级）
    for (const [keyword, responses] of Object.entries(keywordResponses)) {
      if (input.includes(keyword.toLowerCase())) {
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }

    // 模糊匹配
    if (input.includes('年画')) {
      const responses = [
        '🎨 年画是中国传统文化的重要组成部分！\n\n它不仅是一张画，更承载着：\n• 驱邪祈福的美好愿望\n• 精湛的民间艺术技艺\n• 丰富多彩的民俗故事\n\n您想了解哪方面的年画知识呢？可以问我流派、历史、制作工艺、吉祥寓意等~',
        '😊 您问的是年画呀！\n\n年画是中国特有的民间艺术，过年时贴在门上、墙上，寓意吉祥。\n\n全国有六大年画产地，各有特色。您最感兴趣的是哪个流派呢？',
        '🏮 年画年画，"年"和"画"结合的艺术！\n\n每到过年，家家户户贴年画，热闹喜庆。\n\n年画上的图案都有讲究——门神保平安，胖娃娃送福气，牡丹象征富贵...\n\n您想深入了解什么呢？'
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // 默认回复
    return '🤔 我听不太懂您的问题呢~ \n\n您可以问我：\n• 年画流派（杨柳青、桃花坞、杨家埠、朱仙镇、绵竹、武强）\n• 制作工艺（刻版、套印、彩绘）\n• 吉祥寓意（门神、福禄寿、胖娃娃）\n• 民俗故事（过年、祭灶、门神典故）\n• 历史起源、传承保护、保存鉴别\n\n或者输入【趣味答题】测试年画知识！';
  };

  // 发送消息 - 调用大模型API
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userInput = inputValue.trim();
    
    // 先检查是否是答题相关的输入
    if (processUserInput(userInput)) {
      setInputValue('');
      return;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // 创建助手消息占位
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true
    }]);
    
    try {
      // 调用大模型API
      const response = await fetch('/api/heritage-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userInput,
          history: [
            ...(tourContext ? [{ role: 'user', content: '文化伴游照片识别上下文：' + tourContext.title + '；元素：' + tourContext.elements.join('、') + '；整体说明：' + tourContext.overview + '；可见细节：' + tourContext.observations.join('；') + '；文化解释：' + tourContext.interpretations.join('；') + '；判断边界：' + tourContext.uncertainty }] : []),
            ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error('API 请求失败');
      }
      
      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                // 提取文本内容
                if (parsed.delta?.content) {
                  fullContent += parsed.delta.content;
                  // 更新消息内容
                  setMessages(prev => prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, content: fullContent }
                      : m
                  ));
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }
      
      // 流式结束，标记完成
      setMessages(prev => prev.map(m => 
        m.id === assistantMessageId 
          ? { ...m, isStreaming: false }
          : m
      ));
      
    } catch (error) {
      console.error('调用大模型失败:', error);
      // 失败时使用本地回复
      const fallbackResponse = generateResponse(userInput);
      setMessages(prev => prev.map(m => 
        m.id === assistantMessageId 
          ? { ...m, content: fallbackResponse, isStreaming: false }
          : m
      ));
    } finally {
      setIsTyping(false);
    }
  };

  // 开始答题
  const startQuiz = () => {
    const randomQuestion = QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)];
    setCurrentQuiz(randomQuestion);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: `🎯 趣味答题开始！\n\n${randomQuestion.question}\n\n${randomQuestion.options.join('\n')}\n\n请回复 A/B/C/D 答题~`,
      type: 'quiz'
    }]);
  };

  // 处理答题回复
  const handleQuizAnswer = (answer: string) => {
    if (!currentQuiz) return;
    
    const isCorrect = answer.toUpperCase() === currentQuiz.answer;
    const newScore = {
      correct: quizScore.correct + (isCorrect ? 1 : 0),
      total: quizScore.total + 1
    };
    setQuizScore(newScore);
    
    const feedback = isCorrect 
      ? '🎉 回答正确！太棒了！' 
      : `😅 回答错误~ 正确答案是 ${currentQuiz.answer}！\n\n${currentQuiz.explanation}`;
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: feedback + '\n\n想继续答题吗？输入"再来一题"继续~',
      type: 'text'
    }]);
    
    setCurrentQuiz(null);
  };

  // 处理用户输入（检查是否是答题）
  const processUserInput = useCallback((input: string) => {
    // 如果当前有题目在等待回答
    if (currentQuiz) {
      const answer = input.trim().toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(answer)) {
        handleQuizAnswer(answer);
        return true;
      }
    }
    // 检查是否要继续答题
    if (input.includes('再来') || input.includes('继续答题') || input.includes('下一题')) {
      startQuiz();
      return true;
    }
    return false;
  }, [currentQuiz, quizScore]);

  const addLatestAnswerToTask = async () => {
    if (!taskId) return;
    const answer = [...messages].reverse().find(item => item.role === 'assistant' && item.id !== 'welcome');
    if (!answer) return;
    const topic = CORE_CONTENT.find(item => item.id === selectedTopic)?.title || '非遗文化知识';
    await addCreativeTaskMaterial(taskId, { id: 'heritage-' + Date.now(), title: topic, source: 'heritage', elements: [topic], culture: toPlainChatText(answer.content), createdAt: Date.now() });
    await mergeCreativeTaskCulture(taskId, [topic], [], [toPlainChatText(answer.content).slice(0, 100)]);
    await updateCreativeTaskStep(taskId, 'heritage', 'completed');
    setMessages(current => [...current, { id: String(Date.now()), role: 'assistant', content: '这条文化知识已经加入当前创作任务，后续创作页面会继续使用。' }]);
  };

  return (
    <div style={styles.container}>
      {/* 页面标题 */}
      <div style={styles.pageHeader}>
        {tourContext
          ? <a href="/culture-tour" style={{ position: 'absolute', left: 22, top: 20, padding: '9px 14px', color: '#fff', background: 'rgba(255,255,255,.17)', border: '1px solid rgba(255,255,255,.35)', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>← 返回文化伴游</a>
          : <WorkbenchBackButton />}
        <h1 style={styles.pageTitle}>📖 非遗科普小课堂</h1>
        <p style={styles.pageSubtitle}>木版年画 · 传承千年 · 知识科普</p>
      </div>
      <TaskContextBar taskId={taskId || undefined} />

      {creativeTask && <section style={{ maxWidth: 1200, margin: '14px auto 0', padding: '12px 16px', borderRadius: 12, background: '#fff8ee', border: '1px solid #e9cdb5', color: '#6b4034' }}>
        <strong>正在为“{creativeTask.title}”查找文化依据</strong>
        <span style={{ marginLeft: 10, color: '#907569' }}>问答记录会在本页连续保留，可把满意的结论加入任务。</span>
      </section>}

      {tourContext && <section style={{ maxWidth: 1200, margin: '18px auto 0', padding: 16, display: 'flex', gap: 16, alignItems: 'center', background: '#fff8ee', border: '1px solid #e9cdb5', borderRadius: 14 }}>
        {tourPhoto && <img src={tourPhoto} alt="文化伴游上传照片" style={{ width: 118, height: 88, objectFit: 'cover', borderRadius: 10 }} />}
        <div style={{ minWidth: 0 }}>
          <strong style={{ color: '#7e2c26' }}>已接续文化伴游照片记忆：{tourContext.title}</strong>
          <p style={{ margin: '7px 0', color: '#6f5b52', lineHeight: 1.6 }}>{tourContext.overview}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{tourContext.elements.map(item => <span key={item} style={{ padding: '4px 8px', color: '#923d33', background: '#f5dfcf', borderRadius: 999, fontSize: 12 }}>{item}</span>)}</div>
        </div>
      </section>}
      {/* 上部：核心内容板块 - 横向Tab切换布局 */}
      <div style={styles.contentSection}>
        {/* Tab标签栏 */}
        <div style={styles.tabBar}>
          {CORE_CONTENT.map((content) => (
            <button
              key={content.id}
              style={{
                ...styles.tabButton,
                ...(selectedTopic === content.id ? {
                  ...styles.tabButtonActive,
                  borderBottomColor: content.color,
                  color: content.color
                } : {})
              }}
              onClick={() => {
                setSelectedTopic(content.id);
              }}
            >
              <span style={styles.tabIcon}>{content.icon}</span>
              <span style={styles.tabTitle}>{content.title}</span>
            </button>
          ))}
        </div>

        {/* Tab内容区 */}
        <div style={styles.tabContent}>
          {CORE_CONTENT.filter(c => c.id === selectedTopic).map((content) => (
            <div key={content.id} style={styles.contentCardFull}>
              <div style={styles.contentCardHeader}>
                <h2 style={{...styles.contentCardHeaderTitle, color: content.color}}>
                  {content.icon} {content.title}
                </h2>
                <p style={styles.contentCardHeaderSubtitle}>{content.subtitle}</p>
              </div>
              <div style={styles.contentCardBody}>
                {content.sections.map((section, sectionIdx) => (
                  <div key={sectionIdx} style={styles.sectionBlock}>
                    <h4 style={styles.sectionTitle}>{section.title}</h4>
                    <pre style={styles.sectionContent}>{section.content}</pre>
                    <div style={styles.keywordRow}>
                      {section.keywords.map((kw, kwIdx) => (
                        <span key={kwIdx} style={styles.keywordTag}>{kw}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 下部：问答互动区 */}
      <div style={styles.chatSection}>
        <div style={styles.chatContainer}>
          {/* 快捷指令区 */}
          <div style={styles.quickCommands}>
            <span style={styles.quickLabel}>快捷指令：</span>
            <div style={styles.quickButtons}>
              {Object.keys(QUICK_COMMANDS).slice(0, 6).map(cmd => (
                <button 
                  key={cmd} 
                  style={styles.quickButton}
                  onClick={() => {
                    const topicId = QUICK_COMMANDS[cmd];
                    if (cmd === '趣味答题') {
                      startQuiz();
                    } else {
                      setSelectedTopic(topicId);
                      setExpandedCards(prev => 
                        prev.includes(topicId) ? prev : [...prev, topicId]
                      );
                    }
                  }}
                >
                  【{cmd}】
                </button>
              ))}
            </div>
          </div>

          {/* 对话区域 */}
          <div style={styles.chatArea}>
            <div style={styles.chatHeader}>
              <h3 style={styles.chatTitle}>💬 年画问答助手</h3>
              <span style={styles.chatHint}>问我任何关于年画的问题</span>
            </div>

            <div style={styles.messagesContainer}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    ...styles.messageWrapper,
                    ...(msg.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper)
                  }}
                >
                  {msg.role === 'assistant' && <div style={styles.avatar}>🤖</div>}
                  <div style={{
                    ...styles.messageBubble,
                    ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble)
                  }}>
                    <p style={styles.messageText}>{msg.role === 'assistant' ? toPlainChatText(msg.content) : msg.content}</p>
                  </div>
                  {msg.role === 'user' && <div style={styles.userAvatar}>👤</div>}
                </div>
              ))}

              {isTyping && (
                <div style={styles.messageWrapper}>
                  <div style={styles.avatar}>🤖</div>
                  <div style={styles.typingBubble}>
                    <span style={styles.typingDot1}>●</span>
                    <span style={styles.typingDot2}>●</span>
                    <span style={styles.typingDot3}>●</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={styles.inputArea}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="问我年画相关的问题，或输入【趣味答题】..."
                style={styles.input}
              />
              <button style={styles.sendButton} onClick={handleSendMessage}>
                发送
              </button>
            </div>
            {taskId && <button type="button" onClick={() => void addLatestAnswerToTask()} style={{ marginTop: 10, padding: '9px 14px', border: '1px solid #b86450', borderRadius: 9, background: '#fff8f1', color: '#8b332c', fontWeight: 700 }}>加入当前创作</button>}
          </div>

          {/* 答题战绩 */}
          {quizScore.total > 0 && (
            <div style={styles.scoreCard}>
              <div style={styles.scoreIcon}>🏆</div>
              <div style={styles.scoreInfo}>
                <span style={styles.scoreLabel}>答题战绩</span>
                <span style={styles.scoreValue}>{quizScore.correct} / {quizScore.total}</span>
              </div>
              <span style={styles.scorePercent}>
                {Math.round((quizScore.correct / quizScore.total) * 100)}%正确
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 样式
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fdf6e3 0%, #fef9f3 50%, #fff8dc 100%)',
    padding: '20px',
  },
  pageHeader: {
    textAlign: 'center' as const,
    marginBottom: '30px',
    padding: '25px',
    background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(196, 30, 58, 0.3)',
    maxWidth: '1400px',
    margin: '0 auto 30px',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '15px',
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '8px',
    color: 'white',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'Georgia, "Songti SC", serif',
  },
  pageTitle: {
    margin: 0,
    fontSize: '28px',
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'Georgia, "Songti SC", serif',
  },
  pageSubtitle: {
    margin: '8px 0 0 0',
    fontSize: '15px',
    color: 'rgba(255,255,255,0.85)',
  },
  // 上部内容区样式
  contentSection: {
    maxWidth: '1400px',
    margin: '0 auto 30px',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  contentCard: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '2px solid #e8d4c4',
    borderTop: '4px solid',
    overflow: 'hidden',
  },
  contentCardSelected: {
    boxShadow: '0 8px 30px rgba(196, 30, 58, 0.15)',
    borderColor: '#c41e3a',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '18px',
    cursor: 'pointer',
    background: '#fffaf5',
    borderBottom: '1px solid #f0e6dc',
  },
  cardIcon: {
    fontSize: '32px',
  },
  cardTitleArea: {
    flex: 1,
  },
  cardTitle: {
    margin: 0,
    fontSize: '16px',
    color: '#5d3a1a',
    fontWeight: 'bold',
  },
  cardSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#888',
  },
  cardArrow: {
    fontSize: '12px',
    color: '#c41e3a',
  },
  cardBody: {
    maxHeight: '500px',
    overflow: 'auto',
    padding: '15px',
  },
  sectionBlock: {
    marginBottom: '20px',
    padding: '15px',
    background: '#fafafa',
    borderRadius: '12px',
    border: '1px solid #f0e6dc',
  },
  sectionTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#c41e3a',
    fontWeight: 'bold',
  },
  sectionContent: {
    margin: 0,
    fontSize: '13px',
    color: '#555',
    lineHeight: 1.8,
    fontFamily: 'Georgia, "Songti SC", serif',
    whiteSpace: 'pre-wrap' as const,
  },
  keywordRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginTop: '10px',
  },
  keywordTag: {
    padding: '3px 10px',
    background: '#fff9f0',
    border: '1px solid #e8d4c4',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#8b5a2b',
  },
  // Tab切换样式
  tabBar: {
    display: 'flex',
    gap: '8px',
    padding: '15px 20px',
    background: 'white',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '2px solid #e8d4c4',
    borderBottom: 'none',
    overflowX: 'auto',
    flexWrap: 'nowrap',
  },
  tabButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '12px 20px',
    background: '#fff9f0',
    border: 'none',
    borderRadius: '12px',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: '120px',
  },
  tabButtonActive: {
    background: 'white',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  tabIcon: {
    fontSize: '24px',
  },
  tabTitle: {
    fontSize: '13px',
    fontWeight: 'bold' as const,
    color: '#5d3a1a',
    fontFamily: '"Songti SC", Georgia, serif',
    whiteSpace: 'nowrap' as const,
  },
  tabContent: {
    background: 'white',
    borderRadius: '0 0 16px 16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '2px solid #e8d4c4',
    borderTop: 'none',
    minHeight: '400px',
    maxHeight: '600px',
    overflow: 'auto',
  },
  contentCardFull: {
    padding: '25px',
  },
  contentCardHeader: {
    textAlign: 'center' as const,
    marginBottom: '25px',
    padding: '20px',
    background: 'linear-gradient(135deg, #fff9f0 0%, #fff5e6 100%)',
    borderRadius: '12px',
    border: '2px solid #e8d4c4',
  },
  contentCardHeaderTitle: {
    margin: '0 0 8px 0',
    fontSize: '22px',
    fontWeight: 'bold',
    fontFamily: 'Georgia, "Songti SC", serif',
  },
  contentCardHeaderSubtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#888',
  },
  contentCardBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  // 下部问答区样式
  chatSection: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  chatContainer: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '2px solid #e8d4c4',
    overflow: 'hidden',
  },
  quickCommands: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px 20px',
    background: '#fffaf5',
    borderBottom: '1px solid #f0e6dc',
    flexWrap: 'wrap' as const,
  },
  quickLabel: {
    fontSize: '14px',
    color: '#5d3a1a',
    fontWeight: 'bold',
  },
  quickButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  quickButton: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  chatArea: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '450px',
  },
  chatHeader: {
    padding: '15px 20px',
    borderBottom: '1px solid #f0e6dc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatTitle: {
    margin: 0,
    fontSize: '16px',
    color: '#5d3a1a',
    fontWeight: 'bold',
  },
  chatHint: {
    fontSize: '12px',
    color: '#888',
  },
  messagesContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  },
  messageWrapper: {
    display: 'flex',
    marginBottom: '15px',
    alignItems: 'flex-end',
  },
  userMessageWrapper: {
    flexDirection: 'row-reverse' as const,
  },
  assistantMessageWrapper: {
    flexDirection: 'row' as const,
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#f0e6dc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: '16px',
    margin: '0 10px',
  },
  userBubble: {
    background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    background: '#f5f5f5',
    color: '#333',
    borderBottomLeftRadius: '4px',
  },
  messageText: {
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.6,
    fontFamily: 'Georgia, "Songti SC", serif',
    whiteSpace: 'pre-wrap' as const,
  },
  typingBubble: {
    display: 'flex',
    gap: '4px',
    padding: '12px 16px',
    background: '#f5f5f5',
    borderRadius: '16px',
    marginLeft: '10px',
  },
  typingDot1: {
    color: '#c41e3a',
    animation: 'bounce 1s infinite 0s',
  },
  typingDot2: {
    color: '#c41e3a',
    animation: 'bounce 1s infinite 0.2s',
  },
  typingDot3: {
    color: '#c41e3a',
    animation: 'bounce 1s infinite 0.4s',
  },
  inputArea: {
    display: 'flex',
    gap: '10px',
    padding: '15px 20px',
    borderTop: '1px solid #f0e6dc',
    background: '#fffaf5',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '2px solid #e8d4c4',
    borderRadius: '24px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  scoreCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px 20px',
    background: '#fff9f0',
    borderTop: '1px solid #f0e6dc',
  },
  scoreIcon: {
    fontSize: '28px',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
  },
  scoreValue: {
    fontSize: '18px',
    color: '#c41e3a',
    fontWeight: 'bold',
  },
  scorePercent: {
    fontSize: '14px',
    color: '#8b5a2b',
    fontWeight: 'bold',
  },
};



