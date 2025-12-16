export type PipelineStage = {
  id: string;
  name: string;
  sort_order: number;
};

export type LeadStatus = "active" | "follow_up" | "do_not_contact";

export type LeadDraft = {
  full_name: string;
  first_name: string;
  last_name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
  stage_id: string | null;
  card_image_path: string;
};

export type LeadRow = LeadDraft & {
  id: string;
  raw_ocr_text: string | null;
  status?: LeadStatus | null;
  created_at: string;
  updated_at: string;
};
