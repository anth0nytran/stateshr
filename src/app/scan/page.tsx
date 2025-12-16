"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Image as ImageIcon, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getCardBucketName } from "@/lib/supabase/urls";
import type { LeadDraft } from "@/lib/types";

type ExtractResponse = {
  extracted: LeadDraft;
  uncertain_fields: string[];
  raw_ocr_text: string;
  error?: string | null;
};

const REVIEW_STORAGE_KEY = "cardleads.reviewPayload";

async function fileToDataUrl(file: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function ScanPage() {
  const router = useRouter();
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<
    "idle" | "compressing" | "uploading" | "extracting"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function onFile(file: File) {
    setError(null);
    setStatus("compressing");
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const msg = "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
      setError(msg);
      toast.error("Upload not configured");
      setStatus("idle");
      return;
    }

    let processed: File | Blob = file;
    try {
      processed = await imageCompression(file, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
    } catch (err) {
      processed = file;
      const message = err instanceof Error ? err.message : "Compression failed";
      toast.message(message, { description: "Using original image." });
    }

    const nextPreview = URL.createObjectURL(processed);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextPreview;
    });

    const image_data_url = await fileToDataUrl(processed);

    try {
    setStatus("uploading");

    const supabase = getSupabaseBrowserClient();
    const bucket = getCardBucketName();
    const id =
      (typeof crypto !== "undefined" && "randomUUID" in crypto && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const contentType = processed.type || "image/jpeg";
    const ext =
      contentType === "image/png"
        ? "png"
        : contentType === "image/webp"
          ? "webp"
          : "jpg";
    const path = `cards/${id}.${ext}`;

    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, processed, { upsert: false, contentType });

    if (uploadError || !data?.path) {
      throw uploadError ?? new Error("Upload failed");
    }

    setStatus("extracting");

    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ card_image_path: data.path }),
    });

    if (!res.ok) {
      throw new Error(`Extract failed (${res.status})`);
    }

    const payload = (await res.json()) as ExtractResponse;
    sessionStorage.setItem(
      REVIEW_STORAGE_KEY,
      JSON.stringify({ ...payload, card_image_path: data.path, image_data_url })
    );

    toast.success("Ready to review");
    router.push("/review");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Something went wrong";
      setError(message);
      toast.error("Process failed");
      setStatus("idle");
    }
  }

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      await onFile(file);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Something went wrong";
      setError(message);
      toast.error("Couldn’t process that image");
      setStatus("idle");
    }
  }

  const isBusy = status !== "idle";

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Scan Lead</h1>
        <p className="text-muted-foreground">
          Capture a business card to automatically extract details.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!previewUrl ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid gap-4"
          >
            {/* Main Scanner Button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={isBusy}
              className="group relative flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-primary/20 bg-muted/30 transition-all hover:border-primary hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98]"
            >
              <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                <div className="rounded-full bg-primary/10 p-6 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Camera className="h-10 w-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">Take Photo</h3>
                  <p className="text-sm text-muted-foreground">Tap to open camera</p>
                </div>
              </div>
              
              {/* Decorative scan line */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-all duration-1000 group-hover:top-full group-hover:opacity-100" />
            </button>

            {/* Secondary Upload Button */}
            <Button
              variant="outline"
              size="lg"
              className="h-14 w-full gap-2 rounded-2xl border-2"
              onClick={() => uploadInputRef.current?.click()}
              disabled={isBusy}
            >
              <ImageIcon className="h-5 w-5" />
              Upload from Gallery
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <Card className="overflow-hidden border-0 shadow-2xl ring-1 ring-border/50">
              <CardContent className="p-0">
                <div className="relative aspect-[4/3] w-full bg-black">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-contain opacity-80"
                  />
                  
                  {/* Scanning Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <div className="relative flex flex-col items-center gap-4">
                      <div className="relative">
                        <ScanLine className="h-16 w-16 animate-pulse text-[#ce1126]" />
                        <div className="absolute -inset-4 animate-[spin_3s_linear_infinite] rounded-full border-b-2 border-[#ce1126]/50" />
                      </div>
                      <div className="flex flex-col items-center gap-1 text-white">
                        <span className="text-lg font-medium">
                          {status === "compressing" && "Optimizing image..."}
                          {status === "uploading" && "Uploading securely..."}
                          {status === "extracting" && "Analyzing text..."}
                        </span>
                        <span className="text-sm text-white/60">Please wait a moment</span>
                      </div>
                    </div>
                  </div>
          </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePickFile}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePickFile}
          />

      {error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-bottom-2">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
