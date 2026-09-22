import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DeviceApproval } from "@/components/device-approval";
import { auth } from "@/lib/auth";

/**
 * Where `ai-tutor login` sends the user to approve its one-time code. Better
 * Auth binds a code to the session that first verifies it, so the page is
 * gated before the code is ever looked up.
 */
export default async function DevicePage({
  searchParams,
}: PageProps<"/device">) {
  const { user_code } = await searchParams;
  const userCode = typeof user_code === "string" ? user_code : "";

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    const back = userCode
      ? `/device?${new URLSearchParams({ user_code: userCode })}`
      : "/device";
    redirect(`/login?${new URLSearchParams({ redirect: back })}`);
  }

  return <DeviceApproval initialCode={userCode} email={session.user.email} />;
}
