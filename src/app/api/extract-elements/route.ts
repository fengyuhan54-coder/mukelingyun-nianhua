import { getApiToken } from '@/lib/api-config';
import { NextRequest, NextResponse } from "next/server";
import { parseCultureTourJson } from "@/lib/culture-tour-vision";
import { fetchMulingModel } from "@/lib/muling-network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function loadApiToken(): string | undefined {
  return getApiToken();
}

function waitForRetry(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(done, ms);
    function done() { signal.removeEventListener("abort", cancel); resolve(); }
    function cancel() { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
  });
}

export async function POST(request: NextRequest) {
  try {
    // 获取上传的文件
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;
    const extractType = formData.get("type") as string || "architecture";
    
    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: "未提供图片文件" },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validTypes = ["image/jpeg", "image/png"];
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { success: false, error: "仅支持 JPG、PNG 格式图片" },
        { status: 400 }
      );
    }

    // 获取 API Token
    const token = loadApiToken();
    if (!token) {
      return NextResponse.json(
        { success: false, error: "请先配置 API Token" },
        { status: 401 }
      );
    }

    // 将文件转换为 Base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    const mimeType = imageFile.type === "image/png" ? "image/png" : "image/jpeg";

    // 根据类型构建不同的提示词
    let prompt: string;
    if (extractType === "culture-tour") {
      prompt = [
        "你是严谨的中国传统文化现场讲解员。请仔细观察这张旅行照片，先描述画面中真正可见的内容，再解释可能相关的建筑、纹样、年画或民俗知识。",
        "要求：",
        "1. 不要仅罗列元素，要说明画面主体、构图层次、材质色彩和关键细节。",
        "2. 把画面中可直接观察到的事实和基于传统文化知识的解释分开，无法确定具体年代、地点或建筑名称时必须明确写仅凭照片无法确认。",
        "3. 讲解要让普通游客看懂，并给出接下来值得观察的细节。",
        "4. 只返回一个 JSON 对象，不使用 Markdown：",
        "{\"title\":\"根据画面拟定的简短标题\",\"elements\":[\"最多10个简短元素\"],\"overview\":\"80至150字的整体画面说明\",\"observations\":[\"3至6条照片中可见的具体细节\"],\"interpretations\":[\"2至5条与传统文化有关的解释，每条说明依据\"],\"uncertainty\":\"无法从照片确认的内容或判断边界\",\"questionSuggestions\":[\"3个适合继续追问的问题\"]}"
      ].join("\n");
    } else if (extractType === "annual-painting") {
      prompt = `请仔细分析这张木版年画或相关图片，识别并提取其中的核心主体元素，包括：
1. 人物角色（如：门神、财神、福禄寿三星、戏曲人物、娃娃等）
2. 动植物元素（如：牡丹、鲤鱼、仙鹤、龙凤等）
3. 器物道具（如：花瓶、如意、铜钱、灯笼等）
4. 装饰纹样（如：云纹、回纹、莲瓣纹等）

请用简洁的中文词语列出识别到的核心主体元素，用顿号分隔，总数控制在10个以内。
只返回元素列表，不要其他解释文字。`;
    } else {
      // 古建筑类型
      prompt = `请仔细分析这张古建筑或古建筑图片，识别并提取其中的核心建筑元素，包括：
1. 建筑类型（如：佛寺、道观、宫殿、楼阁、塔、民居等）
2. 建筑构件（如：斗拱、飞檐、翘角、琉璃瓦、红柱、栏杆等）
3. 结构特征（如：庑殿顶、歇山顶、悬山顶、藻井、斗拱等）
4. 装饰细节（如：雕梁画栋、石狮、麒麟、瑞兽、祥云等）
5. 环境元素（如：石桥、假山、松柏、亭台等）

请用简洁的中文词语列出识别到的核心建筑元素，用顿号分隔，总数控制在10个以内。
只返回元素列表，不要其他解释文字。`;
    }

    // 使用项目统一的 IPv4 连接、超时和安全重试，避免部分网络环境直接出现 fetch failed。
    const controller = new AbortController();
    const cancel = () => controller.abort();
    request.signal.addEventListener("abort", cancel, { once: true });
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 120_000);
    let response: Response;
    const requestBody = JSON.stringify({
      model: "doubao-seed-2-0-lite-260428",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: extractType === "culture-tour" ? 1200 : 200
    });
    try {
      response = await fetchMulingModel("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Content-Length": String(Buffer.byteLength(requestBody)),
        },
        body: requestBody,
        signal: controller.signal,
      }, { isGeneration: false, wait: waitForRetry });
    } catch (error) {
      if (timedOut) throw new Error("视觉模型响应超时，请稍后重新识别这张照片");
      throw error;
    } finally {
      clearTimeout(timeout);
      request.signal.removeEventListener("abort", cancel);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("Doubao Vision API Error:", data);
      return NextResponse.json(
        { success: false, error: data.error?.message || "元素提取失败，请重试" },
        { status: response.status }
      );
    }

    const content = data.choices?.[0]?.message?.content?.trim() || "";

    if (extractType === "culture-tour") {
      try {
        const parsed = parseCultureTourJson(content);
        const strings = (value: unknown, limit: number) => Array.isArray(value)
          ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, limit)
          : [];
        const elements = strings(parsed.elements, 10);
        return NextResponse.json({
          success: true,
          elements: elements.join("、"),
          analysis: {
            title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "现场文化照片",
            overview: typeof parsed.overview === "string" ? parsed.overview.trim() : "",
            observations: strings(parsed.observations, 6),
            interpretations: strings(parsed.interpretations, 5),
            uncertainty: typeof parsed.uncertainty === "string" ? parsed.uncertainty.trim() : "",
            questionSuggestions: strings(parsed.questionSuggestions, 3),
          },
        });
      } catch (error) {
        console.error("文化照片识别结果解析失败:", error);
        return NextResponse.json(
          { success: false, error: "视觉模型已返回内容，但识别结果格式异常，请重新识别。" },
          { status: 502 }
        );
      }
    }

    let elements = content
      .replace(/^["'"]|["'"]$/g, "")
      .replace(/^元素列表[：:]/, "")
      .replace(/^识别结果[：:]/, "")
      .trim();

    return NextResponse.json({ success: true, elements });
  } catch (error: any) {
    console.error("元素提取失败:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "元素提取失败，请重试" 
      },
      { status: 500 }
    );
  }
}
