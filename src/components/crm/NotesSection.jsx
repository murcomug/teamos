import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, StickyNote } from "lucide-react";

export default function NotesSection({ notes, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes || "");

  const handleSave = async () => {
    await onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(notes || "");
    setEditing(false);
  };

  return (
    <div className="border-t border-white/[0.06] pt-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Notes</h4>
        </div>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => { setDraft(notes || ""); setEditing(true); }}
            className="text-muted-foreground hover:text-foreground text-xs gap-1 h-7">
            <Pencil className="h-3 w-3" /> {notes ? "Edit" : "Add Note"}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write notes about this customer..."
            autoFocus
            className="w-full min-h-[120px] rounded-lg bg-white/[0.04] border border-primary/40 text-foreground text-sm p-3 focus:outline-none resize-none transition-all"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel} className="text-muted-foreground text-xs gap-1 h-7">
              <X className="h-3 w-3" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1 h-7">
              <Check className="h-3 w-3" /> Save
            </Button>
          </div>
        </div>
      ) : notes ? (
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{notes}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">No notes yet.</p>
      )}
    </div>
  );
}