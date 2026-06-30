import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => [
  { title: "Leave Summary - June 2026" },
];

type LeaveRecord = {
  type: string;
  opening: number;
  taken: number;
  closing: number;
  unpaid: number;
};

const juneLeaveRecord: LeaveRecord = {
  type: "Annual Leave",
  opening: 5,
  taken: 7,
  closing: -2,
  unpaid: 3,
};

function Badge({ value }: { value: number }) {
  const isNegative = value < 0;
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-sm font-semibold ${
        isNegative
          ? "bg-red-100 text-red-700"
          : "bg-green-100 text-green-700"
      }`}
    >
      {value > 0 ? `+${value}` : value} days
    </span>
  );
}

export default function LeaveSummary() {
  const record = juneLeaveRecord;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-[Inter,sans-serif]">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold text-gray-800">Leave Summary</h1>
        <p className="mb-6 text-sm text-gray-500">Period: June 2026</p>

        {/* Leave Balance Card */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Leave Balance
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            <Row label="Opening Balance" value={record.opening} showBadge />
            <Row label="Annual Leave Taken" value={-record.taken} showBadge />
            <Row
              label="Closing Balance"
              value={record.closing}
              showBadge
              highlight={record.closing < 0 ? "negative" : "positive"}
            />
          </div>
        </div>

        {/* Unpaid Leave Card */}
        <div className="mb-4 rounded-xl border border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-100 px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-red-500">
              Unpaid Leave Deduction
            </h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Unpaid Leave — June 2026</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  Salary deducted for days taken without leave balance
                </p>
              </div>
              <span className="rounded bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                3 days
              </span>
            </div>
          </div>
        </div>

        {/* Summary Banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-4">
          <p className="text-sm font-medium text-amber-800">
            Your leave balance for June 2026 is{" "}
            <span className="font-bold text-red-600">-2 days</span>, and{" "}
            <span className="font-bold">3 days</span> of Unpaid Leave have been deducted from your salary.
          </p>
        </div>
      </div>
    </div>
  );
}

type RowProps = {
  label: string;
  value: number;
  showBadge?: boolean;
  highlight?: "positive" | "negative";
};

function Row({ label, value, highlight }: RowProps) {
  return (
    <div
      className={`flex items-center justify-between px-6 py-4 ${
        highlight === "negative" ? "bg-red-50" : highlight === "positive" ? "bg-green-50" : ""
      }`}
    >
      <span
        className={`text-sm font-medium ${
          highlight ? (highlight === "negative" ? "text-red-700" : "text-green-700") : "text-gray-700"
        }`}
      >
        {label}
      </span>
      <Badge value={value} />
    </div>
  );
}
