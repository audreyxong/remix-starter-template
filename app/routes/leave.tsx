import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => [
  { title: "Leave Summary - June 2026" },
];

type LeaveRow = {
  item: string;
  current: number;
  ytd: number;
  balance: number;
};

const leaveData: LeaveRow[] = [
  { item: "Annual Leave", current: 0.0, ytd: 21.5, balance: -2.0 },
  { item: "Sick Leave",   current: 0.0, ytd: 3.0,  balance: 11.0 },
];

function fmt(n: number) {
  return n.toFixed(2) + " days";
}

function Cell({ value, colored }: { value: number; colored?: boolean }) {
  if (!colored) {
    return <td className="px-4 py-3 text-right text-gray-700">{fmt(value)}</td>;
  }
  const neg = value < 0;
  return (
    <td className={`px-4 py-3 text-right font-semibold ${neg ? "text-red-600" : "text-green-700"}`}>
      {fmt(value)}
    </td>
  );
}

export default function LeaveSummary() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 font-[Inter,sans-serif]">
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leave Summary</h1>
          <p className="text-sm text-gray-500">Period: June 2026</p>
        </div>

        {/* Leave table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Item", "Current", "YTD", "Balance"].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                      h === "Item" ? "text-left" : "text-right"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaveData.map((row) => (
                <tr key={row.item} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{row.item}</td>
                  <Cell value={row.current} />
                  <Cell value={row.ytd} />
                  <Cell value={row.balance} colored />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Justification */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Justification
            </h2>
          </div>
          <div className="px-6 py-5 text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              During the month of <strong>June 2026</strong>, the employee's Annual Leave
              entitlement was fully consumed, resulting in a negative balance of{" "}
              <strong className="text-red-600">-2.00 days</strong>.
            </p>
            <p>
              As the available Annual Leave balance was insufficient to cover all approved
              absences, a total of <strong>3 days</strong> have been classified as{" "}
              <strong>Unpaid Leave (UPL)</strong> and deducted accordingly from the
              June 2026 salary in compliance with company leave policy.
            </p>
            <p>
              The <strong>-2.00 days</strong> negative Annual Leave balance represents
              advance leave that will be offset against future accruals. No further
              Unpaid Leave deductions will apply unless the advance balance remains
              unrecovered and additional absences occur without sufficient entitlement.
            </p>
          </div>

          {/* Deduction breakdown */}
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Deduction Breakdown
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Unpaid Leave (UPL) — June 2026</span>
                <span className="font-semibold text-red-600">3.00 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Annual Leave advance carried forward</span>
                <span className="font-semibold text-red-600">-2.00 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
