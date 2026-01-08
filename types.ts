
export interface Situation {
  severity: number; // 0 (Perfect/Green) to 100 (Disaster/Red)
  status_label: string; // e.g., "信任尚存", "心生怀疑", "岌岌可危"
}

export interface Fragment {
  id: string;
  text: string;
  isFixed: boolean;
  isDeleted?: boolean;
  isNew?: boolean;
}

export interface TurnOutcome {
  turn_id: string;
  outcome: {
    is_game_over: boolean;
    ending_type: 'caught' | 'total_distrust' | 'none';
    ending_text: string;
  };
  new_situation: Situation;
  player_feedback_cn: string;
  next_fragments_cn: string[];
  alternatives_cn: string[];
}

export interface GameHistoryItem {
  round: number;
  fragments: Fragment[];
  outcome?: TurnOutcome;
}
