import { getApiToken } from '@/lib/api-config';
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function loadApiToken(): string | undefined {
  return getApiToken();
}

export async function POST(request: NextRequest) {
  try {
    // 获取上传的文件
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;
    
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

    // 构建视觉理解提示词
    const prompt = `请仔细分析这张图片，识别并提取其中的核心主体元素。
请用简洁的中文词语列出识别到的核心主体元素，用顿号分隔，总数控制在10个以内。
只返回元素列表，不要其他解释文字。格式示例：秦琼、尉迟恭、牡丹花`;

    // 调用火山方舟视觉理解 API
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
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
        max_tokens: 200
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Doubao Vision API Error:", data);
      return NextResponse.json(
        { success: false, error: data.error?.message || "元素提取失败，请重试" },
        { status: response.status }
      );
    }

    // 提取并清理返回的元素
    let elements = data.choices?.[0]?.message?.content?.trim() || "";
    
    // 移除可能的引号和多余文字
    elements = elements
      .replace(/^["'"]|["'"]$/g, "")
      .replace(/^元素列表[：:]/, "")
      .replace(/^识别结果[：:]/, "")
      .trim();

    return NextResponse.json({
      success: true,
      elements: elements,
    });
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
