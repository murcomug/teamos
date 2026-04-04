import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Standard Confirmation Dialog Component
 * 
 * Usage:
 * const [confirm, setConfirm] = useState(null);
 * <ConfirmDialog
 *   open={!!confirm}
 *   onClose={() => setConfirm(null)}
 *   title="Delete Item"
 *   message="Are you sure? This action cannot be undone."
 *   onConfirm={() => handleDelete()}
 *   dangerAction={true} // Optional: red button for destructive actions
 *   loading={false}
 * />
 */
export default function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  onConfirm,
  dangerAction = true,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const buttonClass = dangerAction
    ? "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
    : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground hover:bg-white/[0.04] disabled:opacity-50"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={buttonClass}
          >
            {loading ? "Please wait..." : confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}