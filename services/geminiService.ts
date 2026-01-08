
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
- 废除具体数值（信任、自主等），改为判断“局势严重程度 (severity)”（0-100）。
- 0 表示完全安全且信任感极佳（绿色）。
- 50 表示父母开始怀疑，气氛变得紧张（橙色）。
- 100 表示彻底败露或信任崩塌，游戏结束（红色）。
- 如果叙事中出现了明显的穿帮、巨大的逻辑漏洞、或被父母当场看到电脑屏幕，直接判定 is_game_over 为 true。

你每个回合必须：
1. 分析玩家提交的叙事序列，给出新的 severity 分数。
2. 给出 status_label（如：风平浪静、略显局促、极度可疑、末日临头）。
3. 给出 player_feedback_cn（对玩家刚才编织出的叙事逻辑的评价）。
4. 生成下一回合的基础片段 (next_fragments_cn) 和 3 个全新备选项 (alternatives_cn)。

重要：叙事文本必须是简体中文。`;

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
        severity: { type: Type.NUMBER, description: "0-100 score of how bad things are." },
        status_label: { type: Type.STRING, description: "A short label describing current status." },
      },
      required: ["severity", "status_label"],
    },
    player_feedback_cn: { type: Type.STRING },
    next_fragments_cn: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    alternatives_cn: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["turn_id", "outcome", "new_situation", "player_feedback_cn", "next_fragments_cn", "alternatives_cn"],
};

export async function adjudicateTurn(
  history: string[],
  finalOrder: string[],
  currentSituation: Situation
): Promise<TurnOutcome> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
当前局势严重度：${currentSituation.severity} (${currentSituation.status_label})
历史背景：${history.join(' -> ')}

玩家提交的叙事序列：
${finalOrder.map((t, i) => `${i + 1}. ${t}`).join('\n')}

请根据叙事逻辑的暴露风险裁决这一回合。如果父母已经彻底怀疑或证据确凿，请结束游戏。
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

  return JSON.parse(response.text || "{}") as TurnOutcome;
}
