"use client";
// Ends the session (deletes the Session row and clears the cookies), then goes to sign-in.
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { buttonSecondary } from "./ui";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={buttonSecondary}
      onClick={async () => {
        await authClient.signOut();
        router.push("/sign-in");
      }}
    >
      Sign out
    </button>
  );
}
