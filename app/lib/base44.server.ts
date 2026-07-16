const BASE_URL = "https://api.base44.com/api/apps";

export interface B44ServiceJob {
  id: string;
  vessel_name: string;
  customer: string;
  location: string;
  job_scope: string;
  date_start: string;
  date_end: string | null;
  status: string;
  engineers: string[];
  service_report_file_url: string | null;
  spk_received: boolean;
  spk_number: string | null;
  fpp_received: boolean;
  fpp_number: string | null;
  is_drydock: boolean;
  total_cost: number | null;
}

export interface B44Engineer {
  id: string;
  name: string;
  email: string;
  role_title: string;
  is_active: boolean;
}

export interface B44CashAdvance {
  id: string;
  ca_number: string;
  engineer: string;
  vessel_name: string;
  purpose: string;
  period_from: string;
  period_to: string;
  status: string;
  requested_amount: number;
}

export interface B44ExpenseReport {
  id: string;
  er_number: string;
  engineer: string;
  submission_date: string;
  actual_total: number;
  status: string;
}

async function b44Get<T>(apiKey: string, appId: string, entity: string, params = ""): Promise<T[]> {
  const url = `${BASE_URL}/${appId}/entities/${entity}/?limit=200&sort=-date_start${params}`;
  const res = await fetch(url, { headers: { "api-key": apiKey } });
  if (!res.ok) throw new Error(`Base44 ${entity} error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { entities: T[] };
  return data.entities ?? [];
}

export async function fetchServiceJobs(apiKey: string, appId: string) {
  return b44Get<B44ServiceJob>(apiKey, appId, "ServiceJob");
}

export async function fetchEngineers(apiKey: string, appId: string) {
  return b44Get<B44Engineer>(apiKey, appId, "Engineer", "&sort=name");
}

export async function fetchCashAdvances(apiKey: string, appId: string) {
  return b44Get<B44CashAdvance>(apiKey, appId, "CashAdvance", "&sort=-period_from");
}

export async function fetchExpenseReports(apiKey: string, appId: string) {
  return b44Get<B44ExpenseReport>(apiKey, appId, "ExpenseReport", "&sort=-submission_date");
}
