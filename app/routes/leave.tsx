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
  return (n >= 0 ? "" : "") + n.toFixed(2) + " days";
}

function Cell({ value, colored }: { value: number; colored?: boolean }) {
  if (!colored) {
    return <td className="px-4 py-3 text-right text-gray-700">{fmt(value)}</td>;
  }
  const neg = value < 0;
  return (
    <td
      className={`px-4 py-3 text-right font-semibold ${
        neg ? "text-red-600" : "text-green-700"
      }`}
    >
      {fmt(value)}
    </td>
  );
}

export default function LeaveSummary() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 font-[Inter,sans-serif]">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold text-gray-800">Leave Summary</h1>
        <p className="mb-6 text-sm text-gray-500">Period: June 2026</p>

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

        {/* Unpaid leave notice */}
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-6 py-4">
          <p className="text-sm font-medium text-red-800">
            <span className="font-bold">3 days Unpaid Leave</span> deducted from salary in June 2026.
            Annual Leave balance is{" "}
            <span className="font-bold">-2.00 days</span> — advance leave has been applied.
          </p>
        </div>
      </div>
    </div>
  );
}
