import Sidebar from "./sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-60 pt-16 pb-16 lg:pt-0 lg:pb-0 page-enter">
        {children}
      </main>
    </div>
  );
}
