export interface Guild {
  guild_id: string;
  premium: boolean;
  log_channel_id: string | null;
  transcript_channel_id: string | null;
  bot_token_override: string | null;
  prefix: string;
  created_at: string;
}

export interface PriorityLevel {
  id: string;
  guild_id: string;
  name: string;
  color_hex: string;
  sort_order: number;
  created_at: string;
}

export interface Form {
  id: string;
  guild_id: string;
  name: string;
  questions_json: FormQuestion[];
  created_at: string;
}

export interface FormQuestion {
  id: string;
  label: string;
  type: 'short' | 'paragraph' | 'dropdown';
  placeholder?: string;
  options?: string[];
  required: boolean;
}

export interface Category {
  id: string;
  guild_id: string;
  name: string;
  target_channel_id: string | null;
  form_id: string | null;
  default_priority_id: string | null;
  staff_roles_json: string[];
  created_at: string;
}

export interface Panel {
  id: string;
  guild_id: string;
  channel_id: string | null;
  message_id: string | null;
  embed_json: PanelEmbed;
  buttons_json: PanelButton[];
  created_at: string;
  updated_at: string;
}

export interface PanelEmbed {
  title: string;
  description: string;
  color: number;
  footer?: string;
}

export interface PanelButton {
  id: string;
  label: string;
  emoji?: string;
  style: 1 | 2 | 3 | 4;
  category_id: string | null;
  form_id?: string | null;
}

export interface Ticket {
  id: string;
  guild_id: string;
  channel_id: string | null;
  opener_id: string;
  category_id: string | null;
  priority_id: string | null;
  status: 'open' | 'closed' | 'deleted';
  claimed_by: string | null;
  tags_json: string[];
  form_answers_json: Record<string, string> | null;
  opened_at: string;
  closed_at: string | null;
  close_reason: string | null;
  last_activity_at: string;
}

export type TicketActionType =
  | 'opened'
  | 'closed'
  | 'claimed'
  | 'unclaimed'
  | 'member_added'
  | 'member_removed'
  | 'priority_changed'
  | 'tag_added'
  | 'tag_removed'
  | 'reopened'
  | 'auto_closed';

export interface TicketAction {
  id: string;
  ticket_id: string;
  actor_id: string;
  action_type: TicketActionType;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface TranscriptMessage {
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  attachments: string[];
  timestamp: string;
}
