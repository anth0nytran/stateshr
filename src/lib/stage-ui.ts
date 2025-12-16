import { cva } from "class-variance-authority";

export type StageTone = {
  bg: string;
  text: string;
  border: string;
  chip: string;
  chipActive: string;
};

// Map sort_order (1-5) to distinct color tones for visual progression
const TONES: Record<number, StageTone> = {
  1: { // Prospecting (Neutral/Slate)
    bg: "bg-slate-50 dark:bg-slate-900/50",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-800",
    chip: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    chipActive: "bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900",
  },
  2: { // Appointment (Blue)
    bg: "bg-blue-50 dark:bg-blue-900/50",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    chipActive: "bg-blue-600 text-white shadow-sm shadow-blue-500/20",
  },
  3: { // Met (Indigo)
    bg: "bg-indigo-50 dark:bg-indigo-900/50",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
    chipActive: "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20",
  },
  4: { // Sent LOE (Violet)
    bg: "bg-violet-50 dark:bg-violet-900/50",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-800",
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
    chipActive: "bg-violet-600 text-white shadow-sm shadow-violet-500/20",
  },
  5: { // Closed (Emerald)
    bg: "bg-emerald-50 dark:bg-emerald-900/50",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    chipActive: "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20",
  },
};

export function getStageTone(sortOrder: number | undefined): StageTone {
  return TONES[sortOrder || 1] || TONES[1];
}

export const stageButtonClass = cva(
  "relative flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-all hover:scale-[1.01] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
  {
    variants: {
      active: {
        true: "border-2",
        false: "bg-background text-muted-foreground hover:bg-muted/40",
      },
      tone: {
        1: "",
        2: "",
        3: "",
        4: "",
        5: "",
      }
    },
    compoundVariants: [
      { active: true, tone: 1, class: "border-slate-600 bg-slate-50 text-slate-900 dark:border-slate-400 dark:bg-slate-900 dark:text-slate-100" },
      { active: true, tone: 2, class: "border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-900 dark:text-blue-100" },
      { active: true, tone: 3, class: "border-indigo-600 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-900 dark:text-indigo-100" },
      { active: true, tone: 4, class: "border-violet-600 bg-violet-50 text-violet-900 dark:border-violet-400 dark:bg-violet-900 dark:text-violet-100" },
      { active: true, tone: 5, class: "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-900 dark:text-emerald-100" },
    ],
    defaultVariants: {
      active: false,
      tone: 1,
    }
  }
);

export const stageChipClass = cva(
  "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all",
  {
    variants: {
      active: {
        true: "shadow-sm",
        false: "border bg-transparent text-muted-foreground hover:bg-muted/50",
      },
      sortOrder: {
        1: "", 2: "", 3: "", 4: "", 5: ""
      }
    },
    compoundVariants: [
      { active: true, sortOrder: 1, class: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100" },
      { active: true, sortOrder: 2, class: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100" },
      { active: true, sortOrder: 3, class: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100" },
      { active: true, sortOrder: 4, class: "bg-violet-100 text-violet-900 dark:bg-violet-900 dark:text-violet-100" },
      { active: true, sortOrder: 5, class: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100" },
    ],
    defaultVariants: {
      active: false,
      sortOrder: 1,
    }
  }
);
