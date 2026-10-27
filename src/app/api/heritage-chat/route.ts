import { NextRequest } from 'next/server';
import { resolveApiToken } from '@/lib/resolve-api-token';

// 火山方舟 API 配置
const ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/responses';
const MODEL_ID = 'deepseek-v4-1-flash-260910';

// 年画专业知识 System Prompt
const SYSTEM_PROMPT = `你是木版年画非遗科普助手，专注于解答年画相关问题。

## 你的知识范围

### 年画历史起源
- 起源于汉代门神画（神荼、郁垒）
- 宋代逐渐普及，出现商业年画
- 明清时期达到鼎盛，形成各大流派
- 清末民初受石印技术冲击
- 新中国成立后一度复兴
- 2006年列入国家级非物质文化遗产

### 六大主流流派
1. **杨柳青年画**（天津）
   - 风格：细腻典雅，色彩柔和
   - 题材：仕女、娃娃、戏曲人物
   - 特点：半印半画，手工彩绘精细

2. **桃花坞年画**（苏州）
   - 风格：清新秀丽，构图饱满
   - 题材：江南风光、花鸟虫鱼
   - 特点：一版多色，套印精细

3. **杨家埠年画**（山东潍坊）
   - 风格：粗犷豪放，色彩浓烈
   - 题材：门神、戏曲、农耕
   - 特点：线条简练，对比强烈

4. **朱仙镇年画**（河南开封）
   - 风格：古朴厚重，线条粗犷
   - 题材：门神、历史人物
   - 特点：使用传统矿物颜料，色彩持久

5. **绵竹年画**（四川）
   - 风格：活泼明快，富有生活气息
   - 题材：民俗生活、神话故事
   - 特点：手绘彩绘为主，色彩鲜艳

6. **武强年画**（河北）
   - 风格：质朴淳厚，乡土气息浓
   - 题材：农耕、节庆、吉祥图案
   - 特点：大红大绿，对比鲜明

### 传统制作工艺
1. **绘稿**：画师创作年画稿子
2. **刻版**：把稿子刻在梨木版上（阴刻/阳刻）
3. **上墨**：在版上刷颜料
4. **套印**：把纸压上去印出图案
5. **彩绘**：手工给年画上色

### 工具材料
- **梨木版**：纹理细密，适合雕刻
- **刻刀**：各种形状的专用刻刀
- **棕刷**：上墨用的刷子
- **马莲**：压纸拓印的草茎工具
- **颜料**：传统天然矿物和植物颜料

### 阴刻与阳刻
- **阴刻**：把线条部分挖掉，印出来是白线黑底（像剪纸）
- **阳刻**：把空白部分挖掉，印出来是黑线白底（像木刻版画）

### 民俗故事
- **门神**：秦琼、尉迟敬德守门的故事
- **福禄寿**：三星高照的由来
- **胖娃娃**：连年有余、多子多福
- **钟馗**：捉鬼驱邪的传说
- **灶王爷**：上天言好事，下界保平安

### 吉祥寓意
- **人物**：门神（镇宅）、福禄寿（三星高照）、胖娃娃（多子多福）
- **动物**：龙（皇权）、凤（吉祥）、鱼（有余）、蝙蝠（福）、鹿（禄）
- **植物**：牡丹（富贵）、莲花（清廉）、松鹤（长寿）
- **组合**：连年有余（莲花+鱼）、五福临门（五只蝙蝠）、三阳开泰（三只羊）

### 张贴习俗
- **春节**：贴门神、财神、吉祥年画
- **婚嫁**：贴龙凤呈祥、鸳鸯戏水
- **祭祀**：贴祖先像、神像
- **位置**：大门贴门神，堂屋贴中堂，卧室贴吉祥画

### 鉴别与保存
- **古版年画**：看纸张老化、颜料氧化、刀法风格
- **保存**：避光、防潮、防虫，用无酸纸包裹
- **鉴别**：手工刻版有刀痕，套印有色差，手绘有笔触

## 文化伴游照片上下文
- 当对话历史中包含“文化伴游照片识别上下文”时，可以结合其中已经识别的古建筑构件、传统纹样、年画和民俗元素继续讲解。
- 必须区分照片中可见的事实与文化推断，不确定具体地点、年代或名称时明确说明需要结合现场标识核实。
- 后续回答始终沿用该照片上下文，除非用户明确切换话题。
## 回答要求
1. 口语化短句，通俗易懂，像聊天一样
2. 专业术语附白话注解（如"阴刻（线条凹下去的刻法）"）
3. 分轮次输出，不堆砌大段文字
4. 用户问什么答什么，不主动扩展太多
5. 如果用户问题模糊，主动询问明确需求
6. 只回答年画相关问题，其他话题礼貌拒绝并引导回年画

## 示例对话
用户：年画是怎么来的？
助手：年画最早可以追溯到汉代，那时候人们在门上画神荼、郁垒两位门神来驱邪。到了宋代，年画开始普及，出现了专门卖年画的集市。明清时期最鼎盛，形成了杨柳青、桃花坞等各大流派。

用户：什么是阴刻？
助手：阴刻就是雕刻的时候，把线条部分凹下去，印出来的效果是白线黑底。年画一般用阳刻比较多，阳刻是线条凸起来，印出来是黑线白底，看起来更清晰有力。`;

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: '消息内容不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiToken = resolveApiToken();
    if (!apiToken) {
      return new Response(
        JSON.stringify({ error: '尚未配置火山方舟 API Key' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 构建对话历史
    const inputMessages = [
      {
        role: 'system',
        content: [{ type: 'input_text', text: SYSTEM_PROMPT }]
      },
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: [{ type: 'input_text', text: msg.content }]
      })),
      {
        role: 'user',
        content: [{ type: 'input_text', text: message }]
      }
    ];

    // 调用火山方舟 API（流式）
    const response = await fetch(ARK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL_ID,
        stream: true,
        input: inputMessages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('火山方舟 API 错误:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI 服务暂时不可用，请稍后再试' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建转换流，将火山方舟格式转换为标准SSE格式
    const transformStream = new TransformStream();
    const writer = transformStream.writable.getWriter();
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    // 异步处理流
    (async () => {
      if (!reader) {
        await writer.close();
        return;
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              try {
                const parsed = JSON.parse(data);
                
                // 提取文本内容（从 response.output_text.delta 事件）
                if (parsed.type === 'response.output_text.delta' && parsed.delta) {
                  const output = {
                    delta: {
                      content: parsed.delta
                    }
                  };
                  await writer.write(new TextEncoder().encode(`data: ${JSON.stringify(output)}\n\n`));
                }
                
                // 处理完成事件
                if (parsed.type === 'response.completed') {
                  await writer.write(new TextEncoder().encode('data: [DONE]\n\n'));
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      } catch (error) {
        console.error('流处理错误:', error);
      } finally {
        await writer.close();
      }
    })();

    return new Response(transformStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('API 调用错误:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
