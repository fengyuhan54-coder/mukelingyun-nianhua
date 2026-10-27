# 双重校验 Prompt 设计详解

---

## 一、校验流程概览

```
用户提交生成请求
       ↓
┌─────────────────────────────────────────┐
│         第一关：主题元素匹配校验           │
│  验证图片是否包含用户选的主题核心元素       │
└─────────────────┬───────────────────────┘
                  ↓ 通过
┌─────────────────────────────────────────┐
│         第二关：流派形制校验              │
│  验证图片是否符合对应流派的木版年画规范     │
└─────────────────┬───────────────────────┘
                  ↓ 通过
              返回结果
                  ↓ 失败（任意一关）
           自动重新生成（最多3次）
```

---

## 二、第一关：主题元素匹配校验 Prompt

### 2.1 固定主题校验

适用于：用户选择了预设主题（如"门神"、"观音"等）

```
请仔细分析这张年画图像，识别其中的核心元素。

需要校验的内容：
1. 图像中是否包含以下主题元素：[主题对应的标准元素列表]
2. 核心人物/主体是否与"[主题名称]"主题相符
3. 是否有偏离主题的无关元素

请返回JSON格式的校验结果：
{
  "passed": true/false,
  "matchedElements": ["匹配到的元素"],
  "missingElements": ["缺失的元素"],
  "deviationElements": ["偏离的元素"],
  "suggestion": "改进建议（如果未通过）"
}
```

**示例**：用户选择"门神"主题
- 传入主题元素：`["武门神", "文门神", "将军形象", "盔甲", "兵器", "门神站姿", "对峙构图"]`
- 校验：图片是否包含门神人物、盔甲服饰、门神构图

### 2.2 自定义主题校验

适用于：用户选择了"自定义"并填写了描述

```
请仔细分析这张年画图像，识别其中的核心元素。

这是一张[流派名称]年画，用户自定义主题为："[用户填写的描述]"

需要校验的内容：
1. 图像中是否包含主题"[用户描述]"所描述的核心元素
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
}
```

---

## 三、第二关：流派形制校验 Prompt

适用于：所有生成图片，统一校验流派风格

```
请仔细分析这张年画图像，评估其是否符合[流派名称]年画的木版年画形制规范。

[流派名称]年画的特征：
- 艺术风格：[流派的艺术风格描述]
- 造型特征：[流派的造型特点]
- 构图规范：[流派的构图规则]
- 色彩特点：[流派的典型色彩]
- 地域特色：[流派产地]

需要校验的内容：
1. 人物造型是否符合[流派名]的[造型特征]
2. 色彩搭配是否使用[流派名]的典型配色
3. 构图是否遵循[流派名]的[构图规则]
4. 整体风格是否具有[流派名]的[风格关键词]

请返回JSON格式的校验结果：
{
  "passed": true/false,
  "styleMatchScore": 0-100,
  "matchedFeatures": ["匹配的形制特征"],
  "deviationFeatures": ["偏离的形制特征"],
  "suggestion": "改进建议（如果未通过）"
}
```

**示例**：天津杨柳青 + 财神
- 传入杨柳青特征：`["工笔重彩", "细腻逼真", "写实风格", "金碧辉煌", "天津杨柳青"]`
- 校验：图片是否具有杨柳青的工笔细腻风格、财神形象是否符合规范

---

## 四、校验响应解析

```typescript
// 解析视觉理解API返回的JSON
const jsonMatch = content.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  const result = JSON.parse(jsonMatch[0]);
  return { 
    passed: result.passed !== false && result.styleMatchScore >= 60, 
    details: result 
  };
}
```

**通过条件**：
- 第一关：`passed === true`
- 第二关：`passed === true && styleMatchScore >= 60`

---

## 五、完整校验流程代码

```typescript
async function generateWithValidation(
  token: string,
  styleId: string,
  effectiveTheme: { id: string; name: string; elements: string[] },
  specificElement?: string,
  additionalRequirements?: string
) {
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    // 1. 生成增强版Prompt
    const prompt = generateEnhancedPrompt(style, effectiveTheme, ...);
    
    // 2. 调用图片生成API
    const genResult = await generateImage(token, prompt);
    if (!genResult.success) continue;
    
    // 3. 第一关校验：主题元素匹配
    const { themeValidation, styleValidation } = generateValidationPrompts(style, effectiveTheme, isCustomTheme);
    const themeCheck = await validateImage(genResult.imageUrl, themeValidation);
    
    if (!themeCheck.passed) {
      console.log(`第${attempt}次：主题元素校验未通过，重试...`);
      continue;
    }
    
    // 4. 第二关校验：流派形制校验
    const styleCheck = await validateImage(genResult.imageUrl, styleValidation);
    
    if (!styleCheck.passed || styleCheck.details.styleMatchScore < 60) {
      console.log(`第${attempt}次：流派形制校验未通过，重试...`);
      continue;
    }
    
    // 5. 两关都通过，返回结果
    return { success: true, imageUrl: genResult.imageUrl, prompt, attempts: attempt };
  }
  
  return { success: false, error: '生成失败，请重试' };
}
```

---

## 六、五大流派校验特征

| 流派 | 艺术风格 | 造型特征 | 典型色彩 | 构图规范 |
|------|---------|---------|---------|---------|
| 开封朱仙镇 | 粗犷豪放 | 夸张传神 | 朱红、墨黑 | 对称庄重 |
| 天津杨柳青 | 工笔重彩 | 细腻逼真 | 金碧辉煌 | 丰满热闹 |
| 苏州桃花坞 | 江南风韵 | 写意秀美 | 蓝灰、紫红 | 疏密有致 |
| 山东杨家埠 | 木版味道 | 夸张装饰 | 红绿对比 | 饱满有力 |
| 四川绵竹 | 写意传神 | 竹骨神韵 | 深浅墨色 | 简练生动 |

---

## 七、设计亮点

| 特点 | 说明 |
|------|------|
| **分层校验** | 主题匹配 + 风格形制，分层把关 |
| **自定义友好** | 自定义主题有单独的校验逻辑 |
| **量化评分** | 风格匹配度 0-100 分量化 |
| **智能重试** | 不通过自动重试，最多3次 |
| **详细反馈** | 返回匹配/缺失/偏离元素详情 |
| **安全兜底** | API出错默认通过，避免死循环 |
