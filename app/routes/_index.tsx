import { useState, useEffect, useMemo, useRef } from "react";
import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => [
  { title: "PT ITI Vessels Service Workbook" },
  { name: "description", content: "Crane service tracker — PT ITI Marine & Oilfield Utama" },
];

// ── Google Drive constants ────────────────────────────────────────
const DRIVE_MOVEMENT_CHART =
  "https://docs.google.com/spreadsheets/d/1-Jy4cxSWLpuMj3fqJJI7w99IDthugQeC_TjKds0N9JQ/edit";
const DRIVE_FILES_FOLDER =
  "https://drive.google.com/drive/folders/1Hb5FOj-6DVITJqRP7E_cVopGfCkQ5KK0";
const DRIVE_ROOT_FOLDER =
  "https://drive.google.com/drive/folders/1YocqEV7393DoH8IRDZIHe3XzI_YpjJge";
const BASE44_APP_URL =
  "https://app.base44.com/apps/69e690c443d5ffec78d618c5";

// ── Types ─────────────────────────────────────────────────────────
type JobStatus = "VISITED" | "ONGOING" | "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
type Priority = "CRITICAL" | "HIGH" | "MEDIUM";
type CAStatus = "Not Filed" | "Submitted" | "Approved" | "Transferred" | "Settled";
type ERStatus = "Not Filed" | "Draft" | "Submitted" | "Approved" | "Rejected";
type TimesheetStatus = "Not Filed" | "Filed";
type QuotationApproval = "N/A" | "Pending" | "Approved" | "Rejected";

interface ServiceRecord {
  id: string;
  eta: string;
  endDate: string;
  vesselName: string;
  craneEquipment: string;
  location: string;
  engineer: string;
  jobType: string;
  spkFppRef: string;
  status: JobStatus;
  priority: Priority;
  isDrydock: boolean;
  fppLink: string;
  spkLink: string;
  caStatus: CAStatus;
  erStatus: ERStatus;
  timesheetStatus: TimesheetStatus;
  quotationNo: string;
  quotationApproval: QuotationApproval;
  vendor: string;
  criticalIssue: string;
  remarks: string;
  source?: "drive" | "base44" | "local";
}

const EMPTY: Omit<ServiceRecord, "id"> = {
  eta: "", endDate: "", vesselName: "", craneEquipment: "", location: "",
  engineer: "", jobType: "", spkFppRef: "", status: "SCHEDULED", priority: "HIGH",
  isDrydock: false, fppLink: "", spkLink: "", caStatus: "Not Filed",
  erStatus: "Not Filed", timesheetStatus: "Not Filed", quotationNo: "",
  quotationApproval: "N/A", vendor: "", criticalIssue: "", remarks: "",
};

const STORAGE_KEY = "iti-vessels-v2";

// ── Pre-populated real data from Movement Chart ───────────────────
const SEED_DATA: ServiceRecord[] = [
  {
    id: "mc-1", eta: "2026-04-17", endDate: "2026-04-21",
    vesselName: "KM. Labobar", craneEquipment: "KGW CRANE EHZS 25-18",
    location: "Tanjung Priok, Jakarta", engineer: "Puput / Zuhri",
    jobType: "Repair – Limit Setting",
    spkFppRef: "SP 04.14/08/S-B/TNK/2026 | FPP 04.13.001.RR.131.26",
    status: "VISITED", priority: "CRITICAL", isDrydock: false,
    fppLink: "", spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "Cipta Hoses",
    criticalIssue: "Lowering brake limit not functional",
    remarks: "K6 contactor failing; boom limiter mechanical issues. Replaced manifold block & hoses.", source: "drive",
  },
  {
    id: "mc-2", eta: "2026-04-17", endDate: "2026-04-30",
    vesselName: "KH. Kendhaga Nusantara 11", craneEquipment: "Lelangon Crane",
    location: "Seba Island (Onboard / Sailing)", engineer: "Kevin",
    jobType: "Monitoring + Repair",
    spkFppRef: "Movement Chart Apr 2026",
    status: "VISITED", priority: "HIGH", isDrydock: false,
    fppLink: "", spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "QV043-PNI", quotationApproval: "Pending",
    vendor: "Cipta Hoses",
    criticalIssue: "Hose replacement & slewing solenoid O-ring",
    remarks: "Replaced hoisting valve block/spool and leaking hoses (104 & 132). New spool stuck (used old part).", source: "drive",
  },
  {
    id: "mc-3", eta: "2026-04-17", endDate: "",
    vesselName: "MV. Logistik Nusantara 1", craneEquipment: "Liebherr CBW 45.40/24 3.2T ST",
    location: "Berlian Port, Gresik", engineer: "Puput / Kevin",
    jobType: "Inspection + Load Test",
    spkFppRef: "Contract TH.07.24-02/KP/2025",
    status: "VISITED", priority: "CRITICAL", isDrydock: true,
    fppLink: "", spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "",
    criticalIssue: "Crane 1 noise – lowering brake valve corroded. Defer to drydock.",
    remarks: "Crane 2 load test completed (35T). Luffing cylinder drifting. Corroded bolts delayed block valve removal.", source: "drive",
  },
  {
    id: "mc-4", eta: "2026-04-19", endDate: "",
    vesselName: "KM. Bukit Raya", craneEquipment: "MacGregor Hatch Cover (Pump: MARZOCCHI ALM2-R-20-E1)",
    location: "Tanjung Priok, Jakarta", engineer: "Kevin / Zuhri",
    jobType: "Hatch Cover Pump Inspection",
    spkFppRef: "Movement Chart / DAR Nov–Dec 2025",
    status: "VISITED", priority: "HIGH", isDrydock: false,
    fppLink: "", spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "",
    criticalIssue: "Hatch pump 0 bar – cylinder leaking; pump disassembled Nov 2025.",
    remarks: "Pump overhauled & tank cleaned. Internal leakage T1→T2 and motor pressure reversal identified.", source: "drive",
  },
  {
    id: "mc-5", eta: "2026-04-21", endDate: "",
    vesselName: "KM. Tilongkabila", craneEquipment: "NK Compressor HD40",
    location: "Jakarta", engineer: "Kevin",
    jobType: "Cooler U Bundle – MAC #1",
    spkFppRef: "",
    status: "VISITED", priority: "HIGH", isDrydock: false,
    fppLink: "", spkLink: "", caStatus: "Submitted", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "QV058-PNI", quotationApproval: "Approved",
    vendor: "",
    criticalIssue: "Cooler U bundle choked for MAC #1",
    remarks: "Overhaul NK Compressor. CA submitting.", source: "drive",
  },
  {
    id: "mc-6", eta: "2026-04-22", endDate: "2026-05-15",
    vesselName: "KM. Nggapulu", craneEquipment: "MacGregor Hatch Cover / Deck Machinery",
    location: "PT DKB Galangan Jakarta I", engineer: "Puput / Zuhri",
    jobType: "Sparepart Supply + FRD",
    spkFppRef: "SP 04.16/05/S-B/TNK/2026 | FPP 01.09.002.RR.128.26",
    status: "CANCELLED", priority: "CRITICAL", isDrydock: true,
    fppLink: "https://drive.google.com/file/d/1yHTXOPlM73J2pbmtoCp3kJLFfrwPQked/view",
    spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "",
    criticalIssue: "Hatch cover & cabin deck machinery damaged",
    remarks: "FRD 22 Apr – 15 May 2026. Cancelled.", source: "drive",
  },
  {
    id: "mc-7", eta: "2026-05-03", endDate: "2026-05-03",
    vesselName: "KM. Lambelu", craneEquipment: "Hatch Cover",
    location: "SMI", engineer: "Kevin",
    jobType: "Overhaul",
    spkFppRef: "",
    status: "CANCELLED", priority: "HIGH", isDrydock: true,
    fppLink: "https://drive.google.com/file/d/1gvwQyvoPxleZkNZ_nm-YGBNHUe2t9RnK/view",
    spkLink: "https://drive.google.com/file/d/1gvwQyvoPxleZkNZ_nm-YGBNHUe2t9RnK/view",
    caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "",
    criticalIssue: "Hatch cover cylinder leaking",
    remarks: "Cancelled due to urgent. Cylinder leaking.", source: "drive",
  },
  {
    id: "mc-8", eta: "2026-05-03", endDate: "2026-05-26",
    vesselName: "MV. Logistik Nusantara 1", craneEquipment: "Hatch Cover",
    location: "DPL", engineer: "Puput / Zuhri",
    jobType: "Hose Measurement",
    spkFppRef: "SPB 1776755929",
    status: "SCHEDULED", priority: "HIGH", isDrydock: true,
    fppLink: "", spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "Cipta Hoses",
    criticalIssue: "",
    remarks: "Hatch Cover Hoses, Crane #2 cylinder hoses x 2pc", source: "drive",
  },
  {
    id: "mc-9", eta: "2026-05-12", endDate: "",
    vesselName: "KM. Labobar", craneEquipment: "KGW CRANE EHZS 25-18",
    location: "", engineer: "Puput / Kevin",
    jobType: "Repair – Limit Setting",
    spkFppRef: "FPP 03.25.007.RR.122.26",
    status: "VISITED", priority: "HIGH", isDrydock: false,
    fppLink: "", spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "",
    criticalIssue: "Limit adjustment for luffing scope – change to replacement. Print cards to be replaced.",
    remarks: "", source: "drive",
  },
  {
    id: "mc-10", eta: "2026-05-15", endDate: "2026-06-16",
    vesselName: "KM. Sangiang", craneEquipment: "KGW Schweriner EH2-81/3",
    location: "Galangan Pelni Surya – Surabaya", engineer: "All Team",
    jobType: "Overhaul",
    spkFppRef: "SP 05.06/04/S-B/TNK/2026 | FPP 03.25.007.RR.122.26",
    status: "ONGOING", priority: "HIGH", isDrydock: true,
    fppLink: "", spkLink: "", caStatus: "Approved", erStatus: "Not Filed",
    timesheetStatus: "Filed", quotationNo: "", quotationApproval: "Approved",
    vendor: "Cipta Hoses",
    criticalIssue: "Stiff and cracked hydraulic hoses",
    remarks: "Vessel delayed 13th. IMI to deliver 1 unit A10VO28. Hoses approved under Q-820.", source: "drive",
  },
  {
    id: "mc-11", eta: "2026-05-27", endDate: "2026-05-28",
    vesselName: "KM. Labobar", craneEquipment: "MaK M43",
    location: "Tanjung Priok", engineer: "Kevin / Zuhri",
    jobType: "Supervision",
    spkFppRef: "",
    status: "VISITED", priority: "CRITICAL", isDrydock: false,
    fppLink: "", spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "",
    criticalIssue: "MaK Cylinder Head replacement. ETA Tg. Priok 27 May 7PM, sail 28 May 11AM.",
    remarks: "", source: "drive",
  },
  {
    id: "mc-12", eta: "2026-05-28", endDate: "2026-05-29",
    vesselName: "KM. Bukit Siguntang", craneEquipment: "",
    location: "DKB Priok", engineer: "Kevin / Zuhri",
    jobType: "Inspection + Load Test",
    spkFppRef: "SP 02.11/23/S-B/TNK/2026",
    status: "VISITED", priority: "HIGH", isDrydock: false,
    fppLink: "", spkLink: "https://drive.google.com/file/d/1VadUpl_9bkgrKB5nU4RwWVHvnaiumgf5/view",
    caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "",
    criticalIssue: "Crane inspection (Docking commenced, ETD 7/8 June)",
    remarks: "Hoses approved under Q-820.", source: "drive",
  },
  {
    id: "mc-13", eta: "2026-05-30", endDate: "2026-05-30",
    vesselName: "KM. Ciremai", craneEquipment: "Liebherr CBW 25/22 ST",
    location: "Jakarta", engineer: "Puput / Zuhri",
    jobType: "Monitoring + Repair",
    spkFppRef: "SP 06.02/09/S-B/TNK/2026 | FPP 05.21.001.RR.110.26",
    status: "VISITED", priority: "HIGH", isDrydock: false,
    fppLink: "https://drive.google.com/file/d/1H9W-Vg7U4aDGc3V5qKNkV6GuD06EUU7P/view",
    spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "QY019-PNI", quotationApproval: "Approved",
    vendor: "",
    criticalIssue: "Repair or replace front crane joystick",
    remarks: "IMI to deliver 1 unit oil cooler. To purchase hoisting brake discs.", source: "drive",
  },
  {
    id: "mc-14", eta: "2026-06-01", endDate: "",
    vesselName: "KM. Logistik Nusantara 5", craneEquipment: "Liebherr CBB60",
    location: "DPL", engineer: "",
    jobType: "Monitoring + Repair",
    spkFppRef: "SP 05.12/02/S-B/TNK/2026",
    status: "SCHEDULED", priority: "HIGH", isDrydock: true,
    fppLink: "", spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "QY022-PNI", quotationApproval: "Pending",
    vendor: "",
    criticalIssue: "Troubleshooting, crane #2 luffing limit",
    remarks: "", source: "drive",
  },
  {
    id: "mc-15", eta: "2026-06-03", endDate: "2026-06-04",
    vesselName: "KM. Gunung Dempo", craneEquipment: "",
    location: "Tanjung Priok", engineer: "Kevin / Zuhri",
    jobType: "Overhaul",
    spkFppRef: "SP 02.11/23/S-B/TNK/2026",
    status: "VISITED", priority: "HIGH", isDrydock: false,
    fppLink: "", spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "QV105-PNI", quotationApproval: "Approved",
    vendor: "",
    criticalIssue: "Trial installation of 1 unit cylinder head",
    remarks: "", source: "drive",
  },
  {
    id: "mc-16", eta: "2026-06-03", endDate: "2026-06-25",
    vesselName: "KM. Sinabung", craneEquipment: "KGW type EHZS 25",
    location: "SMI Cilegon", engineer: "Kevin / Zuhri",
    jobType: "Inspection + Load Test",
    spkFppRef: "FPP 03.08.004.RR.118.26",
    status: "CONFIRMED", priority: "HIGH", isDrydock: false,
    fppLink: "https://drive.google.com/file/d/1UgYodKWEfNBiKus6X6W0UK75ulwvZIDs/view",
    spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "",
    criticalIssue: "Calibration and Load Test (25T). Inspect slewing, hoisting and luffing gear pumps.",
    remarks: "", source: "drive",
  },
  {
    id: "mc-17", eta: "2026-06-07", endDate: "2026-06-08",
    vesselName: "KM. Dobonsolo", craneEquipment: "Liebherr CBW 60(40)36/12(17)2",
    location: "Surabaya", engineer: "Puput / Zuhri",
    jobType: "Repair – Limit Setting",
    spkFppRef: "SP 06.09/13/S-B/TNK/2026 | FPP 06.07.001.RR.111.26",
    status: "VISITED", priority: "HIGH", isDrydock: false,
    fppLink: "", spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "",
    criticalIssue: "Adjustment of HiBob wire pressure and replacement of relief valve",
    remarks: "", source: "drive",
  },
  {
    id: "mc-18", eta: "2026-06-13", endDate: "2026-06-14",
    vesselName: "MV. Logistik Nusantara 1", craneEquipment: "Liebherr",
    location: "Berlian Port, Gresik", engineer: "Puput / Zuhri",
    jobType: "Monitoring + Repair",
    spkFppRef: "SP 05.12/02/S-B/TNK/2026 | FPP 06.12/33/FPP/815/2026",
    status: "VISITED", priority: "HIGH", isDrydock: false,
    fppLink: "", spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "",
    criticalIssue: "Crane #1 unable to start",
    remarks: "", source: "drive",
  },
  {
    id: "mc-19", eta: "", endDate: "",
    vesselName: "KM. Labobar", craneEquipment: "KGW CRANE EHZS 25-18",
    location: "Tanjung Priok, Jakarta", engineer: "Puput",
    jobType: "Monitoring + Repair",
    spkFppRef: "SP 07.07/11/S-B/TNK/2026 | FPP 06.15.001.RR.131.26",
    status: "SCHEDULED", priority: "HIGH", isDrydock: false,
    fppLink: "", spkLink: "", caStatus: "Not Filed", erStatus: "Not Filed",
    timesheetStatus: "Not Filed", quotationNo: "", quotationApproval: "N/A",
    vendor: "Cipta Hoses",
    criticalIssue: "Repair and replacement of seals on the As Hydraulic of the deck machinery",
    remarks: "", source: "drive",
  },
];

// ── Badge helpers ─────────────────────────────────────────────────
const STATUS_STYLE: Record<JobStatus, string> = {
  VISITED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  ONGOING: "bg-blue-100 text-blue-800 border border-blue-200",
  SCHEDULED: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  CONFIRMED: "bg-purple-100 text-purple-800 border border-purple-200",
  CANCELLED: "bg-gray-100 text-gray-500 border border-gray-200",
  COMPLETED: "bg-teal-100 text-teal-800 border border-teal-200",
};
const PRIORITY_STYLE: Record<Priority, string> = {
  CRITICAL: "bg-red-100 text-red-800 border border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border border-yellow-200",
};
const CA_STYLE: Record<CAStatus, string> = {
  "Not Filed": "bg-gray-100 text-gray-400 border border-gray-200",
  Submitted: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  Approved: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  Transferred: "bg-blue-100 text-blue-800 border border-blue-200",
  Settled: "bg-teal-100 text-teal-800 border border-teal-200",
};
const ER_STYLE: Record<ERStatus, string> = {
  "Not Filed": "bg-gray-100 text-gray-400 border border-gray-200",
  Draft: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  Submitted: "bg-blue-100 text-blue-800 border border-blue-200",
  Approved: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  Rejected: "bg-red-100 text-red-800 border border-red-200",
};
const TS_STYLE: Record<TimesheetStatus, string> = {
  "Not Filed": "bg-gray-100 text-gray-400 border border-gray-200",
  Filed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
};
const QA_STYLE: Record<QuotationApproval, string> = {
  "N/A": "bg-gray-100 text-gray-400 border border-gray-200",
  Pending: "bg-amber-100 text-amber-800 border border-amber-200",
  Approved: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  Rejected: "bg-red-100 text-red-800 border border-red-200",
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function DriveLink({ href, label }: { href: string; label: string }) {
  if (!href) return <span className="text-gray-300">—</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
      <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.1-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      {label}
    </a>
  );
}

// ── Outlook email compose ─────────────────────────────────────────
function openOutlook(r: ServiceRecord) {
  const sub = encodeURIComponent(
    `[ITI Service] ${r.vesselName} – ${r.jobType} (${r.eta || "TBD"})`
  );
  const body = encodeURIComponent(
    [
      `Vessel    : ${r.vesselName}`,
      `Crane     : ${r.craneEquipment || "—"}`,
      `Location  : ${r.location || "—"}`,
      `ETA       : ${r.eta || "TBD"}${r.endDate ? ` → ${r.endDate}` : ""}`,
      `Engineer  : ${r.engineer || "—"}`,
      `Job Type  : ${r.jobType}`,
      `Ref       : ${r.spkFppRef || "—"}`,
      `Status    : ${r.status}`,
      `Priority  : ${r.priority}`,
      r.isDrydock ? `Drydock   : YES` : "",
      `CA Status : ${r.caStatus}`,
      `ER Status : ${r.erStatus}`,
      `Timesheet : ${r.timesheetStatus}`,
      r.quotationNo ? `Quotation : ${r.quotationNo} [${r.quotationApproval}]` : "",
      r.vendor ? `Vendor    : ${r.vendor}` : "",
      r.criticalIssue ? `\nCritical Issue:\n${r.criticalIssue}` : "",
      r.remarks ? `\nRemarks:\n${r.remarks}` : "",
      r.fppLink ? `\nFPP Doc: ${r.fppLink}` : "",
      r.spkLink ? `SPK Doc: ${r.spkLink}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
  window.open(
    `https://outlook.office.com/mail/deeplink/compose?subject=${sub}&body=${body}`,
    "_blank"
  );
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Base44 ServiceJob → ServiceRecord mapper ──────────────────────
interface B44Job {
  id: string; vessel_name: string; location: string; job_scope: string;
  date_start: string; status: string; engineers: string[];
  service_report_file_url: string | null; spk_received: boolean;
  spk_number: string | null; fpp_received: boolean; fpp_number: string | null;
}

function mapB44(job: B44Job): ServiceRecord {
  const statusMap: Record<string, JobStatus> = {
    "On Going": "ONGOING", "Job Ongoing": "ONGOING",
    "Job Finish": "COMPLETED", "Planned": "SCHEDULED", "Cancelled": "CANCELLED",
    "Invoicing": "COMPLETED", "Invoiced": "COMPLETED",
  };
  return {
    id: `b44-${job.id}`,
    eta: job.date_start ?? "",
    endDate: "",
    vesselName: job.vessel_name ?? "",
    craneEquipment: "",
    location: job.location ?? "",
    engineer: (job.engineers ?? [])[0] ?? "",
    jobType: job.job_scope ?? "",
    spkFppRef: [job.spk_number, job.fpp_number].filter(Boolean).join(" | "),
    status: statusMap[job.status] ?? "SCHEDULED",
    priority: "HIGH",
    isDrydock: false,
    fppLink: "",
    spkLink: "",
    caStatus: "Not Filed",
    erStatus: "Not Filed",
    timesheetStatus: "Not Filed",
    quotationNo: "",
    quotationApproval: job.spk_received ? "Approved" : "Pending",
    vendor: "",
    criticalIssue: "",
    remarks: "",
    source: "base44",
  };
}

// ── Modal ─────────────────────────────────────────────────────────
interface ModalProps {
  record: Omit<ServiceRecord, "id"> | ServiceRecord;
  isEdit: boolean;
  onClose: () => void;
  onSave: (r: Omit<ServiceRecord, "id"> | ServiceRecord) => void;
}

function RecordModal({ record, isEdit, onClose, onSave }: ModalProps) {
  const [f, setF] = useState(record);
  const firstRef = useRef<HTMLInputElement>(null);
  useEffect(() => { firstRef.current?.focus(); }, []);
  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF(prev => ({ ...prev, [k]: v }));
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="label">{children}</label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-4">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Record" : "Add New Record"}
          </h2>
          {f.source === "drive" && (
            <a href={DRIVE_MOVEMENT_CHART} target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <span>📄</span> View in Movement Chart
            </a>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 px-6 py-5 max-h-[70vh] overflow-y-auto">
          {/* Row 1 */}
          <div className="col-span-2">
            <Label>Vessel Name</Label>
            <input ref={firstRef} className="input" value={f.vesselName}
              onChange={e => set("vesselName", e.target.value)} placeholder="e.g. KM. Labobar" />
          </div>
          <div>
            <Label>Crane / Equipment</Label>
            <input className="input" value={f.craneEquipment}
              onChange={e => set("craneEquipment", e.target.value)} placeholder="e.g. KGW CRANE EHZS 25-18" />
          </div>
          <div>
            <Label>Location / Port</Label>
            <input className="input" value={f.location}
              onChange={e => set("location", e.target.value)} placeholder="e.g. Tanjung Priok, Jakarta" />
          </div>
          <div>
            <Label>ETA / Date of Attendance</Label>
            <input type="date" className="input" value={f.eta} onChange={e => set("eta", e.target.value)} />
          </div>
          <div>
            <Label>End Date</Label>
            <input type="date" className="input" value={f.endDate} onChange={e => set("endDate", e.target.value)} />
          </div>
          <div>
            <Label>Engineer</Label>
            <input className="input" value={f.engineer} onChange={e => set("engineer", e.target.value)} placeholder="Engineer name" />
          </div>
          <div>
            <Label>Job Type</Label>
            <input className="input" value={f.jobType} onChange={e => set("jobType", e.target.value)} placeholder="e.g. Repair – Limit Setting" />
          </div>
          <div className="col-span-2">
            <Label>SPK / FPP Reference No.</Label>
            <input className="input" value={f.spkFppRef} onChange={e => set("spkFppRef", e.target.value)} placeholder="SP 00.00/00/S-B/TNK/2026 | FPP 00.00.000.RR.000.26" />
          </div>
          <div>
            <Label>Status</Label>
            <select className="input" value={f.status} onChange={e => set("status", e.target.value as JobStatus)}>
              {(["VISITED","ONGOING","SCHEDULED","CONFIRMED","CANCELLED","COMPLETED"] as JobStatus[]).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>Priority</Label>
            <select className="input" value={f.priority} onChange={e => set("priority", e.target.value as Priority)}>
              {(["CRITICAL","HIGH","MEDIUM"] as Priority[]).map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <Label>CA (Cash Advance) Status</Label>
            <select className="input" value={f.caStatus} onChange={e => set("caStatus", e.target.value as CAStatus)}>
              {(["Not Filed","Submitted","Approved","Transferred","Settled"] as CAStatus[]).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>ER (Expense Report) Status</Label>
            <select className="input" value={f.erStatus} onChange={e => set("erStatus", e.target.value as ERStatus)}>
              {(["Not Filed","Draft","Submitted","Approved","Rejected"] as ERStatus[]).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>Timesheet</Label>
            <select className="input" value={f.timesheetStatus} onChange={e => set("timesheetStatus", e.target.value as TimesheetStatus)}>
              {(["Not Filed","Filed"] as TimesheetStatus[]).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>Drydock?</Label>
            <select className="input" value={f.isDrydock ? "Yes" : "No"} onChange={e => set("isDrydock", e.target.value === "Yes")}>
              <option>No</option><option>Yes</option>
            </select>
          </div>
          {/* Drive links */}
          <div>
            <Label>FPP Doc Link (Google Drive)</Label>
            <div className="flex gap-2">
              <input className="input flex-1" value={f.fppLink} onChange={e => set("fppLink", e.target.value)} placeholder="https://drive.google.com/..." />
              <a href={DRIVE_FILES_FOLDER} target="_blank" rel="noreferrer"
                className="flex-shrink-0 btn-ghost text-xs px-2">📁</a>
            </div>
          </div>
          <div>
            <Label>SPK Doc Link (Google Drive)</Label>
            <div className="flex gap-2">
              <input className="input flex-1" value={f.spkLink} onChange={e => set("spkLink", e.target.value)} placeholder="https://drive.google.com/..." />
              <a href={DRIVE_FILES_FOLDER} target="_blank" rel="noreferrer"
                className="flex-shrink-0 btn-ghost text-xs px-2">📁</a>
            </div>
          </div>
          <div>
            <Label>Quotation No.</Label>
            <input className="input" value={f.quotationNo} onChange={e => set("quotationNo", e.target.value)} placeholder="e.g. QV058-PNI" />
          </div>
          <div>
            <Label>Quotation Approval</Label>
            <select className="input" value={f.quotationApproval} onChange={e => set("quotationApproval", e.target.value as QuotationApproval)}>
              {(["N/A","Pending","Approved","Rejected"] as QuotationApproval[]).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>Vendor</Label>
            <input className="input" value={f.vendor} onChange={e => set("vendor", e.target.value)} placeholder="e.g. Cipta Hoses" />
          </div>
          <div className="col-span-2">
            <Label>Critical Open Issue</Label>
            <input className="input" value={f.criticalIssue} onChange={e => set("criticalIssue", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Remarks / Summary</Label>
            <textarea className="input resize-none" rows={2} value={f.remarks} onChange={e => set("remarks", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => onSave(f)} disabled={!f.vesselName}
            className="btn-primary">{isEdit ? "Save Changes" : "Add Record"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function Index() {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; record: ServiceRecord | null }>({ open: false, record: null });
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [showIntegrations, setShowIntegrations] = useState(false);

  // filters
  const [fVessel, setFVessel] = useState("");
  const [fEngineer, setFEngineer] = useState("");
  const [fStatus, setFStatus] = useState<JobStatus | "All">("All");
  const [fPriority, setFPriority] = useState<Priority | "All">("All");
  const [fCA, setFCA] = useState<CAStatus | "All">("All");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const [sortKey, setSortKey] = useState<keyof ServiceRecord>("eta");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setRecords(raw ? JSON.parse(raw) : SEED_DATA);
    } catch { setRecords(SEED_DATA); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records, loaded]);

  function addRecord(form: Omit<ServiceRecord, "id">) {
    setRecords(p => [{ ...form, id: uid() }, ...p]);
    setModal({ open: false, record: null });
  }
  function updateRecord(form: ServiceRecord) {
    setRecords(p => p.map(r => r.id === form.id ? form : r));
    setModal({ open: false, record: null });
  }
  function deleteRecord(id: string) {
    if (!confirm("Delete this record?")) return;
    setRecords(p => p.filter(r => r.id !== id));
  }

  async function syncBase44() {
    setSyncing(true); setSyncMsg("Syncing from Base44…");
    try {
      const res = await fetch("/api/base44");
      const data = await res.json() as { configured: boolean; jobs?: B44Job[]; error?: string; message?: string };
      if (!data.configured) { setSyncMsg(data.message ?? "Base44 API key not configured."); return; }
      if (data.error) { setSyncMsg(`Error: ${data.error}`); return; }
      const jobs = data.jobs ?? [];
      const existingIds = new Set(records.map(r => r.id));
      const newRecs = jobs.map(mapB44).filter(r => !existingIds.has(r.id));
      if (newRecs.length === 0) { setSyncMsg("All Base44 records already present."); return; }
      setRecords(p => [...p, ...newRecs]);
      setSyncMsg(`✓ Imported ${newRecs.length} new records from Base44 ITI ServiceFlow.`);
    } catch (e) { setSyncMsg(`Sync failed: ${e}`); }
    finally { setSyncing(false); }
  }

  function handleSort(k: keyof ServiceRecord) {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  const vessels = useMemo(() => Array.from(new Set(records.map(r => r.vesselName))).sort(), [records]);
  const engineers = useMemo(() => Array.from(new Set(records.map(r => r.engineer).filter(Boolean))).sort(), [records]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (fVessel && r.vesselName !== fVessel) return false;
      if (fEngineer && r.engineer !== fEngineer) return false;
      if (fStatus !== "All" && r.status !== fStatus) return false;
      if (fPriority !== "All" && r.priority !== fPriority) return false;
      if (fCA !== "All" && r.caStatus !== fCA) return false;
      if (fFrom && r.eta && r.eta < fFrom) return false;
      if (fTo && r.eta && r.eta > fTo) return false;
      return true;
    }).sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [records, fVessel, fEngineer, fStatus, fPriority, fCA, fFrom, fTo, sortKey, sortDir]);

  const stats = useMemo(() => ({
    total: records.length,
    ongoing: records.filter(r => r.status === "ONGOING").length,
    critical: records.filter(r => r.priority === "CRITICAL").length,
    caApproved: records.filter(r => r.caStatus === "Approved").length,
    caPending: records.filter(r => r.caStatus === "Submitted").length,
    erPending: records.filter(r => r.erStatus === "Draft" || r.erStatus === "Submitted").length,
    quotPending: records.filter(r => r.quotationApproval === "Pending").length,
    drydock: records.filter(r => r.isDrydock).length,
  }), [records]);

  function exportCSV() {
    const hdr = ["ETA","End","Vessel","Crane","Location","Engineer","Job Type","SPK/FPP Ref",
      "Status","Priority","Drydock","FPP Link","SPK Link","CA","ER","Timesheet",
      "Quotation No","Quotation Approval","Vendor","Critical Issue","Remarks"];
    const rows = filtered.map(r => [r.eta, r.endDate, r.vesselName, r.craneEquipment,
      r.location, r.engineer, r.jobType, r.spkFppRef, r.status, r.priority,
      r.isDrydock ? "YES" : "No", r.fppLink, r.spkLink, r.caStatus, r.erStatus,
      r.timesheetStatus, r.quotationNo, r.quotationApproval, r.vendor, r.criticalIssue, r.remarks,
    ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[hdr.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "iti-vessels.csv" });
    a.click(); URL.revokeObjectURL(a.href);
  }

  function Th({ k, label }: { k: keyof ServiceRecord; label: string }) {
    return (
      <th className="cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
        onClick={() => handleSort(k)}>
        {label}{sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
      </th>
    );
  }

  const clearFilters = () => {
    setFVessel(""); setFEngineer(""); setFStatus("All");
    setFPriority("All"); setFCA("All"); setFFrom(""); setFTo("");
  };
  const hasFilters = fVessel || fEngineer || fStatus !== "All" || fPriority !== "All" || fCA !== "All" || fFrom || fTo;

  if (!loaded) return <div className="flex h-screen items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-screen-2xl flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">PT ITI Vessels Service Workbook</h1>
            <p className="text-xs text-gray-500 mt-0.5">Crane service tracker · PELNI Fleet · CA · ER · Timesheet</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => setShowIntegrations(p => !p)}
              className={`btn-ghost text-xs ${showIntegrations ? "border-blue-300 text-blue-700" : ""}`}>
              ⚡ Integrations
            </button>
            <button onClick={exportCSV} className="btn-ghost text-xs">Export CSV</button>
            <button onClick={() => setModal({ open: true, record: null })} className="btn-primary text-xs">+ Add Record</button>
          </div>
        </div>
      </header>

      {/* Integrations panel */}
      {showIntegrations && (
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="mx-auto max-w-screen-2xl grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Google Drive */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📁</span>
                <span className="font-semibold text-sm text-gray-800">Google Drive</span>
                <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Connected</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <a href={DRIVE_MOVEMENT_CHART} target="_blank" rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  📊 Service Engineer Movement Chart
                </a>
                <a href={DRIVE_FILES_FOLDER} target="_blank" rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  📂 Upcoming Vessel Schedule Files
                </a>
                <a href={DRIVE_ROOT_FOLDER} target="_blank" rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  📂 Browse Drive Folder
                </a>
              </div>
              <p className="mt-2 text-xs text-gray-400">FPP/SPK links open directly in Drive. Click 📁 in Add/Edit modal to browse.</p>
            </div>

            {/* Outlook */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📧</span>
                <span className="font-semibold text-sm text-gray-800">Microsoft Outlook</span>
                <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Ready</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">Click ✉ on any row to compose a service report email via Outlook 365.</p>
              <button onClick={() => {
                const sub = encodeURIComponent("[ITI] Service Summary – " + new Date().toLocaleDateString());
                const body = encodeURIComponent(
                  `ITI Vessels Service Summary\nGenerated: ${new Date().toLocaleString()}\n\n` +
                  filtered.map(r =>
                    `• ${r.vesselName} (${r.eta || "TBD"}) – ${r.jobType} – ${r.status} [CA: ${r.caStatus}]`
                  ).join("\n")
                );
                window.open(`https://outlook.office.com/mail/deeplink/compose?subject=${sub}&body=${body}`, "_blank");
              }} className="btn-ghost text-xs w-full">✉ Email Full Summary ({filtered.length} records)</button>
            </div>

            {/* Base44 */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔄</span>
                <span className="font-semibold text-sm text-gray-800">Base44 – ITI ServiceFlow</span>
                <a href={BASE44_APP_URL} target="_blank" rel="noreferrer"
                  className="ml-auto text-xs text-blue-600 hover:underline">Open ↗</a>
              </div>
              <p className="text-xs text-gray-500 mb-2">App ID: 69e690c443d5ffec78d618c5 · 18 ServiceJobs in Base44</p>
              <button onClick={syncBase44} disabled={syncing}
                className="btn-primary text-xs w-full disabled:opacity-50 mb-1">
                {syncing ? "Syncing…" : "⬇ Sync from Base44 ServiceFlow"}
              </button>
              {syncMsg && <p className="text-xs text-gray-500 mt-1">{syncMsg}</p>}
              <p className="text-xs text-gray-400 mt-1">Needs BASE44_API_KEY in Cloudflare secrets to pull live data.</p>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-screen-2xl px-6 py-6">
        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { label: "Total", val: stats.total, col: "bg-gray-50 border-gray-200 text-gray-700" },
            { label: "Ongoing", val: stats.ongoing, col: "bg-blue-50 border-blue-100 text-blue-800" },
            { label: "Critical", val: stats.critical, col: "bg-red-50 border-red-100 text-red-800" },
            { label: "Drydock", val: stats.drydock, col: "bg-purple-50 border-purple-100 text-purple-800" },
            { label: "CA Approved", val: stats.caApproved, col: "bg-emerald-50 border-emerald-100 text-emerald-800" },
            { label: "CA Pending", val: stats.caPending, col: "bg-amber-50 border-amber-100 text-amber-800" },
            { label: "ER Pending", val: stats.erPending, col: "bg-orange-50 border-orange-100 text-orange-800" },
            { label: "Quot. Pending", val: stats.quotPending, col: "bg-yellow-50 border-yellow-100 text-yellow-800" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-3 ${s.col}`}>
              <p className="text-2xl font-bold">{s.val}</p>
              <p className="text-xs font-medium opacity-75 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2 items-center">
            <select className="filter-select" value={fVessel} onChange={e => setFVessel(e.target.value)}>
              <option value="">All Vessels</option>
              {vessels.map(v => <option key={v}>{v}</option>)}
            </select>
            <select className="filter-select" value={fEngineer} onChange={e => setFEngineer(e.target.value)}>
              <option value="">All Engineers</option>
              {engineers.map(e => <option key={e}>{e}</option>)}
            </select>
            <select className="filter-select" value={fStatus} onChange={e => setFStatus(e.target.value as JobStatus | "All")}>
              <option value="All">All Status</option>
              {(["VISITED","ONGOING","SCHEDULED","CONFIRMED","CANCELLED","COMPLETED"] as JobStatus[]).map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="filter-select" value={fPriority} onChange={e => setFPriority(e.target.value as Priority | "All")}>
              <option value="All">All Priority</option>
              {(["CRITICAL","HIGH","MEDIUM"] as Priority[]).map(p => <option key={p}>{p}</option>)}
            </select>
            <select className="filter-select" value={fCA} onChange={e => setFCA(e.target.value as CAStatus | "All")}>
              <option value="All">All CA Status</option>
              {(["Not Filed","Submitted","Approved","Transferred","Settled"] as CAStatus[]).map(s => <option key={s}>{s}</option>)}
            </select>
            <input type="date" className="filter-select" value={fFrom} onChange={e => setFFrom(e.target.value)} title="ETA from" />
            <input type="date" className="filter-select" value={fTo} onChange={e => setFTo(e.target.value)} title="ETA to" />
            {hasFilters && <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">Clear</button>}
          </div>
          <p className="mt-2 text-xs text-gray-400">{filtered.length} of {records.length} records</p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm" style={{ minWidth: "1400px" }}>
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <Th k="eta" label="ETA" />
                <Th k="vesselName" label="Vessel" />
                <Th k="craneEquipment" label="Crane / Equipment" />
                <Th k="location" label="Location" />
                <Th k="engineer" label="Engineer" />
                <Th k="jobType" label="Job Type" />
                <Th k="status" label="Status" />
                <Th k="priority" label="Pri." />
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">DD</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">FPP</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">SPK</th>
                <Th k="caStatus" label="CA" />
                <Th k="erStatus" label="ER" />
                <Th k="timesheetStatus" label="T/S" />
                <Th k="quotationNo" label="Quotation" />
                <Th k="quotationApproval" label="Quot. Appvl" />
                <Th k="vendor" label="Vendor" />
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Remarks</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr><td colSpan={19} className="py-16 text-center text-gray-400">No records. Adjust filters or add a record.</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50/70 transition-colors ${r.source === "base44" ? "bg-blue-50/20" : ""}`}>
                  <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-gray-600">
                    {r.eta || <span className="text-gray-300">TBD</span>}
                    {r.endDate && r.endDate !== r.eta && <span className="text-gray-400"> →{r.endDate.slice(5)}</span>}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap max-w-[160px] truncate" title={r.vesselName}>
                    {r.source === "drive" && <span className="mr-1 text-green-500" title="Synced from Drive">●</span>}
                    {r.source === "base44" && <span className="mr-1 text-blue-400" title="Synced from Base44">◆</span>}
                    {r.vesselName}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[160px] truncate" title={r.craneEquipment}>
                    {r.craneEquipment || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{r.location || <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{r.engineer || <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-700 max-w-[140px] truncate" title={r.jobType}>{r.jobType}</td>
                  <td className="px-3 py-2.5"><Badge label={r.status} cls={STATUS_STYLE[r.status]} /></td>
                  <td className="px-3 py-2.5"><Badge label={r.priority} cls={PRIORITY_STYLE[r.priority]} /></td>
                  <td className="px-3 py-2.5 text-center text-xs">{r.isDrydock ? "✓" : ""}</td>
                  <td className="px-3 py-2.5"><DriveLink href={r.fppLink} label="FPP" /></td>
                  <td className="px-3 py-2.5"><DriveLink href={r.spkLink} label="SPK" /></td>
                  <td className="px-3 py-2.5"><Badge label={r.caStatus} cls={CA_STYLE[r.caStatus]} /></td>
                  <td className="px-3 py-2.5"><Badge label={r.erStatus} cls={ER_STYLE[r.erStatus]} /></td>
                  <td className="px-3 py-2.5"><Badge label={r.timesheetStatus} cls={TS_STYLE[r.timesheetStatus]} /></td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{r.quotationNo || <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2.5"><Badge label={r.quotationApproval} cls={QA_STYLE[r.quotationApproval]} /></td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{r.vendor || <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[180px] truncate" title={r.remarks || r.criticalIssue}>
                    {r.criticalIssue
                      ? <span className="text-red-500" title={r.criticalIssue}>⚠ {r.criticalIssue.slice(0, 40)}{r.criticalIssue.length > 40 ? "…" : ""}</span>
                      : (r.remarks || <span className="text-gray-300">—</span>)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openOutlook(r)}
                        className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Email via Outlook">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button onClick={() => setModal({ open: true, record: r })}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Edit">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteRecord(r.id)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Delete">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
        <p className="mt-3 text-xs text-gray-400">
          <span className="mr-3"><span className="text-green-500">●</span> Synced from Drive</span>
          <span className="mr-3"><span className="text-blue-400">◆</span> Synced from Base44</span>
          CA = Cash Advance · ER = Expense Report · T/S = Timesheet · DD = Drydock
        </p>
      </main>

      {modal.open && (
        modal.record
          ? <RecordModal record={modal.record} isEdit onClose={() => setModal({ open: false, record: null })} onSave={f => updateRecord(f as ServiceRecord)} />
          : <RecordModal record={EMPTY} isEdit={false} onClose={() => setModal({ open: false, record: null })} onSave={f => addRecord(f as Omit<ServiceRecord, "id">)} />
      )}
    </div>
  );
}
