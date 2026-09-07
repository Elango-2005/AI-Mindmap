import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/api/auth";
import { updateProfile, uploadAvatar } from "@/api/users";
import { useRef } from "react";

const TITLE = "Settings — MindVault AI";
const DESCRIPTION = "Customize the theme, accent color, interface scaling, and your profile.";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Settings,
});

const SECTIONS = [
  { label: "Profile", icon: "person" },
  { label: "Account", icon: "badge" },
  { label: "Appearance", icon: "palette" },
  { label: "Notifications", icon: "notifications" },
  { label: "API Keys", icon: "key" },
];



function Toggle({ defaultChecked }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(Boolean(defaultChecked));
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors shrink-0",
        on ? "bg-primary" : "bg-surface-variant",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-surface-container-lowest border border-outline-variant transition-transform",
          on && "translate-x-full",
        )}
      />
    </button>
  );
}

function Settings() {
  const [section, setSection] = useState("Appearance");
  
  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "System");

  // Profile state
  const [user, setUser] = useState<{ full_name: string; email: string; profile_image?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // Theme effect
  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "Dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "Light") {
      document.documentElement.classList.remove("dark");
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme]);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex w-[280px] h-full bg-surface border-r border-outline-variant/20 flex-col p-md gap-sm shrink-0">
        <div className="px-md py-lg mb-4">
          <Link
            to="/workspace"
            className="flex items-center gap-sm hover:opacity-80 transition-opacity"
          >
            <Icon name="arrow_back" className="text-on-surface-variant text-xl" />
            <span className="text-label-md text-on-surface-variant">Back to Workspace</span>
          </Link>
          <h1 className="text-headline-lg text-on-surface mt-6">Settings</h1>
        </div>

        <nav className="flex flex-col gap-xs flex-grow">
          {SECTIONS.map((item) => (
            <button
              key={item.label}
              onClick={() => setSection(item.label)}
              className={cn(
                "flex items-center gap-md px-md py-sm rounded-xl transition-all duration-200 text-left",
                section === item.label
                  ? "bg-secondary-fixed text-on-secondary-fixed font-bold shadow-sm translate-x-1"
                  : "text-on-surface-variant hover:bg-surface-container",
              )}
            >
              <Icon name={item.icon} filled={section === item.label} />
              <span className="text-label-md">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-outline-variant/20">
          <a
            href="#help"
            className="text-on-surface-variant flex items-center gap-md px-md py-sm rounded-xl hover:bg-surface-container transition-all duration-200"
          >
            <Icon name="help_outline" />
            <span className="text-label-md">Help Center</span>
          </a>
        </div>
      </aside>

      <main className="flex-grow overflow-y-auto bg-background p-lg md:p-xxl">
        <div className="max-w-3xl mx-auto">
          {section === "Profile" && (
            <>
              <header className="mb-lg border-b border-outline-variant/30 pb-sm">
                <h2 className="text-headline-md text-on-surface">Profile</h2>
                <p className="text-body-md text-on-surface-variant mt-xs">
                  Manage your public profile and personal details.
                </p>
              </header>
              <div className="flex flex-col gap-xl">
                <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant/30 shadow-sm">
                  <div className="mb-md flex justify-between items-center">
                    <h3 className="text-label-md text-on-surface font-semibold">Personal Info</h3>
                    {!isLoading && user && (
                       <button
                         onClick={async () => {
                           if (isEditing) {
                             try {
                               setIsSaving(true);
                               const updated = await updateProfile({ full_name: editName });
                               setUser(updated);
                               setIsEditing(false);
                             } catch (e) {
                               console.error(e);
                               alert("Failed to update profile.");
                             } finally {
                               setIsSaving(false);
                             }
                           } else {
                             setEditName(user.full_name);
                             setIsEditing(true);
                           }
                         }}
                         disabled={isSaving}
                         className="text-primary hover:text-primary-fixed-dim text-label-sm font-bold transition-colors"
                       >
                         {isSaving ? "Saving..." : (isEditing ? "Save" : "Edit")}
                       </button>
                    )}
                  </div>
                  {isLoading ? (
                    <div className="text-label-md text-on-surface-variant">Loading profile...</div>
                  ) : user ? (
                    <div className="flex flex-col gap-lg">
                      <div className="flex items-center gap-lg">
                        <img 
                          src={user.profile_image ? `http://127.0.0.1:8000${user.profile_image}` : "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.full_name)} 
                          alt="Avatar" 
                          className="w-24 h-24 rounded-full object-cover border-4 border-surface shadow-sm"
                        />
                        <div className="flex flex-col gap-2">
                          <div className="text-body-md text-on-surface font-semibold">Profile Picture</div>
                          <div className="text-body-sm text-on-surface-variant">Upload a new avatar (JPG, PNG).</div>
                          
                          <label className="cursor-pointer mt-1 bg-primary text-white hover:bg-primary-fixed-dim text-label-sm font-medium py-2 px-4 rounded-xl transition-colors inline-flex items-center gap-2 w-fit ai-glow shadow-sm">
                            <Icon name="upload" className="text-[16px]" />
                            Upload Image
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  // Optional: Add loading state here if needed
                                  const updated = await uploadAvatar(file);
                                  setUser(updated);
                                } catch (err) {
                                  console.error(err);
                                  alert("Failed to upload avatar. Check console for details.");
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="border-t border-outline-variant/30 pt-md">
                        <label className="text-label-sm text-on-surface-variant">Full Name</label>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="mt-1 w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        ) : (
                          <div className="text-body-lg text-on-surface font-medium mt-1">{user.full_name}</div>
                        )}
                      </div>
                      
                      <div>
                        <label className="text-label-sm text-on-surface-variant">Email</label>
                        <div className="text-body-lg text-on-surface font-medium mt-1 opacity-70">{user.email} <span className="text-[10px] ml-2 bg-surface-container-highest px-2 py-1 rounded-full uppercase tracking-wider">Read Only</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-label-md text-error">Failed to load profile.</div>
                  )}
                </section>
              </div>
            </>
          )}

          {section === "Appearance" && (
            <>
              <header className="mb-lg border-b border-outline-variant/30 pb-sm">
                <h2 className="text-headline-md text-on-surface">Appearance</h2>
                <p className="text-body-md text-on-surface-variant mt-xs">
                  Customize the look and feel of your workspace.
                </p>
              </header>

              <div className="flex flex-col gap-xl">
                {/* Theme */}
                <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant/30 shadow-sm ai-glow">
                  <div className="mb-md">
                    <h3 className="text-label-md text-on-surface font-semibold">Theme Preference</h3>
                    <p className="text-label-md text-on-surface-variant mt-1">
                      Select your preferred color scheme.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-md">
                    {[
                      { name: "Light", icon: "light_mode" },
                      { name: "Dark", icon: "dark_mode" },
                      { name: "System", icon: "contrast" },
                    ].map((option) => (
                      <button
                        key={option.name}
                        onClick={() => setTheme(option.name)}
                        className={cn(
                          "relative rounded-lg overflow-hidden p-1 bg-surface transition-colors",
                          theme === option.name
                            ? "border-2 border-primary shadow-sm"
                            : "border border-outline-variant/30 opacity-70 hover:opacity-100",
                        )}
                      >
                        <div
                          className={cn(
                            "h-24 rounded flex items-center justify-center relative overflow-hidden border",
                            option.name === "Dark"
                              ? "bg-inverse-surface border-outline/20"
                              : option.name === "System"
                                ? "bg-surface-container-highest border-outline-variant/20"
                                : "bg-surface-container-lowest border-outline-variant/20",
                          )}
                        >
                          {option.name === "System" ? (
                            <>
                              <div className="w-1/2 h-full bg-surface-container-lowest" />
                              <div className="w-1/2 h-full bg-inverse-surface" />
                            </>
                          ) : null}
                          <Icon
                            name={option.icon}
                            filled={theme === option.name}
                            className={cn(
                              "absolute text-3xl",
                              option.name === "Dark"
                                ? "text-inverse-on-surface"
                                : theme === option.name
                                  ? "text-primary"
                                  : "text-on-surface",
                            )}
                          />
                        </div>
                        <div
                          className={cn(
                            "text-center mt-2 pb-1 text-label-md",
                            theme === option.name
                              ? "font-bold text-primary"
                              : "text-on-surface-variant",
                          )}
                        >
                          {option.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Motion */}
            <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant/30 shadow-sm">
              <div className="flex justify-between items-center gap-md">
                <div>
                  <h3 className="text-label-md text-on-surface font-semibold">Reduced Motion</h3>
                  <p className="text-label-md text-on-surface-variant mt-1">
                    Minimize animations and transition effects.
                  </p>
                </div>
                <Toggle />
              </div>
              <div className="flex justify-between items-center gap-md mt-md pt-md border-t border-outline-variant/20">
                <div>
                  <h3 className="text-label-md text-on-surface font-semibold">
                    AI Intelligence Glow
                  </h3>
                  <p className="text-label-md text-on-surface-variant mt-1">
                    Show subtle visual cues on AI-enhanced elements.
                  </p>
                </div>
                <Toggle defaultChecked />
              </div>
            </section>
              </div>
            </>
          )}

          {section !== "Profile" && section !== "Appearance" && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <Icon name="construction" className="text-[48px] text-on-surface-variant/50 mb-md" />
              <h2 className="text-headline-md text-on-surface mb-2">{section} Settings</h2>
              <p className="text-body-md text-on-surface-variant max-w-md">
                This section is currently under construction. Check back soon for more customization options!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
