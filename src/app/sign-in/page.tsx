// Sign-in page (#3). Google when its credentials are set; the test login only outside production.
import { googleSignInEnabled, testLoginEnabled } from "@/server/auth";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <SignInForm google={googleSignInEnabled()} testLogin={testLoginEnabled()} />
    </main>
  );
}
