import { useState, useEffect, useMemo, useRef } from "react";
import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => [
  { title: "ITI Vessels Service Workbook" },
  { name: "description", content: "Vessel crane service report tracker" },
];

type ServiceType = "CA" | "ER" | "Timesheet";
type QuotationStatus = "Pending" | "Approved" | "Rejected" | "N/A";
type CraneStatus = "Operational" | "Under Repair" | "Standby" | "Breakdown";

interface ServiceRecord {
  id: string;
  vesselName: string;
  craneStatus: CraneStatus;
  serviceType: ServiceType;
  dateOfAttendance: string;
  engineer: string;
  serviceReportLink: string;
  quotationApproval: QuotationStatus;
  vendor: string;
  remarks: string;
}

const EMPTY_RECORD: Omit<ServiceRecord, "id"> = {
  vesselName: "",
  craneStatus: "Operational",
  serviceType: "CA",
  dateOfAttendance: "",
  engineer: "",
  serviceReportLink: "",
  quotationApproval: "N/A",
  vendor: "",
  remarks: "",
};

const STORAGE_KEY = "iti-vessels-workbook-v1";

const SAMPLE_DATA: ServiceRecord[] = [
  {
    id: "1",
    vesselName: "MV Berlian 1",
    craneStatus: "Under Repair",
    serviceType: "ER",
    dateOfAttendance: "2025-06-10",
    engineer: "Ahmad Razif",
    serviceReportLink: "https://drive.google.com/file/d/sample1",
    quotationApproval: "Approved",
    vendor: "Cipta Hoses",
    remarks: "Hydraulic hose burst on crane #2",
  },
  {
    id: "2",
    vesselName: "MV Berlian 1",
    craneStatus: "Operational",
    serviceType: "CA",
    dateOfAttendance: "2025-06-15",
    engineer: "Faizal Hamdan",
    serviceReportLink: "https://drive.google.com/file/d/sample2",
    quotationApproval: "Approved",
    vendor: "",
    remarks: "Scheduled PM – wire rope lubrication",
  },
  {
    id: "3",
    vesselName: "MV Kencana",
    craneStatus: "Standby",
    serviceType: "Timesheet",
    dateOfAttendance: "2025-06-18",
    engineer: "Ahmad Razif",
    serviceReportLink: "https://drive.google.com/file/d/sample3",
    quotationApproval: "N/A",
    vendor: "",
    remarks: "Standby duty during cargo ops",
  },
  {
    id: "4",
    vesselName: "MV Suria",
    craneStatus: "Breakdown",
    serviceType: "ER",
    dateOfAttendance: "2025-06-20",
    engineer: "Hairul Nizam",
    serviceReportLink: "https://drive.google.com/file/d/sample4",
    quotationApproval: "Pending",
    vendor: "Cipta Hoses",
    remarks: "Slewing motor failure – awaiting parts",
  },
  {
    id: "5",
    vesselName: "MV Kencana",
    craneStatus: "Operational",
    serviceType: "CA",
    dateOfAttendance: "2025-06-22",
    engineer: "Faizal Hamdan",
    serviceReportLink: "https://drive.google.com/file/d/sample5",
    quotationApproval: "Approved",
    vendor: "",
    remarks: "Annual safety inspection",
  },
];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SERVICE_BADGE: Record<ServiceType, string> = {
  CA: "bg-blue-100 text-blue-800 border border-blue-200",
  ER: "bg-red-100 text-red-800 border border-red-200",
  Timesheet: "bg-green-100 text-green-800 border border-green-200",
};

const CRANE_BADGE: Record<CraneStatus, string> = {
  Operational: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  Standby: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  "Under Repair": "bg-orange-100 text-orange-800 border border-orange-200",
  Breakdown: "bg-red-100 text-red-800 border border-red-200",
};

const QUOTATION_BADGE: Record<QuotationStatus, string> = {
  Approved: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  Pending: "bg-amber-100 text-amber-800 border border-amber-200",
  Rejected: "bg-red-100 text-red-800 border border-red-200",
  "N/A": "bg-gray-100 text-gray-500 border border-gray-200",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

interface ModalProps {
  record: Omit<ServiceRecord, "id"> | ServiceRecord;
  onClose: () => void;
  onSave: (r: Omit<ServiceRecord, "id"> | ServiceRecord) => void;
  isEdit: boolean;
}

function RecordModal({ record, onClose, onSave, isEdit }: ModalProps) {
  const [form, setForm] = useState(record);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Record" : "Add New Record"}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 px-6 py-5">
          <div className="col-span-2">
            <label className="label">Vessel Name</label>
            <input
              ref={firstRef}
              className="input"
              value={form.vesselName}
              onChange={(e) => set("vesselName", e.target.value)}
              placeholder="e.g. MV Berlian 1"
            />
          </div>
          <div>
            <label className="label">Date of Attendance</label>
            <input
              type="date"
              className="input"
              value={form.dateOfAttendance}
              onChange={(e) => set("dateOfAttendance", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Engineer</label>
            <input
              className="input"
              value={form.engineer}
              onChange={(e) => set("engineer", e.target.value)}
              placeholder="Engineer name"
            />
          </div>
          <div>
            <label className="label">Service Type</label>
            <select
              className="input"
              value={form.serviceType}
              onChange={(e) => set("serviceType", e.target.value as ServiceType)}
            >
              <option>CA</option>
              <option>ER</option>
              <option>Timesheet</option>
            </select>
          </div>
          <div>
            <label className="label">Crane Status</label>
            <select
              className="input"
              value={form.craneStatus}
              onChange={(e) => set("craneStatus", e.target.value as CraneStatus)}
            >
              <option>Operational</option>
              <option>Standby</option>
              <option>Under Repair</option>
              <option>Breakdown</option>
            </select>
          </div>
          <div>
            <label className="label">Quotation Approval</label>
            <select
              className="input"
              value={form.quotationApproval}
              onChange={(e) => set("quotationApproval", e.target.value as QuotationStatus)}
            >
              <option>N/A</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
          <div>
            <label className="label">Vendor</label>
            <input
              className="input"
              value={form.vendor}
              onChange={(e) => set("vendor", e.target.value)}
              placeholder="e.g. Cipta Hoses"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Service Report Link (Google Drive)</label>
            <input
              className="input"
              value={form.serviceReportLink}
              onChange={(e) => set("serviceReportLink", e.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </div>
          <div className="col-span-2">
            <label className="label">Remarks</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              placeholder="Additional notes"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.vesselName || !form.dateOfAttendance || !form.engineer}
            className="btn-primary"
          >
            {isEdit ? "Save Changes" : "Add Record"}
          </button>
        </div>
      </div>
    </div>
  );
}

type SortKey = keyof ServiceRecord;

export default function Index() {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [filterVessel, setFilterVessel] = useState("");
  const [filterType, setFilterType] = useState<ServiceType | "All">("All");
  const [filterEngineer, setFilterEngineer] = useState("");
  const [filterQuotation, setFilterQuotation] = useState<QuotationStatus | "All">("All");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("dateOfAttendance");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [modal, setModal] = useState<{ open: boolean; record: ServiceRecord | null }>({
    open: false,
    record: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setRecords(raw ? JSON.parse(raw) : SAMPLE_DATA);
    } catch {
      setRecords(SAMPLE_DATA);
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records, loaded]);

  function addRecord(form: Omit<ServiceRecord, "id">) {
    setRecords((prev) => [{ ...form, id: uid() }, ...prev]);
    setModal({ open: false, record: null });
  }

  function updateRecord(form: ServiceRecord) {
    setRecords((prev) => prev.map((r) => (r.id === form.id ? form : r)));
    setModal({ open: false, record: null });
  }

  function deleteRecord(id: string) {
    if (!confirm("Delete this record?")) return;
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const vessels = useMemo(
    () => Array.from(new Set(records.map((r) => r.vesselName))).sort(),
    [records]
  );
  const engineers = useMemo(
    () => Array.from(new Set(records.map((r) => r.engineer))).sort(),
    [records]
  );

  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        if (filterVessel && r.vesselName !== filterVessel) return false;
        if (filterType !== "All" && r.serviceType !== filterType) return false;
        if (filterEngineer && r.engineer !== filterEngineer) return false;
        if (filterQuotation !== "All" && r.quotationApproval !== filterQuotation) return false;
        if (filterFrom && r.dateOfAttendance < filterFrom) return false;
        if (filterTo && r.dateOfAttendance > filterTo) return false;
        return true;
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [records, filterVessel, filterType, filterEngineer, filterQuotation, filterFrom, filterTo, sortKey, sortDir]);

  const stats = useMemo(() => {
    const ca = records.filter((r) => r.serviceType === "CA").length;
    const er = records.filter((r) => r.serviceType === "ER").length;
    const ts = records.filter((r) => r.serviceType === "Timesheet").length;
    const pending = records.filter((r) => r.quotationApproval === "Pending").length;
    const breakdown = records.filter((r) => r.craneStatus === "Breakdown").length;
    return { ca, er, ts, pending, breakdown };
  }, [records]);

  function exportCSV() {
    const headers = [
      "Vessel Name","Crane Status","Service Type","Date of Attendance",
      "Engineer","Service Report Link","Quotation Approval","Vendor","Remarks",
    ];
    const rows = filtered.map((r) =>
      [
        r.vesselName, r.craneStatus, r.serviceType, r.dateOfAttendance,
        r.engineer, r.serviceReportLink, r.quotationApproval, r.vendor, r.remarks,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iti-vessels-workbook.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function Th({ col, label }: { col: SortKey; label: string }) {
    return (
      <th
        className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
        onClick={() => handleSort(col)}
      >
        {label}
        <SortIcon col={col} />
      </th>
    );
  }

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="mx-auto max-w-screen-2xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ITI Vessels Service Workbook</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Crane service report tracker — CA · ER · Timesheet
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn-ghost text-sm">
              Export CSV
            </button>
            <button
              onClick={() => setModal({ open: true, record: null })}
              className="btn-primary text-sm"
            >
              + Add Record
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-6 py-6">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Corrective Action" value={stats.ca} color="blue" />
          <StatCard label="Emergency Repair" value={stats.er} color="red" />
          <StatCard label="Timesheets" value={stats.ts} color="green" />
          <StatCard label="Pending Quotations" value={stats.pending} color="amber" />
          <StatCard label="Crane Breakdowns" value={stats.breakdown} color="orange" />
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <select
              className="filter-select"
              value={filterVessel}
              onChange={(e) => setFilterVessel(e.target.value)}
            >
              <option value="">All Vessels</option>
              {vessels.map((v) => <option key={v}>{v}</option>)}
            </select>
            <select
              className="filter-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ServiceType | "All")}
            >
              <option value="All">All Types</option>
              <option>CA</option>
              <option>ER</option>
              <option>Timesheet</option>
            </select>
            <select
              className="filter-select"
              value={filterEngineer}
              onChange={(e) => setFilterEngineer(e.target.value)}
            >
              <option value="">All Engineers</option>
              {engineers.map((e) => <option key={e}>{e}</option>)}
            </select>
            <select
              className="filter-select"
              value={filterQuotation}
              onChange={(e) => setFilterQuotation(e.target.value as QuotationStatus | "All")}
            >
              <option value="All">All Quotations</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>N/A</option>
            </select>
            <input
              type="date"
              className="filter-select"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              title="From date"
            />
            <input
              type="date"
              className="filter-select"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              title="To date"
            />
            {(filterVessel || filterType !== "All" || filterEngineer || filterQuotation !== "All" || filterFrom || filterTo) && (
              <button
                className="text-sm text-blue-600 hover:underline"
                onClick={() => {
                  setFilterVessel("");
                  setFilterType("All");
                  setFilterEngineer("");
                  setFilterQuotation("All");
                  setFilterFrom("");
                  setFilterTo("");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Showing {filtered.length} of {records.length} records
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <Th col="dateOfAttendance" label="Date" />
                <Th col="vesselName" label="Vessel" />
                <Th col="craneStatus" label="Crane Status" />
                <Th col="serviceType" label="Type" />
                <Th col="engineer" label="Engineer" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Service Report
                </th>
                <Th col="quotationApproval" label="Quotation" />
                <Th col="vendor" label="Vendor" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Remarks
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400">
                    No records found. Try adjusting filters or add a new record.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                    {r.dateOfAttendance}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                    {r.vesselName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={r.craneStatus} className={CRANE_BADGE[r.craneStatus]} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={r.serviceType} className={SERVICE_BADGE[r.serviceType]} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{r.engineer}</td>
                  <td className="px-4 py-3">
                    {r.serviceReportLink ? (
                      <a
                        href={r.serviceReportLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        View
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={r.quotationApproval} className={QUOTATION_BADGE[r.quotationApproval]} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {r.vendor || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="max-w-[200px] px-4 py-3 text-gray-500 truncate" title={r.remarks}>
                    {r.remarks || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setModal({ open: true, record: r })}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        title="Edit"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteRecord(r.id)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {modal.open && (
        modal.record ? (
          <RecordModal
            record={modal.record}
            isEdit
            onClose={() => setModal({ open: false, record: null })}
            onSave={(form) => updateRecord(form as ServiceRecord)}
          />
        ) : (
          <RecordModal
            record={EMPTY_RECORD}
            isEdit={false}
            onClose={() => setModal({ open: false, record: null })}
            onSave={(form) => addRecord(form as Omit<ServiceRecord, "id">)}
          />
        )
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "red" | "green" | "amber" | "orange";
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    red: "bg-red-50 border-red-100 text-red-700",
    green: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    orange: "bg-orange-50 border-orange-100 text-orange-700",
  };
  const numColors = {
    blue: "text-blue-800",
    red: "text-red-800",
    green: "text-emerald-800",
    amber: "text-amber-800",
    orange: "text-orange-800",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className={`text-3xl font-bold ${numColors[color]}`}>{value}</p>
      <p className="mt-1 text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}
