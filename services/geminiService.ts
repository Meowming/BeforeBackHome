
import { GoogleGenAI, Type } from "@google/genai";
import { TurnOutcome, Situation } from "../types";

const SYSTEM_INSTRUCTION = `你是一个叙事裁决型 AI，用于一款互动叙事游戏《回家之前》。

游戏背景：
中国高中生在家中偷偷玩电脑游戏，父母突然提前回家。玩家扮演这名学生。

玩家核心玩法：
1. 每一回合，玩家会看到当前时空的叙事片段序列。
2. 玩家拥有 3 个“命数备选项”。
3. 玩家必须挑选 1 个拖入序列，并调整整体顺序。
4. 提交后，你将根据叙事逻辑的合理性与“暴露风险”，裁决接下来的局势。

核心裁决逻辑：
- 判断“局势严重程度 (severity)”（0-100）。
- 0 表示完全安全（绿色），100 表示彻底败露（红色）。
- 你需要生成一个 visual_prompt，用于描述当前情景的画面。画面应该是第三人称视角，风格为“紧张的现代感写实插画”。

你每个回合必须：
1. 分析玩家提交的序列，给出新的 severity 和 status_label。
2. 给出 player_feedback_cn。
3. 生成 visual_prompt：一段英文描述，描述当前卧室内的紧张氛围（如：少年紧张地看着发光的屏幕，房门正缓缓打开）。
4. 生成下一回合的基础片段和 3 个备选项。

重要：叙事文本必须是简体中文，visual_prompt 必须是英文。`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    turn_id: { type: Type.STRING },
    outcome: {
      type: Type.OBJECT,
      properties: {
        is_game_over: { type: Type.BOOLEAN },
        ending_type: { type: Type.STRING },
        ending_text: { type: Type.STRING },
      },
      required: ["is_game_over", "ending_type", "ending_text"],
    },
    new_situation: {
      type: Type.OBJECT,
      properties: {
        severity: { type: Type.NUMBER },
        status_label: { type: Type.STRING },
      },
      required: ["severity", "status_label"],
    },
    player_feedback_cn: { type: Type.STRING },
    visual_prompt: { type: Type.STRING, description: "A prompt for image generation reflecting the current tension." },
    next_fragments_cn: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    alternatives_cn: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["turn_id", "outcome", "new_situation", "player_feedback_cn", "visual_prompt", "next_fragments_cn", "alternatives_cn"],
};

export async function adjudicateTurn(
  history: string[],
  finalOrder: string[],
  currentSituation: Situation
): Promise<TurnOutcome & { visual_prompt: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
当前局势：${currentSituation.severity} (${currentSituation.status_label})
历史背景：${history.join(' -> ')}
玩家提交序列：
${finalOrder.map((t, i) => `${i + 1}. ${t}`).join('\n')}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function generateSceneImage(prompt: string): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const finalPrompt = `An intense, cinematic digital art illustration of: ${prompt}. Cinematic lighting, domestic suspense style, high detail.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: finalPrompt }] },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image generation failed", e);
  }
  return null;
}
