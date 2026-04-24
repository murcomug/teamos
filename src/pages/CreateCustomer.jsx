import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { PRODUCTS, STAGES, SUB_STAGES, isValidSubStage } from "@/lib/crmConfig";

const COUNTRY_CODES = [
  { code: "+256", country: "UG" },
  { code: "+254", country: "KE" },
  { code: "+255", country: "TZ" },
  { code: "+250", country: "RW" },
  { code: "+251", country: "ET" },
  { code: "+234", country: "NG" },
  { code: "+27", country: "ZA" },
  { code: "+1", country: "US" },
  { code: "+44", country: "UK" },
  { code: "+971", country: "AE" },
];

export default function CreateCustomer() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();

  const [members, setMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    company_name: "",
    point_of_contact: "",
    email: "",
    phone_code: "+256",
    phone_number: "",
    website: "",
    products: [],
    stage: "",
    sub_stage: "",
    assigned_to: "",
    assigned_to_email: "",
    other_details: "",
  });

  useEffect(() => {
    base44.entities.TeamMember.list().then(setMembers);
  }, []);

  const toggleProduct = (val) => {
    setForm(f => ({
      ...f,
      products: f.products.includes(val) ? f.products.filter(p => p !== val) : [...f.products, val]
    }));
    setErrors(e => ({ ...e, products: undefined }));
  };

  const setStage = (val) => {
    setForm(f => ({ ...f, stage: val, sub_stage: "" }));
    setErrors(e => ({ ...e, stage: undefined, sub_stage: undefined }));
  };

  const setSubStage = (val) => {
    setForm(f => ({ ...f, sub_stage: val }));
    setErrors(e => ({ ...e, sub_stage: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.company_name.trim()) errs.company_name = "Company name is required";
    if (form.products.length === 0) errs.products = "Select at least one product";
    if (!form.stage) errs.stage = "Stage is required";
    if (!form.sub_stage) errs.sub_stage = "Sub-stage is required";
    if (form.stage && form.sub_stage && !isValidSubStage(form.stage, form.sub_stage)) {
      errs.sub_stage = "Invalid sub-stage for selected stage";
    }
    return errs;
  };

  const handleAssignee = (name) => {
    const member = members.find(m => m.name === name);
    setForm(f => ({ ...f, assigned_to: name, assigned_to_email: member?.email || "" }));
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    const payload = {
      company_name: form.company_name.trim(),
      point_of_contact: form.point_of_contact.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone_number ? `${form.phone_code}${form.phone_number}` : undefined,
      website: form.website.trim() || undefined,
      products: form.products,
      stage: form.stage,
      sub_stage: form.sub_stage,
      assigned_to: form.assigned_to || undefined,
      assigned_to_email: form.assigned_to_email || undefined,
      other_details: form.other_details.trim() || undefined,
      created_by: currentUser?.name || "",
      created_by_email: currentUser?.email || "",
      last_activity_date: new Date().toISOString(),
    };
    const created = await base44.entities.Customer.create(payload);
    await base44.functions.invoke("logActivity", {
      action: "CUSTOMER_CREATED",
      description: `${currentUser?.name || "Someone"} added ${payload.company_name} to CRM`,
      entity_type: "Customer",
      entity_id: created.id,
      user_name: currentUser?.name,
    });
    toast({ title: `Customer ${payload.company_name} added successfully` });
    navigate(`/crm/${created.id}`);
  };

  const subStageOptions = SUB_STAGES[form.stage] || [];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/crm")} className="p-2 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">New Customer</h1>
          <p className="text-sm text-muted-foreground">Add a new company to the CRM</p>
        </div>
      </div>

      {/* Section 1 — Company Info */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted-foreground">Company Information</h2>
        <div>
          <Label className="text-xs text-muted-foreground">Company Name <span className="text-red-400">*</span></Label>
          <Input value={form.company_name} onChange={e => { setForm(f => ({...f, company_name: e.target.value})); setErrors(e2 => ({...e2, company_name: undefined})); }}
            placeholder="e.g. Acme Corp"
            className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground" />
          {errors.company_name && <p className="text-xs text-red-400 mt-1">{errors.company_name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Point of Contact</Label>
            <Input value={form.point_of_contact} onChange={e => setForm(f => ({...f, point_of_contact: e.target.value}))}
              placeholder="Full name"
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
              placeholder="contact@company.com"
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Phone</Label>
            <div className="flex gap-1 mt-1">
              <select value={form.phone_code} onChange={e => setForm(f => ({...f, phone_code: e.target.value}))}
                className="h-9 px-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary/40 flex-shrink-0 w-20">
                {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code} {c.country}</option>)}
              </select>
              <Input value={form.phone_number} onChange={e => setForm(f => ({...f, phone_number: e.target.value}))}
                placeholder="700000000"
                className="bg-white/[0.04] border-white/[0.08] text-foreground flex-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Website</Label>
            <Input value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))}
              placeholder="https://..."
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground" />
          </div>
        </div>
      </div>

      {/* Section 2 — Products */}
      <div className="glass-card rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Products Interested In <span className="text-red-400">*</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {PRODUCTS.map(p => (
            <button key={p.value} onClick={() => toggleProduct(p.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                form.products.includes(p.value)
                  ? "bg-primary/20 text-primary border-primary/50 glow-primary"
                  : "bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-foreground hover:border-white/[0.15]"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        {errors.products && <p className="text-xs text-red-400">{errors.products}</p>}
      </div>

      {/* Section 3 — Stage & Sub-Stage */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Stage & Sub-Stage <span className="text-red-400">*</span>
        </h2>
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Stage</Label>
          <div className="flex gap-2">
            {STAGES.map(s => (
              <button key={s.value} onClick={() => setStage(s.value)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  form.stage === s.value
                    ? "bg-primary/20 text-primary border-primary/50"
                    : "bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-foreground"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
          {errors.stage && <p className="text-xs text-red-400 mt-1">{errors.stage}</p>}
        </div>
        {form.stage && (
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Sub-Stage</Label>
            <div className="flex flex-wrap gap-2">
              {subStageOptions.map(s => (
                <button key={s.value} onClick={() => setSubStage(s.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    form.sub_stage === s.value
                      ? "bg-primary/20 text-primary border-primary/50"
                      : "bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-foreground"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            {errors.sub_stage && <p className="text-xs text-red-400 mt-1">{errors.sub_stage}</p>}
          </div>
        )}
      </div>

      {/* Section 4 — Additional */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Additional Details</h2>
        <div>
          <Label className="text-xs text-muted-foreground">Assigned To</Label>
          <Select value={form.assigned_to} onValueChange={handleAssignee}>
            <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
              <SelectValue placeholder="Select team member..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
              {members.map(m => <SelectItem key={m.id} value={m.name} className="text-foreground">{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Other Details</Label>
          <textarea value={form.other_details} onChange={e => setForm(f => ({...f, other_details: e.target.value}))}
            placeholder="Any additional context, notes, or details..."
            className="mt-1 w-full h-24 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm p-3 focus:outline-none focus:border-primary/40 resize-none" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-8">
        <Button variant="ghost" onClick={() => navigate("/crm")} className="text-muted-foreground">Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
          {submitting ? "Saving..." : "Add Customer"}
        </Button>
      </div>
    </div>
  );
}