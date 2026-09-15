import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DeviceApproval } from "@/components/device-approval";
import { auth } from "@/lib/auth";

/**
 * Where `ai-tutor login` sends the user. Claiming a code binds it to the
 * session that verifies it, so the user signs in first and comes back here.
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

  return (
    <DeviceApproval
      initialCode={userCode}
      account={`${session.user.name} (${session.user.email})`}
    />
  );
}
