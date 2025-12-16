"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileSpreadsheet, 
  Loader2, 
  MoreHorizontal, 
  RefreshCw, 
  Search, 
  Sheet,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  LayoutGrid,
  List as ListIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadDetailsDialog } from "@/components/lead-details-dialog";
 
import type { LeadRow, LeadStatus, PipelineStage } from "@/lib/types";
import { dedupeLeadRows } from "@/lib/dedupe";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { getStageTone } from "@/lib/stage-ui";

const SHEETS_HEADER = [
  "Full Name",
  "First Name",
  "Last Name",
  "Company",
  "Title",
  "Email",
  "Phone",
  "Website",
  "Address",
  "Stage",
  "Notes",
  "Date Added",
  "Source",
] as string[];

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

function escapeCsv(value: unknown) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function LeadsPage() {
  const [stages, setStages] = React.useState<PipelineStage[]>([]);
  const [leads, setLeads] = React.useState<LeadRow[]>([]);
  const [filter, setFilter] = React.useState<"all" | string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<null | "sync" | "export">(null);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  
  // Clean up any prior demo localStorage artifacts (production safety).
  React.useEffect(() => {
    try {
      window.localStorage.removeItem("cardleads.demo.leads");
    } catch {
      // ignore
    }
  }, []);
  
  // Responsive view mode effect
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode("grid");
      } else {
        setViewMode("list");
      }
    };
    
    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Dialog State
  const [selectedLead, setSelectedLead] = React.useState<LeadRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const stageNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const s of stages) m.set(s.id, s.name);
    return m;
  }, [stages]);

  const stageById = React.useMemo(() => {
    const m = new Map<string, PipelineStage>();
    for (const s of stages) m.set(s.id, s);
    return m;
  }, [stages]);

  const filteredLeads = React.useMemo(() => {
    let result = leads;
    
    // Filter by Stage
    if (filter !== "all") {
      result = result.filter((l) => l.stage_id === filter);
    }

    // Filter by Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.full_name?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [leads, filter, searchQuery]);

  const canExport = filteredLeads.length > 0;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const [stagesRes, leadsRes] = await Promise.all([
        supabase
          .from("pipeline_stages")
          .select("id,name,sort_order")
          .order("sort_order", { ascending: true }),
        supabase
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (stagesRes.error) throw stagesRes.error;
      if (leadsRes.error) throw leadsRes.error;

      setStages((stagesRes.data ?? []) as PipelineStage[]);
      const rows = (leadsRes.data ?? []) as LeadRow[];
      setLeads(dedupeLeadRows(rows));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load leads";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  async function updateLeadStage(leadId: string, stageId: string) {
    // Optimistic update
    const prev = leads;
    const nextLeads = leads.map((l) => (l.id === leadId ? { ...l, stage_id: stageId } : l));
    setLeads(nextLeads);
    
    // Also update selectedLead if it's the one being changed
    if (selectedLead?.id === leadId) {
      setSelectedLead({ ...selectedLead, stage_id: stageId });
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("leads")
        .update({ stage_id: stageId })
        .eq("id", leadId);
      if (updateError) throw updateError;
      toast.success("Stage updated");
    } catch (err) {
      setLeads(prev);
      if (selectedLead?.id === leadId) setSelectedLead(prev.find(l => l.id === leadId) || null);
      const message = err instanceof Error ? err.message : "Update failed";
      toast.error(message);
    }
  }

  async function updateLeadStatus(leadId: string, status: LeadStatus) {
    // Optimistic update
    const prev = leads;
    const nextLeads = leads.map((l) => (l.id === leadId ? { ...l, status } : l));
    setLeads(nextLeads);

    if (selectedLead?.id === leadId) {
      setSelectedLead({ ...selectedLead, status });
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", leadId);
      if (updateError) throw updateError;
      toast.success("Status updated");
    } catch (err) {
      setLeads(prev);
      if (selectedLead?.id === leadId) setSelectedLead(prev.find(l => l.id === leadId) || null);
      const message = err instanceof Error ? err.message : "Update failed";
      toast.error(message);
    }
  }

  async function updateLeadNotes(leadId: string, notes: string) {
    // Optimistic update
    const prev = leads;
    const nextLeads = leads.map((l) => (l.id === leadId ? { ...l, notes } : l));
    setLeads(nextLeads);

    if (selectedLead?.id === leadId) {
      setSelectedLead({ ...selectedLead, notes });
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("leads")
        .update({ notes })
        .eq("id", leadId);
      if (updateError) throw updateError;
      toast.success("Notes saved");
    } catch (err) {
      setLeads(prev);
      if (selectedLead?.id === leadId) setSelectedLead(prev.find((l) => l.id === leadId) || null);
      const message = err instanceof Error ? err.message : "Update failed";
      toast.error(message);
    }
  }

  function buildRows(list: LeadRow[]) {
    return list.map((l) => [
      l.full_name ?? "",
      l.first_name ?? "",
      l.last_name ?? "",
      l.company ?? "",
      l.title ?? "",
      l.email ?? "",
      l.phone ?? "",
      l.website ?? "",
      l.address ?? "",
      stageNameById.get(l.stage_id ?? "") ?? "",
      l.notes ?? "",
      l.created_at,
      "Business Card",
    ]);
  }

  async function exportCsv() {
    setBusy("export");
    try {
      const rows = buildRows(filteredLeads);
      const csv = [SHEETS_HEADER, ...rows]
        .map((r) => r.map(escapeCsv).join(","))
        .join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "leads.csv");
      toast.success("CSV exported");
    } finally {
      setBusy(null);
    }
  }

  async function exportXlsx() {
    setBusy("export");
    try {
      const rows = buildRows(filteredLeads);
      const worksheet = XLSX.utils.aoa_to_sheet([SHEETS_HEADER, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
      const out = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      downloadBlob(
        new Blob([out], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "leads.xlsx"
      );
      toast.success("XLSX exported");
    } finally {
      setBusy(null);
    }
  }

  async function syncToSheets() {
    setBusy("sync");
    try {
      const res = await fetch("/api/sheets/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(filter === "all" ? {} : { stage_id: filter }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? `Sync failed (${res.status})`);
      }
      toast.success(`Synced ${json.rows_written ?? 0} rows`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      toast.error(message);
    } finally {
      setBusy(null);
    }
  }

  function handleCardClick(lead: LeadRow) {
    setSelectedLead(lead);
    setIsDetailsOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {filteredLeads.length} {filteredLeads.length === 1 ? "lead" : "leads"} found
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search leads..." 
              className="h-9 w-full bg-muted/50 pl-9 transition-all focus:bg-background dark:bg-muted/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
             {/* View Toggle */}
            <div className="hidden md:flex items-center rounded-lg border bg-background p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("list")}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-3 bg-background flex-1 sm:flex-none" disabled={!canExport || busy !== null}>
                  <MoreHorizontal className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Data</DropdownMenuLabel>
                <DropdownMenuItem onClick={exportCsv}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Save as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportXlsx}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Save as Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={load}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              onClick={syncToSheets} 
              disabled={busy !== null} 
              size="sm" 
              className="h-9 gap-2 bg-[#0F9D58] px-3 font-medium text-white hover:bg-[#0F9D58]/90 flex-1 sm:flex-none"
              title="Sync leads to Google Sheets"
              aria-label="Sync leads to Google Sheets"
            >
              <span className="hidden sm:inline-flex items-center gap-2">
                {busy === "sync" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sheet className="h-4 w-4" />
                )}
                Sync Sheets
              </span>
              <span className="sm:hidden">{busy === "sync" ? "Syncing…" : "Sync to Sheets"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs / Pipeline View */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "flex h-9 items-center rounded-full px-4 text-sm font-medium transition-all whitespace-nowrap border",
            filter === "all" 
              ? "border-primary bg-primary text-primary-foreground shadow-sm" 
              : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted dark:bg-muted/20"
          )}
        >
          All Leads
        </button>
        <div className="h-9 w-px bg-border/50 mx-1" /> {/* Divider */}
        {stages.map((s) => {
          const tone = getStageTone(s.sort_order);
          const isActive = filter === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              className={cn(
                "flex h-9 items-center rounded-full px-4 text-sm font-medium transition-all whitespace-nowrap border",
                isActive
                  ? cn(tone.chipActive, "border-transparent")
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/50"
              )}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error loading leads</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content Area */}
      <div className="space-y-4">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
             <Loader2 className="h-8 w-8 animate-spin mb-4" />
             <p>Loading your pipeline...</p>
           </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/10 py-20 text-center dark:bg-muted/5">
            <div className="rounded-full bg-muted p-4 mb-4 dark:bg-muted/20">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No leads found</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
              {searchQuery ? "Try adjusting your search terms." : "Scan a business card to fill your pipeline."}
            </p>
          </div>
        ) : viewMode === "list" ? (
          // TABLE VIEW (Desktop Default)
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Lead Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Captured</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const status = (lead.status ?? "active") as LeadStatus;
                  const stage = stageById.get(lead.stage_id ?? "");
                  const tone = getStageTone(stage?.sort_order);
                  const stageLabel = (stage?.name ?? "").trim();
                  
                   // Status Badge Logic
                   const statusBadge =
                   status === "follow_up"
                     ? { label: "Follow Up", className: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20" }
                     : status === "do_not_contact"
                       ? { label: "No Contact", className: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20" }
                       : { label: "Active", className: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20" };

                  return (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleCardClick(lead)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-base font-semibold">{lead.full_name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">{lead.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="truncate max-w-[150px] block">{lead.company || "-"}</span>
                      </TableCell>
                      <TableCell>
                         <div className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap",
                          tone.chip.replace("/50", "/30")
                        )}>
                          {stageLabel}
                        </div>
                      </TableCell>
                      <TableCell>
                         <Badge variant="secondary" className={cn("font-medium whitespace-nowrap", statusBadge.className)}>
                           {statusBadge.label}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(lead.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          // GRID VIEW (Mobile Default)
          <AnimatePresence mode="popLayout">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {filteredLeads.map((l, i) => (
                <motion.div
                  key={l.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <LeadCard 
                    lead={l} 
                    stageName={stageNameById.get(l.stage_id ?? "")}
                    stageSortOrder={stageById.get(l.stage_id ?? "")?.sort_order}
                    onClick={() => handleCardClick(l)}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      <LeadDetailsDialog 
        lead={selectedLead}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        stages={stages}
        onStageChange={updateLeadStage}
        onStatusChange={updateLeadStatus}
        onNotesChange={updateLeadNotes}
        stageName={stageNameById.get(selectedLead?.stage_id ?? "")}
      />
    </div>
  );
}

function LeadCard({ 
  lead, 
  stageName,
  stageSortOrder,
  onClick
}: { 
  lead: LeadRow; 
  stageName?: string;
  stageSortOrder?: number;
  onClick: () => void;
}) {
  const status = (lead.status ?? "active") as LeadStatus;
  const stageTone = getStageTone(stageSortOrder);
  const stageLabel = (stageName ?? "").trim();

  // Status Badge Logic
  const statusBadge =
    status === "follow_up"
      ? { label: "Follow Up", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" }
      : status === "do_not_contact"
        ? { label: "No Contact", className: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20" }
        : null;

  return (
    <Card 
      className="group relative cursor-pointer overflow-hidden border-border/60 shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.99] dark:bg-card/50 dark:hover:bg-card/80 h-full"
      onClick={onClick}
    >
      {/* Left colored border accent based on stage */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", stageTone.bg.replace("bg-", "bg-").replace("/50", "-400"))} />

      <CardContent className="p-4 flex flex-col h-full pl-5">
        {/* Top: Header Info */}
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate text-base leading-tight" title={lead.full_name}>
              {lead.full_name || "Unknown Name"}
            </h3>
            <p className="text-sm text-muted-foreground truncate mt-0.5" title={lead.title}>{lead.title}</p>
          </div>
          <span className="shrink-0 text-[10px] font-medium text-muted-foreground/70 bg-muted/30 px-2 py-1 rounded-md dark:bg-muted/20 whitespace-nowrap">
            {formatDate(lead.created_at)}
          </span>
        </div>

        {/* Company & Status Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {lead.company && (
            <Badge variant="secondary" className="bg-muted/50 text-muted-foreground border-transparent font-medium dark:bg-muted/20 max-w-full truncate">
              {lead.company}
            </Badge>
          )}
          {statusBadge && (
            <Badge variant="outline" className={cn("border font-medium whitespace-nowrap", statusBadge.className)}>
              {statusBadge.label}
            </Badge>
          )}
        </div>

        {/* Middle: Contact Details (Grid) */}
        <div className="grid gap-2 mb-4 text-sm flex-1">
          {lead.email && (
            <div className="flex items-center gap-2.5 text-muted-foreground truncate group-hover:text-foreground transition-colors">
              <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate" title={lead.email}>{lead.email}</span>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2.5 text-muted-foreground truncate group-hover:text-foreground transition-colors">
              <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}
          {lead.address && (
            <div className="flex items-center gap-2.5 text-muted-foreground truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate" title={lead.address}>{lead.address}</span>
            </div>
          )}
        </div>

        {/* Bottom: Stage Indicator */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
          <div className={cn(
            "flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap max-w-[85%]",
            stageTone.chip.replace("text-", "text-").replace("bg-", "bg-").replace("/50", "/30")
          )}>
            <span className="truncate">{stageLabel}</span>
          </div>
          
          <div className="flex items-center text-xs font-medium text-primary opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 shrink-0">
             <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
