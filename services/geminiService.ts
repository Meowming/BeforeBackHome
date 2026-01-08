
import { GoogleGenAI, Type } from "@google/genai";
import { TurnOutcome, Situation } from "../types";

const SYSTEM_INSTRUCTION = `你是一个叙事裁决型 AI，用于互动叙事游戏《回家之前》。

游戏背景：
中国高中生在家偷偷玩游戏，父母提前回家。玩家需要通过重组叙事片段来化解危机。

核心任务：增加剧情的“反转感”与“戏剧张力”。

裁决要求：
1. **反转逻辑**：不要总是给平庸的反馈。如果玩家组合出意想不到的逻辑，给予高度奖励或极具戏剧性的转折。
2. **备选项多样化**：每一回合生成的 3 个“命数备选项”必须具备极高的差异性：
   - 选项 A (稳健型)：逻辑合理，风险低，进展缓慢。
   - 选项 B (激进型/反转点)：高风险高回报。例如：突然关掉电闸假装停电、假装梦游、或者制造巨大的噪音掩盖电脑风扇声。
   - 选项 C (思维跳跃/荒诞型)：利用环境细节制造巧合。例如：把猫踢向门口吸引注意、假装正在听极其严肃的英语听力并大声跟读。
3. **文本禁忌（重要）**：生成的文本中**严禁出现任何形式的括号（如：()、[]、{}、<>、圆括号、方括号等）及其内部的标注内容**。不要在选项中写类似“(稳健型)”或“[激进]”之类的提示词，直接输出叙事内容。
4. **情境连贯性**：下一回合的基础片段必须紧扣上一回合的“反转”结果。

生成规范：
- severity (0-100)：根据逻辑合理性增减。
- visual_prompt：必须描述出“反转”瞬间的视觉冲击力。
- 文本风格：冷峻、幽默、紧张感并存。`;

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
    visual_prompt: { type: Type.STRING, description: "A high-tension visual prompt reflecting the twist." },
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
当前局势严重度：${currentSituation.severity}/100
局势标签：${currentSituation.status_label}
已发生的叙事：${history.join(' > ')}
本回合最终编排：
${finalOrder.map((t, i) => `${i + 1}. ${t}`).join('\n')}

请根据上述编排，生成极具张力和反转可能的后续。记住：绝对不要在 alternatives_cn 中包含任何括号及括号内的解释文字。`;

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
  const finalPrompt = `Cinematic illustration: ${prompt}. Suspenseful atmosphere, dramatic shadows, sharp digital art style, 8k resolution.`;
  
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
