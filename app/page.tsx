import Home from "./home";
import { getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const settings = await getSettings();

  return <Home settings={settings} />;
}