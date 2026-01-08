
export interface Stats {
  trust: number;
  autonomy: number;
  study: number;
  risk: number;
  coherence: number;
}

export interface Fragment {
  id: string;
  text: string;
  isFixed: boolean;
}

export interface TurnOutcome {
  turn_id: string;
  outcome: {
    is_game_over: boolean;
    ending_type: 'caught' | 'coherence_collapse' | 'none';
    ending_text: string;
  };
  delta: Partial<Stats>;
  state_tags: {
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    turn_type: 'normal' | 'high_risk' | 'confrontation' | 'resolution';
  };
  player_feedback_cn: string;
  next_fragments_cn: string[];
}

export interface GameHistoryItem {
  round: number;
  fragments: Fragment[];
  outcome?: TurnOutcome;
}
