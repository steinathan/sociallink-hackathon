"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { disputeBooking } from "@/actions/booking.actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Upload, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const DISPUTE_REASONS = [
  { value: "NO_SHOW", label: "No Show — Party did not arrive" },
  { value: "SAFETY_CONCERN", label: "Safety Concern — I felt unsafe" },
  { value: "FRAUD", label: "Fraud — Misrepresentation or scam" },
  { value: "OTHER", label: "Other" },
];

interface DisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
}

export function DisputeDialog({
  open,
  onOpenChange,
  bookingId,
}: DisputeDialogProps) {
  const { firebaseUser } = useAuthStore();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!reason) { setError("Please select a reason."); return; }
    if (description.trim().length < 20) {
      setError("Please provide at least 20 characters of description.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const idToken = await firebaseUser!.getIdToken();
      const evidenceUrls: string[] = [];

      // Upload evidence files
      for (let i = 0; i < evidenceFiles.length; i++) {
        const file = evidenceFiles[i];
        const storageRef = ref(
          storage,
          `disputes/${bookingId}/${Date.now()}_${file.name}`
        );
        console.log(`[Dispute Upload] Starting upload: ${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        console.log(`[Dispute Upload] Success: ${url}`);
        evidenceUrls.push(url);
        setUploadProgress(Math.round(((i + 1) / evidenceFiles.length) * 80));
      }

      setUploadProgress(90);
      const result = await disputeBooking(
        idToken,
        bookingId,
        reason,
        description,
        evidenceUrls
      );

      if (!result.success) {
        setError(result.error ?? "Dispute submission failed.");
        return;
      }

      setUploadProgress(100);
      setSubmitted(true);
      toast.error("Dispute filed. Funds are frozen pending review.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <CheckCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="mb-2 text-lg font-bold">Dispute Filed</h2>
            <p className="text-sm text-muted-foreground">
              Your dispute has been submitted and funds are frozen. Our team will
              review and contact both parties within 24 hours.
            </p>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Report / Dispute Session
          </DialogTitle>
          <DialogDescription>
            Filing a dispute will freeze all funds until our team resolves the
            issue. Only file if there is a genuine problem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <Progress value={uploadProgress} className="h-2" />
          )}

          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(value) => setReason(value ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Detailed Description</Label>
            <Textarea
              placeholder="Describe what happened in detail (minimum 20 characters)..."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Evidence (Optional)</Label>
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-4 text-center hover:border-primary/50"
              onClick={() =>
                document.getElementById("evidence-upload")?.click()
              }
            >
              <Upload className="mb-1 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {evidenceFiles.length > 0
                  ? `${evidenceFiles.length} file(s) selected`
                  : "Upload screenshots or photos"}
              </p>
              <input
                id="evidence-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) =>
                  setEvidenceFiles(Array.from(e.target.files ?? []))
                }
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Dispute"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
