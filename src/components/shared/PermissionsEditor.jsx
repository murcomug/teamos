import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const PERMISSIONS = [
  { key: "view_departments", label: "View Departments" },
  { key: "add_departments", label: "Add Departments" },
  { key: "view_team", label: "View Team Members" },
  { key: "add_team", label: "Add Team Members" },
  { key: "view_reports", label: "View Reports" },
  { key: "company_wide_reports", label: "Request Company-Wide Reports (Agent)" },
];

export default function PermissionsEditor({ permissions = [], onChange }) {
  const toggle = (key) => {
    const updated = permissions.includes(key)
      ? permissions.filter((p) => p !== key)
      : [...permissions, key];
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {PERMISSIONS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-2">
          <Checkbox
            id={key}
            checked={permissions.includes(key)}
            onCheckedChange={() => toggle(key)}
            className="border-white/20"
          />
          <Label htmlFor={key} className="text-sm text-foreground cursor-pointer">
            {label}
          </Label>
        </div>
      ))}
    </div>
  );
}