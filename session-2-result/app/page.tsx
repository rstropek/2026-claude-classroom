import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { SignOutButton } from "@/components/sign-out-button";
import { PageHeader } from "@/components/ui/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listTodosFor } from "@/lib/todo-tools";
import { TUTOR_AGENT_ID, tutorThreadId } from "@/lib/tutor";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <PageHeader title="Bartholomew" subtitle={session.user.name}>
        <SignOutButton />
      </PageHeader>
      {/* `flex`, not just `flex-1`: the chat sizes itself by stretching, and a
          block <main> whose own height comes from stretching is indefinite, so
          a percentage height inside it collapses. */}
      <main className="flex flex-1 overflow-hidden bg-ground">
        <Chat
          agentId={TUTOR_AGENT_ID}
          threadId={tutorThreadId(session.user.id)}
          initialTodos={await listTodosFor(db, session.user.id)}
        />
      </main>
    </>
  );
}
