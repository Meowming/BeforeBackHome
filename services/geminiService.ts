
import { GoogleGenAI, Type } from "@google/genai";
import { TurnOutcome, Stats, Fragment } from "../types";

const SYSTEM_INSTRUCTION = `你是一个叙事裁决型 AI，用于一款单次事件的互动叙事游戏《回家之前》。

游戏背景：
中国高中生在家中偷偷玩电脑游戏，父母突然提前回家。
整个故事只发生在这一次回家事件中，不允许时间循环、不允许第二天、不允许切换场景。

玩家玩法：
玩家通过拖拽并重新排序中文文本片段，来表达行为与叙事的先后顺序。
你必须根据文本顺序来裁决剧情发展与数值变化。

重要规则：
- 只能输出 JSON，不允许任何额外文字
- 所有叙事文本必须是简体中文
- 不得提及 AI、模型、系统、提示词等实现细节
- 不得引入新角色或跳出家庭场景
- 必须保持“同一晚、同一事件”的连续性

可见数值 (0-100)：
- trust：父母信任 (初始50)
- autonomy：自主感 (初始50)
- study：学习表现 (初始50)

隐藏数值 (0-100)：
- risk：即时风险 (初始50)
- coherence：叙事一致性 (初始50)

硬性失败规则：
- 在 HIGH_RISK 回合中，如果排序结果表示游戏仍在运行或发声，必须导致 Game Over
- 在 CONFRONTATION 回合中，如果叙事明显矛盾，必须可能导致 Game Over
- 任意可见数值 < 0 导致游戏结束。

你每个回合必须：
1. 给出数值变化 (delta)
2. 给出一段玩家可理解的反馈 (player_feedback_cn)
3. 生成下一回合的可排序文本片段 (next_fragments_cn, 4-6 条)，其中 1-2 条应标记逻辑锚点（暗示某些应为固定）
4. 标注当前回合类型与风险等级`;

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
    delta: {
      type: Type.OBJECT,
      properties: {
        trust: { type: Type.NUMBER },
        autonomy: { type: Type.NUMBER },
        study: { type: Type.NUMBER },
        risk: { type: Type.NUMBER },
        coherence: { type: Type.NUMBER },
      },
    },
    state_tags: {
      type: Type.OBJECT,
      properties: {
        risk_level: { type: Type.STRING },
        turn_type: { type: Type.STRING },
      },
      required: ["risk_level", "turn_type"],
    },
    player_feedback_cn: { type: Type.STRING },
    next_fragments_cn: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["turn_id", "outcome", "delta", "state_tags", "player_feedback_cn", "next_fragments_cn"],
};

export async function adjudicateTurn(
  history: string[],
  currentOrder: string[],
  stats: Stats
): Promise<TurnOutcome> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
当前游戏状态：
Trust: ${stats.trust}, Autonomy: ${stats.autonomy}, Study: ${stats.study}
Risk: ${stats.risk}, Coherence: ${stats.coherence}

历史剧情回顾：
${history.join('\n')}

本回合玩家确定的文本顺序：
${currentOrder.map((t, i) => `${i + 1}. ${t}`).join('\n')}

请根据上述信息裁决本回合结果。
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
