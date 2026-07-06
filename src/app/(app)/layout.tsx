import AppProvider from "@/components/AppProvider";
import Nav from "@/components/Nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <div className="flex min-h-screen">
        <Nav />
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-4xl w-full mx-auto">
          {children}
        </main>
      </div>
    </AppProvider>
  );
}
