import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { LOGO_URL } from "@/lib/assets";
import { cn } from "@/lib/utils";

type NavItem = { label: string; icon: string; to: string };

const NAV: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", to: "/dashboard" },
  { label: "Projects", icon: "folder_open", to: "/projects" },
  { label: "Templates", icon: "auto_awesome_motion", to: "/templates" },
  { label: "History", icon: "history", to: "/history" },
  { label: "Settings", icon: "settings", to: "/settings" },
];

export function AppSidebar({
  active = "Dashboard",
  showBrand = true,
  className,
}: {
  active?: string;
  showBrand?: boolean;
  className?: string;
}) {
  return (
    <aside className={cn("w-[260px] shrink-0 flex flex-col h-full bg-surface-container-lowest border-r border-outline-variant/30 py-6 px-4 gap-2", className ?? "hidden md:flex")}>
      {showBrand && (
        <div className="flex items-center gap-3 px-3 mb-6">
          <img alt="MindVault AI logo" className="w-8 h-8 rounded-lg" src={LOGO_URL} />
          <div>
            <h2 className="text-title-md font-semibold text-on-surface">MindVault</h2>
          </div>
        </div>
      )}

      <nav className="flex-1 flex flex-col gap-1">
        {NAV.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-body-md font-medium",
              active === item.label
                ? "bg-surface-container text-on-surface"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
            )}
          >
            <Icon name={item.icon} className="text-[20px]" filled={active === item.label} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        <Link
          to="/account"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-body-md font-medium",
            active === "Account" 
                ? "bg-surface-container text-on-surface"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          )}
        >
          <Icon name="person" className="text-[20px]" filled={active === "Account"} />
          <span>Account</span>
        </Link>
      </div>
    </aside>
  );
}
