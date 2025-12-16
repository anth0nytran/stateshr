"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  User, 
  Building, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  FileText,
  Briefcase,
  AlertCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { cn } from "@/lib/utils";
import type { LeadDraft, LeadRow, PipelineStage } from "@/lib/types";
import { buildLeadDedupeKey } from "@/lib/dedupe";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getPublicCardImageUrl } from "@/lib/supabase/urls";
import { normalizeAndValidateDraft } from "@/lib/validation";

type ReviewPayload = {
  card_image_path: string;
  extracted: LeadDraft;
  uncertain_fields: string[];
  raw_ocr_text: string;
  image_data_url?: string;
};

const REVIEW_STORAGE_KEY = "cardleads.reviewPayload";

function emptyDraft(cardImagePath: string): LeadDraft {
  return {
    full_name: "",
    first_name: "",
    last_name: "",
    company: "",
    title: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    notes: "",
    stage_id: null,
    card_image_path: cardImagePath,
  };
}

export default function ReviewPage() {
  const router = useRouter();
  const [draft, setDraft] = React.useState<LeadDraft>(() => emptyDraft(""));
  const [uncertainFields, setUncertainFields] = React.useState<string[]>([]);
  const [rawOcrText, setRawOcrText] = React.useState<string>("");
  const [imageDataUrl, setImageDataUrl] = React.useState<string | null>(null);
  const [stages, setStages] = React.useState<PipelineStage[]>([]);
  const [loadingStages, setLoadingStages] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const raw = sessionStorage.getItem(REVIEW_STORAGE_KEY);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as ReviewPayload;
      setDraft(payload.extracted ?? emptyDraft(payload.card_image_path));
      setUncertainFields(payload.uncertain_fields ?? []);
      setRawOcrText(payload.raw_ocr_text ?? "");
      setImageDataUrl(payload.image_data_url ?? null);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    async function loadStages() {
      setLoadingStages(true);
      setError(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: stagesError } = await supabase
          .from("pipeline_stages")
          .select("id,name,sort_order")
          .order("sort_order", { ascending: true });

        if (stagesError) throw stagesError;
        const list = (data ?? []) as PipelineStage[];
        setStages(list);

        const prospecting = list.find((s) => s.name === "Prospecting") ?? list[0];
        if (prospecting) {
          setDraft((d) => (d.stage_id ? d : { ...d, stage_id: prospecting.id }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load stages";
        setError(message);
      } finally {
        setLoadingStages(false);
      }
    }

    void loadStages();
  }, []);

  const publicImageUrl = draft.card_image_path
    ? getPublicCardImageUrl(draft.card_image_path)
    : null;
  const imageUrl = imageDataUrl ?? publicImageUrl;

  function isUncertain(field: keyof LeadDraft) {
    return uncertainFields.includes(field as string);
  }

  function setField<K extends keyof LeadDraft>(key: K, value: LeadDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  type DuplicateLead = Pick<
    LeadRow,
    | "id"
    | "full_name"
    | "first_name"
    | "last_name"
    | "company"
    | "stage_id"
    | "created_at"
    | "updated_at"
    | "email"
    | "phone"
  >;

  async function findDuplicateLead(args: {
    supabase: ReturnType<typeof getSupabaseBrowserClient>;
    dedupeKey: string;
  }): Promise<DuplicateLead | null> {
    const { supabase, dedupeKey } = args;

    if (dedupeKey.startsWith("email:")) {
      const email = dedupeKey.slice("email:".length);
      const { data } = await supabase
        .from("leads")
        .select("id,full_name,company,stage_id,created_at,updated_at,email,phone")
        .ilike("email", email)
        .limit(1);
      return (data?.[0] as DuplicateLead | undefined) ?? null;
    }

    if (dedupeKey.startsWith("phone_name:")) {
      const rest = dedupeKey.slice("phone_name:".length);
      const [phoneDigits] = rest.split("|");
      const last4 = phoneDigits?.slice(-4);
      if (!last4) return null;

      const { data } = await supabase
        .from("leads")
        .select(
          "id,full_name,first_name,last_name,company,stage_id,created_at,updated_at,email,phone"
        )
        .ilike("phone", `%${last4}%`)
        .limit(25);

      const candidates = (data ?? []) as DuplicateLead[];
      for (const c of candidates) {
        const key = buildLeadDedupeKey({
          email: c.email ?? "",
          phone: c.phone ?? "",
          full_name: c.full_name ?? "",
          first_name: c.first_name ?? "",
          last_name: c.last_name ?? "",
          company: c.company ?? "",
        });
        if (key === dedupeKey) return c;
      }
      return null;
    }

    if (dedupeKey.startsWith("name_company:")) {
      const rest = dedupeKey.slice("name_company:".length);
      const [, companyNorm] = rest.split("|");
      const token = companyNorm?.split(" ")?.[0];
      if (!token) return null;

      const { data } = await supabase
        .from("leads")
        .select(
          "id,full_name,first_name,last_name,company,stage_id,created_at,updated_at,email,phone"
        )
        .ilike("company", `%${token}%`)
        .limit(50);

      const candidates = (data ?? []) as DuplicateLead[];
      for (const c of candidates) {
        const key = buildLeadDedupeKey({
          email: c.email ?? "",
          phone: c.phone ?? "",
          full_name: c.full_name ?? "",
          first_name: c.first_name ?? "",
          last_name: c.last_name ?? "",
          company: c.company ?? "",
        });
        if (key === dedupeKey) return c;
      }
      return null;
    }

    return null;
  }

  async function saveLead() {
    setSaving(true);
    setError(null);

    try {
      const { lead, uncertain_fields } = normalizeAndValidateDraft(draft);
      setDraft(lead);
      setUncertainFields((prev) => Array.from(new Set([...prev, ...uncertain_fields])));

      const stageId = lead.stage_id;
      if (!stageId) throw new Error("Pick a stage");

      const supabase = getSupabaseBrowserClient();

      // Best-effort duplicate prevention (no Auth MVP). This blocks inserts when the
      // same person/card is scanned again so exports/sheets stay clean.
      const dedupeKey = buildLeadDedupeKey(lead);
      if (dedupeKey) {
        const match = await findDuplicateLead({ supabase, dedupeKey });
        if (match) {
          setError(
            `Duplicate detected: ${match.full_name || "Existing lead"} already exists in your pipeline.`
          );
          toast.error("Duplicate lead (not saved)");
          router.push("/leads");
          return;
        }
      }

      const { error: insertError } = await supabase.from("leads").insert({
        ...lead,
        stage_id: stageId,
        raw_ocr_text: rawOcrText ?? "",
      });

      if (insertError) throw insertError;

      sessionStorage.removeItem(REVIEW_STORAGE_KEY);
      toast.success("Lead saved");
      router.push("/leads");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
      toast.error("Couldn't save lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-lg font-semibold tracking-tight">Review Lead</h1>
        <div className="w-16" /> {/* Spacer for balance */}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Review error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
        {/* Left Col: Card Image (Sticky on Desktop) */}
        <div className="order-first lg:order-last">
          <div className="sticky top-24 space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-xl border bg-black/5 shadow-sm dark:bg-white/5"
            >
              <div className="aspect-[1.586/1] w-full">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Business card"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <span className="text-sm">No image</span>
                  </div>
                )}
              </div>
            </motion.div>
            
            {uncertainFields.length > 0 && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  Review Suggested
                </div>
                <p className="mt-1 text-xs opacity-90">
                  Some fields may need correction. Check highlighted items below.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Form Fields */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-8"
        >
          {/* Section: Identity */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-primary/80 uppercase tracking-wider">
              <User className="h-4 w-4" /> Identity
            </h3>
            
            <div className="grid gap-4">
              <Field
                label="Full Name"
                value={draft.full_name}
                onChange={(v) => setField("full_name", v)}
                placeholder="Jane Doe"
                uncertain={isUncertain("full_name")}
                testId="lead-full-name"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Title"
                  value={draft.title}
                  onChange={(v) => setField("title", v)}
                  placeholder="Manager"
                  uncertain={isUncertain("title")}
                  icon={Briefcase}
                />
                <Field
                  label="Company"
                  value={draft.company}
                  onChange={(v) => setField("company", v)}
                  placeholder="Acme Inc"
                  uncertain={isUncertain("company")}
                  icon={Building}
                />
              </div>
            </div>
          </section>

          {/* Section: Contact */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-primary/80 uppercase tracking-wider">
              <Phone className="h-4 w-4" /> Contact
            </h3>
            
            <div className="grid gap-4">
              <Field
                label="Email"
                value={draft.email}
                onChange={(v) => setField("email", v)}
                placeholder="jane@example.com"
                uncertain={isUncertain("email")}
                inputMode="email"
                icon={Mail}
              />
              <Field
                label="Phone"
                value={draft.phone}
                onChange={(v) => setField("phone", v)}
                placeholder="(555) 123-4567"
                uncertain={isUncertain("phone")}
                inputMode="tel"
                icon={Phone}
              />
              <Field
                label="Website"
                value={draft.website}
                onChange={(v) => setField("website", v)}
                placeholder="example.com"
                uncertain={isUncertain("website")}
                inputMode="url"
                icon={Globe}
              />
              <Field
                label="Address"
                value={draft.address}
                onChange={(v) => setField("address", v)}
                placeholder="123 Main St..."
                uncertain={isUncertain("address")}
                icon={MapPin}
              />
            </div>
          </section>

          {/* Section: Pipeline */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-primary/80 uppercase tracking-wider">
              <FileText className="h-4 w-4" /> CRM Status
            </h3>
            
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Pipeline Stage</Label>
                  <Select
                    value={draft.stage_id ?? ""}
                    onValueChange={(v) => setField("stage_id", v)}
                    disabled={loadingStages}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="Select Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Textarea
                    value={draft.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Add context about this lead..."
                    className="min-h-[80px] resize-none bg-background text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="fixed inset-x-0 bottom-0 z-[60] border-t bg-background/80 p-4 backdrop-blur-lg lg:sticky lg:bottom-auto lg:border-0 lg:bg-transparent lg:p-0">
            <div className="mx-auto flex max-w-2xl gap-3">
              <Button 
                size="lg" 
                className="w-full bg-primary font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
                onClick={saveLead} 
                disabled={saving}
              >
                {saving ? "Saving..." : "Save to Pipeline"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  uncertain,
  inputMode,
  testId,
  icon: Icon
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  uncertain?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  testId?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        {uncertain && (
          <Badge variant="outline" className="gap-1 border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0 text-[10px] font-medium text-yellow-600">
            Check
          </Badge>
        )}
      </div>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <Input
          data-testid={testId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className={cn(
            "h-11 bg-muted/30 transition-all focus:bg-background",
            Icon && "pl-9",
            uncertain && "border-yellow-500/50 bg-yellow-50 focus-visible:ring-yellow-500/30"
          )}
        />
      </div>
    </div>
  );
}
