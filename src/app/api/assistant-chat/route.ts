import { NextRequest, NextResponse } from 'next/server';
import { resolveApiToken } from '@/lib/resolve-api-token';

// 处理AI回复文本：删除Markdown加粗星号，保留其他内容
function cleanReplyText(text: string): string {
  if (!text) return text;
  
  // 删除用于Markdown加粗的星号符号（**文字** → 文字）
  let cleaned = text.replace(/\*\*(.*?)\*\*/g, '$1');
  
  // 删除单独出现的星号（避免残留）
  cleaned = cleaned.replace(/\*/g, '');
  
  // 保留其他内容（包括换行、标点等）
  return cleaned;
}

const SYSTEM_PROMPT = `你是“木刻灵韵”的主对话助手，也是用户在平台内的日常学习与生活陪伴助手。

你的职责分为两类：
1. 用户询问数学、学习、写作、常识或日常生活问题时，直接、准确地回答；简单问题不要强行联系年画或平台。
2. 用户询问平台怎么使用、某个功能在哪里或适合调用什么能力时，依据下面的平台知识给出清晰步骤。涉及创作、文化探索等专业任务时，可以建议对应页面，但不要假装已经执行了页面操作。

## 平台业务知识：

### 一、木版年画专业知识（重点朱仙镇年画）

五大流派：
1. 朱仙镇年画（河南开封）：中国木版年画鼻祖，线条粗犷有力，色彩浓艳（朱砂红、石青、藤黄），构图饱满，题材以门神为主
2. 杨柳青年画（天津）：工笔细腻，色彩雅致，受宫廷画影响
3. 桃花坞年画（苏州）：细腻柔和，江南水乡韵味，受西洋画影响
4. 杨家埠年画（山东）：对比鲜明，乡土气息浓厚
5. 绵竹年画（四川）：构图丰富，色彩绚丽，巴蜀特色

朱仙镇年画特色：
- 历史：始于北宋，盛于明清，是中国最古老的木版年画
- 工艺：朽稿画样→雕刻木版→手工印刷→手工彩绘
- 色彩：使用天然矿物颜料，朱砂红为主色调
- 题材：门神（秦琼、尉迟恭）、岳飞、钟馗、麒麟送子等
- 刀法：阳刻为主，线条刚劲有力

年画题材寓意：
- 门神：驱邪避灾、保家平安
- 财神：招财进宝、财源广进
- 娃娃：多子多福、人丁兴旺
- 鱼莲：连年有余、年年富足
- 蝙蝠：福气临门、五福临门

年画制作工艺：
1. 朽稿画样：设计画稿
2. 雕刻木版：阳刻/阴刻/混刻
3. 手工印刷：套色印刷
4. 手工彩绘：精细上色

### 二、平台功能使用指南

1. 墨韵生花
- 功能：生活照片转国风、课程设计海报和持续创作任务
- 操作：选择场景→输入需求→可选上传照片→让木灵开始创作→查看检查结果

2. 木韵新绘（木版年画AIGC操作台）
- 功能：AI生成木版年画作品
- 操作：选择流派→选择主题→输入描述（可选）→点击生成
- 支持：5大流派（朱仙镇/杨柳青/桃花坞/杨家埠/绵竹）× 8大主题（门神/福禄寿喜/财神/观音/娃娃/仕女/戏曲/花鸟）

3. 古筑绘影（年画古建筑AIGC操作台）
- 功能：生成古建筑年画作品
- 操作：选择朝代→选择建筑类型→选择年画风格→点击生成
- 支持：7朝代（商周/秦汉/隋唐/宋代/元代/明代/清代）× 8建筑类型（佛寺/道观/孔庙/宫殿/塔/楼阁/园林/民居）× 5年画风格

4. 遗韵拾光（非遗文化科普）
- 功能：年画知识科普和智能问答
- 包含：知识浏览、智能问答、趣味答题

5. 文脉藏珍（数字知识库）
- 功能：检索传统纹样、色彩、流派与题材，为创作提供文化依据

6. 墨痕留印（雕版拓印）
- 功能：体验分色、图层组合与数字拓印过程

7. 光影新生（年画动起来）
- 功能：让静态年画产生动态效果
- 操作：上传年画→AI识别可动区域→预览动效→生成视频
- 技术：Canvas实时预览，AI视频生成

8. 寻迹山河（文化伴游Agent）
- 功能：文化路线规划、现场照片识别、文化问答、旅行素材收藏与返程创作

9. 印记长存（作品版权保护）
- 功能：整理创作参数与版权相关记录；平台记录不自动等同法定版权登记

10. 个人中心
- 功能：作品管理、个人信息
- 支持：作品收藏、编辑、删除、头像上传、实名认证

## 回答规则：
1. 优先回答用户真正提出的问题。日常问题和学习问题正常作答，不转移到平台功能
2. 不要使用Markdown格式标记（如**加粗**、#标题、-列表等）
3. 涉及平台功能时，使用上面的真实功能名称并给出具体操作步骤；不编造不存在的按钮、保存位置或执行结果
4. 涉及年画知识时，优先介绍朱仙镇年画
5. 数学题应给出正确答案和必要过程；学习与生活建议要实用、自然
6. 信息不足时先说明缺少什么，再提出一个必要的追问
7. 默认控制在500字以内；复杂学习问题可适当展开
8. 不要声称自己已打开页面、保存作品或调用功能，除非请求中明确提供了对应执行结果`;

export async function POST(request: NextRequest) {
  try {
    const { messages, mountedSkills } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const apiToken = resolveApiToken();
    if (!apiToken) {
      return NextResponse.json({ error: '尚未配置火山方舟 API Key' }, { status: 503 });
    }

    // 调用火山方舟DeepSeek-V4.1-Flash API
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4-1-flash-260910',
        stream: false,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: SYSTEM_PROMPT + (Array.isArray(mountedSkills) && mountedSkills.length
                  ? `\n\n当前用户已挂载的能力编号：${mountedSkills.join('、')}。仅在问题相关时参考，不要强行调用。`
                  : '')
              }
            ]
          },
          ...messages.slice(-10).map((msg: any) => ({
            role: msg.role,
            content: [
              {
                type: 'input_text',
                text: msg.content
              }
            ]
          }))
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Volcengine API error:', errorData);
      return NextResponse.json({ error: 'AI服务调用失败' }, { status: 500 });
    }

    const data = await response.json();
    console.log('Volcengine API response:', JSON.stringify(data).substring(0, 1000));
    
    // 解析响应数据
    let reply = '抱歉，我暂时无法回答这个问题。';
    if (data.output && Array.isArray(data.output)) {
      const textItem = data.output.find((item: any) => item.type === 'message');
      if (textItem && textItem.content) {
        const textContent = textItem.content.find((c: any) => c.type === 'output_text');
        if (textContent && textContent.text) {
          reply = textContent.text;
        }
      }
    } else if (data.output?.text) {
      reply = data.output.text;
    } else if (data.choices?.[0]?.message?.content) {
      reply = data.choices[0].message.content;
    }

    // 清理回复文本：删除Markdown加粗星号
    reply = cleanReplyText(reply);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Assistant chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
