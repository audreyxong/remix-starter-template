import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { fetchServiceJobs } from "~/lib/base44.server";

interface Env {
  BASE44_API_KEY?: string;
  BASE44_APP_ID?: string;
}

export async function loader({ context }: LoaderFunctionArgs) {
  const env = (context.cloudflare as { env: Env }).env;
  if (!env.BASE44_API_KEY) {
    return json({ configured: false, jobs: [], message: "Add BASE44_API_KEY as a Cloudflare secret to enable sync." });
  }
  const appId = env.BASE44_APP_ID ?? "69e690c443d5ffec78d618c5";
  try {
    const jobs = await fetchServiceJobs(env.BASE44_API_KEY, appId);
    return json({ configured: true, jobs });
  } catch (e) {
    return json({ configured: true, jobs: [], error: String(e) }, { status: 500 });
  }
}
