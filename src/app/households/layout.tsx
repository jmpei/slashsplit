// Signed-in pages under /households share the header with Sign out (#3).
import { SignedInHeader } from "../signed-in-header";

export default function Layout({ children }: LayoutProps<"/households">) {
  return (
    <>
      <SignedInHeader />
      {children}
    </>
  );
}
