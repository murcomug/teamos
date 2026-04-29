import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Search, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  PRODUCTS, STAGES, SUB_STAGES, STAGE_CONFIG, SUB_STAGE_CONFIG, PRODUCT_LABEL,
} from "@/lib/crmConfig";
import StageBadge from "@/components/crm/StageBadge";
import SubStageBadge from "@/components/crm/SubStageBadge";
import ProductPills from "@/components/crm/ProductPills";

export default function CRMList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [subStageFilter, setSubStageFilter] = useState("all");
  const [productFilter, setProductFilter] = useState([]);
  const [assignedFilter, setAssignedFilter] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.Customer.list("-created_date"),
      base44.entities.TeamMember.list(),
    ]).then(([c, m]) => {
      setCustomers(c || []);
      setMembers(m || []);
      setLoading(false);
    });
    const unsub = base44.entities.Customer.subscribe((event) => {
      if (event.type === "create") setCustomers(p => [event.data, ...p]);
      else if (event.type === "update") setCustomers(p => p.map(c => c.id === event.id ? event.data : c));
      else if (event.type === "delete") setCustomers(p => p.filter(c => c.id !== event.id));
    });
    return unsub;
  }, []);

  const availableSubStages = stageFilter === "all" ? [] : (SUB_STAGES[stageFilter] || []);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.company_name?.toLowerCase().includes(q) || c.point_of_contact?.toLowerCase().includes(q);
    const matchStage = stageFilter === "all" || c.stage === stageFilter;
    const matchSubStage = subStageFilter === "all" || c.sub_stage === subStageFilter;
    const matchProduct = productFilter.length === 0 || productFilter.every(p => c.products?.includes(p));
    const matchAssigned = assignedFilter === "all" || c.assigned_to === assignedFilter;
    return matchSearch && matchStage && matchSubStage && matchProduct && matchAssigned;
  });

  const uniqueAssignees = [...new Set(customers.map(c => c.assigned_to).filter(Boolean))];

  const handleDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    // droppableId format: "stage::sub_stage"
    const [newStage, newSubStage] = destination.droppableId.split("::");
    const [srcStage] = source.droppableId.split("::");
    // Block cross-stage drags
    if (newStage !== srcStage) return;
    const cust = customers.find(c => c.id === draggableId);
    if (!cust) return;
    await base44.entities.Customer.update(draggableId, { sub_stage: newSubStage });
    setCustomers(p => p.map(c => c.id === draggableId ? { ...c, sub_stage: newSubStage } : c));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Sales CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">{customers.length} customer{customers.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] rounded-lg border border-white/[0.06] p-0.5">
            <button onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <List className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setView("kanban")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "kanban" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button onClick={() => navigate("/crm/new")} className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
            <Plus className="h-4 w-4 mr-2" /> New Customer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or contact..."
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40" />
        </div>
        <select value={stageFilter} onChange={e => { setStageFilter(e.target.value); setSubStageFilter("all"); }}
          className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground focus:outline-none focus:border-primary/40">
          <option value="all">All Stages</option>
          {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {availableSubStages.length > 0 && (
          <select value={subStageFilter} onChange={e => setSubStageFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground focus:outline-none focus:border-primary/40">
            <option value="all">All Sub-Stages</option>
            {availableSubStages.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
        <select value={assignedFilter} onChange={e => setAssignedFilter(e.target.value)}
          className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground focus:outline-none focus:border-primary/40">
          <option value="all">All Assignees</option>
          {uniqueAssignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {/* Product filter pills */}
        <div className="flex flex-wrap gap-1 items-center">
          {PRODUCTS.map(p => (
            <button key={p.value}
              onClick={() => setProductFilter(prev => prev.includes(p.value) ? prev.filter(x => x !== p.value) : [...prev, p.value])}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                productFilter.includes(p.value)
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "bg-white/[0.04] border-white/[0.06] text-muted-foreground hover:text-foreground"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="glass-card rounded-xl overflow-x-auto">
          <div className="flex items-center gap-3 py-2.5 px-4 border-b border-white/[0.06] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[900px]">
            <div className="flex-1 min-w-[180px]">Company</div>
            <div className="w-32">Contact</div>
            <div className="w-48">Products</div>
            <div className="w-28">Stage</div>
            <div className="w-28">Sub-Stage</div>
            <div className="w-28">Assigned To</div>
            <div className="w-24">Last Activity</div>
            <div className="w-16"></div>
          </div>
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No customers found.</div>
          ) : filtered.map(c => (
            <div key={c.id}
              onClick={() => navigate(`/crm/${c.id}`)}
              className="flex items-center gap-3 py-3 px-4 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.04] transition-colors min-w-[900px] cursor-pointer">
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">{c.company_name}</p>
                {c.point_of_contact && <p className="text-xs text-muted-foreground truncate">{c.point_of_contact}</p>}
              </div>
              <div className="w-32 text-xs text-muted-foreground truncate">{c.point_of_contact || "—"}</div>
              <div className="w-48 flex-shrink-0">
                <ProductPills products={c.products} max={3} />
              </div>
              <div className="w-28 flex-shrink-0">
                <StageBadge stage={c.stage} />
              </div>
              <div className="w-28 flex-shrink-0">
                <SubStageBadge subStage={c.sub_stage} />
              </div>
              <div className="w-28 text-xs text-muted-foreground truncate flex-shrink-0">{c.assigned_to || "—"}</div>
              <div className="w-24 text-xs text-muted-foreground flex-shrink-0">
                {c.last_activity_date
                  ? new Date(c.last_activity_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : c.created_date
                  ? new Date(c.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "—"}
              </div>
              <div className="w-16 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-8">
            {STAGES.map(stage => {
              const stageCusts = filtered.filter(c => c.stage === stage.value);
              const cfg = STAGE_CONFIG[stage.value];
              return (
                <div key={stage.value}>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${cfg.bg} ${cfg.text}`}>
                    {stage.label} · {stageCusts.length}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {SUB_STAGES[stage.value].map(sub => {
                      const colCusts = stageCusts.filter(c => c.sub_stage === sub.value);
                      const scfg = SUB_STAGE_CONFIG[sub.value];
                      return (
                        <Droppable key={sub.value} droppableId={`${stage.value}::${sub.value}`}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}
                              className={`rounded-lg p-3 min-h-[120px] transition-colors ${snapshot.isDraggingOver ? "bg-primary/10" : "bg-white/[0.02]"}`}>
                              <div className="flex items-center gap-1.5 mb-3">
                                <span className={`h-2 w-2 rounded-full ${scfg.bg.replace('/15', '')}`} />
                                <span className="text-xs font-semibold text-muted-foreground">{sub.label}</span>
                                <span className="text-[10px] text-muted-foreground ml-auto font-mono">{colCusts.length}</span>
                              </div>
                              <div className="space-y-2">
                                {colCusts.map((c, idx) => (
                                  <Draggable key={c.id} draggableId={c.id} index={idx}>
                                    {(prov, snap) => (
                                      <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                        className={`glass-card rounded-lg p-3 cursor-pointer hover:border-primary/30 transition-all ${snap.isDragging ? "opacity-75 rotate-1" : ""}`}
                                        onClick={() => navigate(`/crm/${c.id}`)}>
                                        <p className="text-xs font-semibold text-foreground truncate">{c.company_name}</p>
                                        {c.point_of_contact && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.point_of_contact}</p>}
                                        {c.products?.length > 0 && (
                                          <div className="mt-1.5">
                                            <ProductPills products={c.products} max={2} small />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            </div>
                          )}
                        </Droppable>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}