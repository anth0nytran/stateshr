"use client";

import * as React from "react";
import { 
  Building, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  FileText,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Ban,
  Activity,
  type LucideIcon
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import type { LeadRow, LeadStatus, PipelineStage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getStageTone } from "@/lib/stage-ui";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(d);
}

interface LeadDetailsDialogProps {
  lead: LeadRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  onStageChange: (leadId: string, stageId: string) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onNotesChange: (leadId: string, notes: string) => void;
  stageName?: string;
}

export function LeadDetailsDialog({ 
  lead, 
  open, 
  onOpenChange,
  stages,
  onStageChange,
  onStatusChange,
  onNotesChange,
  stageName
}: LeadDetailsDialogProps) {
  const leadId = lead?.id ?? "";
  const leadNotes = (lead?.notes ?? "").toString();
  const initialNotes = leadNotes;
  const [notesDraft, setNotesDraft] = React.useState<string>(initialNotes);
  const [notesSaving, setNotesSaving] = React.useState(false);

  React.useEffect(() => {
    setNotesDraft(leadNotes);
  }, [leadId, leadNotes]);

  const notesDirty = notesDraft !== leadNotes;

  async function saveNotes() {
    if (!notesDirty || notesSaving) return;
    setNotesSaving(true);
    try {
      await Promise.resolve(onNotesChange(leadId, notesDraft));
    } finally {
      setNotesSaving(false);
    }
  }

  if (!lead) return null;

  const currentStage = stages.find(s => s.id === lead.stage_id);
  const status: LeadStatus = (lead.status ?? "active") as LeadStatus;
  const tone = getStageTone(currentStage?.sort_order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 sm:max-w-lg">
        {/* Header Section */}
        <div className={cn("p-6 pb-6 transition-colors", tone.bg)}>
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <DialogTitle className={cn("text-xl font-bold tracking-tight", tone.text)}>
                  {lead.full_name || "Unknown Name"}
                </DialogTitle>
                <DialogDescription className="text-base text-foreground/80 font-medium">
                  {lead.title}
                </DialogDescription>
                {lead.company && (
                  <div className="flex items-center gap-2 text-muted-foreground/80">
                    <Building className="h-3.5 w-3.5" />
                    <span className="text-sm font-medium">{lead.company}</span>
                  </div>
                )}
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "shrink-0 px-3 py-1 text-xs font-semibold capitalize shadow-sm border-0",
                  tone.chipActive
                )}
              >
                {stageName || "Unknown Stage"}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-8">
            
            {/* Pipeline Status - Vertical Timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                  Pipeline Progress
                </h4>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Step {currentStage?.sort_order ?? 0} of {stages.length}
                </span>
              </div>
              
              <div className="relative pl-2">
                {/* Timeline Line */}
                <div className="absolute left-[15px] top-2 bottom-4 w-px bg-border/50" />
                
                <div className="space-y-1">
                  {stages.map((stage) => {
                    const isActive = stage.id === lead.stage_id;
                    const isPast = (currentStage?.sort_order ?? 0) > stage.sort_order;
                    const stageTone = getStageTone(stage.sort_order);
                    
                    return (
                      <button
                        key={stage.id}
                        onClick={() => onStageChange(lead.id, stage.id)}
                        className={cn(
                          "group relative flex w-full items-center gap-4 rounded-lg p-2 text-left transition-all hover:bg-muted/50",
                          isActive ? "bg-muted/30" : ""
                        )}
                      >
                        {/* Indicator Node */}
                        <div className={cn(
                          "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                          isActive 
                            ? cn("border-white shadow-md ring-2 ring-primary/20", stageTone.chipActive.split(" ")[0], "text-white")
                            : isPast
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-muted-foreground/20 bg-background text-muted-foreground/20 group-hover:border-muted-foreground/40"
                        )}>
                          {isActive || isPast ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                        </div>

                        <div className="flex-1 flex items-center justify-between">
                          <span className={cn(
                            "text-sm font-medium transition-colors",
                            isActive ? "text-foreground font-semibold" : isPast ? "text-foreground/80" : "text-muted-foreground"
                          )}>
                            {stage.name}
                          </span>
                          
                          {isActive && (
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Lead Status - Segmented Control */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                Contact Status
              </h4>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/40 p-1">
                <StatusButton 
                  active={status === "active"} 
                  onClick={() => onStatusChange(lead.id, "active")}
                  icon={Activity}
                  label="Active"
                  activeClass="bg-white text-emerald-600 shadow-sm dark:bg-zinc-800 dark:text-emerald-400"
                />
                <StatusButton 
                  active={status === "follow_up"} 
                  onClick={() => onStatusChange(lead.id, "follow_up")}
                  icon={Clock}
                  label="Follow Up"
                  activeClass="bg-white text-amber-600 shadow-sm dark:bg-zinc-800 dark:text-amber-400"
                />
                <StatusButton 
                  active={status === "do_not_contact"} 
                  onClick={() => onStatusChange(lead.id, "do_not_contact")}
                  icon={Ban}
                  label="No Contact"
                  activeClass="bg-white text-red-600 shadow-sm dark:bg-zinc-800 dark:text-red-400"
                />
              </div>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                Details
              </h4>
              <div className="grid gap-2">
                <ContactRow 
                  icon={Mail} 
                  value={lead.email} 
                  href={`mailto:${lead.email}`}
                  label="Email Address"
                  iconColor="text-blue-500"
                  iconBg="bg-blue-50 dark:bg-blue-900/20"
                />
                <ContactRow 
                  icon={Phone} 
                  value={lead.phone} 
                  href={`tel:${lead.phone}`}
                  label="Phone Number"
                  iconColor="text-emerald-500"
                  iconBg="bg-emerald-50 dark:bg-emerald-900/20"
                />
                <ContactRow 
                  icon={Globe} 
                  value={lead.website} 
                  href={lead.website?.startsWith('http') ? lead.website : `https://${lead.website}`}
                  label="Website"
                  target="_blank"
                  iconColor="text-indigo-500"
                  iconBg="bg-indigo-50 dark:bg-indigo-900/20"
                />
                <ContactRow 
                  icon={MapPin} 
                  value={lead.address} 
                  label="Location"
                  iconColor="text-orange-500"
                  iconBg="bg-orange-50 dark:bg-orange-900/20"
                />
              </div>
            </div>

            {/* Notes (always visible) */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" /> Notes
                </h4>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => void saveNotes()}
                  disabled={!notesDirty || notesSaving}
                >
                  {notesSaving ? "Saving…" : "Save"}
                </Button>
              </div>

              <Textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                onBlur={() => void saveNotes()}
                placeholder="Add notes about this lead (context, follow-up, next steps)…"
                className="min-h-[96px] resize-none bg-muted/20 focus-visible:bg-background"
              />
            </div>

            {/* Footer Metadata */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground pt-4">
              <Calendar className="h-3 w-3 opacity-70" />
              Captured on {formatDate(lead.created_at)}
            </div>

          </div>
        </ScrollArea>
        
        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/5 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type StatusButtonProps = {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  activeClass: string;
};

function StatusButton({ active, onClick, icon: Icon, label, activeClass }: StatusButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 text-xs font-medium transition-all hover:bg-black/5 dark:hover:bg-white/5",
        active ? activeClass : "text-muted-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "scale-110" : "opacity-70")} />
      {label}
    </button>
  );
}

type ContactRowProps = {
  icon: LucideIcon;
  value?: string | null;
  href?: string;
  label: string;
  target?: string;
  iconColor: string;
  iconBg: string;
};

function ContactRow({ icon: Icon, value, href, label, target, iconColor, iconBg }: ContactRowProps) {
  if (!value) return null;
  
  const content = (
    <>
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors", iconBg, iconColor)}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="truncate text-sm font-medium text-foreground">{value}</span>
        <span className="text-[10px] font-medium text-muted-foreground/70">{label}</span>
      </div>
    </>
  );

  if (href) {
    return (
      <a 
        href={href} 
        target={target} 
        rel={target ? "noopener noreferrer" : undefined}
        className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-all hover:bg-muted hover:border-border/50"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl border border-transparent">
      {content}
    </div>
  );
}
