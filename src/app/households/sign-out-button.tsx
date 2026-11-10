"use client";
// Ends the session (deletes the Session row and clears the cookies), then goes to sign-in.
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="min-h-11 rounded-lg border border-foreground/20 px-4 font-medium"
      onClick={async () => {
        await authClient.signOut();
        router.push("/sign-in");
      }}
    >
      Sign out
    </button>
  );
}
