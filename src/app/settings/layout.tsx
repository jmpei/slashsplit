// Signed-in pages under /settings share the header with Sign out (#3).
import { SignedInHeader } from "../signed-in-header";

export default function Layout({ children }: LayoutProps<"/settings">) {
  return (
    <>
      <SignedInHeader />
      {children}
    </>
  );
}
