import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { STAGES, SUB_STAGES, isValidSubStage } from "@/lib/crmConfig";

export default function MoveStageModal({ open, onClose, currentStage, currentSubStage, onSave }) {
  const [stage, setStage] = useState(currentStage || "");
  const [subStage, setSubStage] = useState(currentSubStage || "");
  const [error, setError] = useState("");

  const handleStageChange = (s) => {
    setStage(s);
    setSubStage("");
    setError("");
  };

  const handleSave = () => {
    if (!stage || !subStage) { setError("Both stage and sub-stage are required"); return; }
    if (!isValidSubStage(stage, subStage)) { setError("Invalid stage/sub-stage combination"); return; }
    onSave({ stage, sub_stage: subStage });
  };

  const subStageOptions = SUB_STAGES[stage] || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Move Stage</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Stage</p>
            <div className="flex gap-2">
              {STAGES.map(s => (
                <button key={s.value} onClick={() => handleStageChange(s.value)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    stage === s.value ? "bg-primary/20 text-primary border-primary/50" : "bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-foreground"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {stage && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Sub-Stage</p>
              <div className="flex flex-wrap gap-2">
                {subStageOptions.map(s => (
                  <button key={s.value} onClick={() => { setSubStage(s.value); setError(""); }}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      subStage === s.value ? "bg-primary/20 text-primary border-primary/50" : "bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-foreground"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground text-xs">Cancel</Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs">Move Stage</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}