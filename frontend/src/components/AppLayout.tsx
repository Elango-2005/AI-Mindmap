import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/AppSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Icon } from "@/components/Icon";

export function AppLayout({ children, activeRoute }: { children: React.ReactNode; activeRoute: string }) {
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check auth
    if (!localStorage.getItem("access_token")) {
      navigate({ to: "/login" });
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  if (!isAuthenticated) return null; // Or a loading spinner

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <AppSidebar active={activeRoute} />
      
      {/* Mobile Nav Header */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 flex items-center px-4 z-40">
        <button
          onClick={() => setIsMobileNavOpen(true)}
          className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-container rounded-lg"
        >
          <Icon name="menu" className="text-[24px]" />
        </button>
        <span className="ml-2 font-semibold text-on-surface text-label-lg">MindVault</span>
      </div>

      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <AppSidebar active={activeRoute} showBrand={true} className="flex md:hidden border-none w-full" />
        </SheetContent>
      </Sheet>

      <main className="flex-1 h-full overflow-hidden flex flex-col pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
