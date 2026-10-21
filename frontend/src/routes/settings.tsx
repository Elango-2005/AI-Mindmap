import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useState, useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/api/auth";
import { updateProfile, uploadAvatar } from "@/api/users";
import { getProjects, type Project } from "@/api/projects";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type NotificationPreferences,
  type NotificationItem,
} from "@/api/notifications";
import { toast } from "sonner";

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
  { label: "Account", icon: "shield" },
  { label: "Appearance", icon: "palette" },
  { label: "Notifications", icon: "notifications" },
  { label: "API / Integrations", icon: "integration_instructions" },
];

interface UserProfile {
  id?: string;
  full_name: string;
  email: string;
  profile_image?: string | null;
  created_at?: string;
}

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Recently";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    return "Recently";
  }
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors shrink-0",
        checked ? "bg-primary" : "bg-surface-variant",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-surface-container-lowest border border-outline-variant transition-transform",
          checked && "translate-x-full",
        )}
      />
    </button>
  );
}

function Settings() {
  const [section, setSection] = useState("Profile");
  
  // Theme state
  const [theme, setTheme] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("theme") || "System" : "System"
  );
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("reducedMotion") === "true" : false
  );

  // Profile state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Notification state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [isNotifSaving, setIsNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  // Notification Inbox state
  const [inboxItems, setInboxItems] = useState<NotificationItem[]>([]);
  const [inboxTotal, setInboxTotal] = useState(0);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [inboxFilter, setInboxFilter] = useState<"all" | "unread">("all");
  const [isInboxLoading, setIsInboxLoading] = useState(false);

  const loadNotificationPreferences = async () => {
    try {
      setIsNotifLoading(true);
      setNotifError(null);
      const data = await getNotificationPreferences();
      setNotifPrefs(data);
    } catch (e: any) {
      console.error(e);
      setNotifError("Couldn't load notification preferences.");
    } finally {
      setIsNotifLoading(false);
    }
  };

  const loadInboxNotifications = async () => {
    try {
      setIsInboxLoading(true);
      const res = await getNotifications({
        limit: 50,
        unread_only: inboxFilter === "unread",
      });
      setInboxItems(res.items);
      setInboxTotal(res.total);
      setInboxUnreadCount(res.unread_count);
    } catch (e) {
      console.error(e);
    } finally {
      setIsInboxLoading(false);
    }
  };

  useEffect(() => {
    if (section === "Notifications") {
      loadNotificationPreferences();
      loadInboxNotifications();
    }
  }, [section, inboxFilter]);

  const handleTogglePref = async (key: keyof NotificationPreferences, val: any) => {
    if (!notifPrefs) return;
    const oldPrefs = { ...notifPrefs };
    setNotifPrefs({ ...notifPrefs, [key]: val });

    try {
      setIsNotifSaving(true);
      const updated = await updateNotificationPreferences({ [key]: val });
      setNotifPrefs(updated);
      toast.success("Preferences updated");
    } catch (e) {
      console.error(e);
      setNotifPrefs(oldPrefs);
      toast.error("Couldn't save notification preferences.");
    } finally {
      setIsNotifSaving(false);
    }
  };

  const handleInboxMarkRead = async (id: string) => {
    try {
      await markAsRead(id);
      setInboxItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      );
      setInboxUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success("Notification marked as read");
    } catch (e) {
      toast.error("Failed to mark as read");
    }
  };

  const handleInboxMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setInboxItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setInboxUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleInboxDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setInboxItems((prev) => prev.filter((item) => item.id !== id));
      setInboxTotal((prev) => Math.max(0, prev - 1));
      toast.success("Notification deleted");
    } catch (e) {
      toast.error("Failed to delete notification");
    }
  };

  const handleInboxClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      handleInboxMarkRead(item.id);
    }
    if (item.link) {
      window.location.href = item.link;
    }
  };
  const [avatarError, setAvatarError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      getCurrentUser().then(setUser),
      getProjects().then(setProjects).catch(() => [])
    ])
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5 MB. Please select a smaller image.");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const updated = await uploadAvatar(file);
      setUser(updated);
      setAvatarError(false);
      toast.success("Profile photo updated");
    } catch (err) {
      console.error(err);
      toast.error("Unable to upload photo. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updateProfile({ full_name: editName.trim() });
      setUser(updated);
      setIsEditing(false);
      toast.success("Changes saved");
    } catch (e) {
      console.error(e);
      toast.error("Unable to save your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

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

  // Reduced motion effect
  useEffect(() => {
    localStorage.setItem("reducedMotion", reducedMotion.toString());
    if (reducedMotion) {
      document.documentElement.classList.add("reduced-motion");
    } else {
      document.documentElement.classList.remove("reduced-motion");
    }
  }, [reducedMotion]);

  return (
    <AppLayout activeRoute="Settings">
      <div className="flex h-full w-full overflow-hidden">
      <aside className="hidden md:flex w-[280px] h-full bg-surface border-r border-outline-variant/20 flex-col p-md gap-sm shrink-0">
        <div className="px-md py-lg mb-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-sm hover:opacity-80 transition-opacity"
          >
            <Icon name="arrow_back" className="text-on-surface-variant" size="sm" />
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
            <div className="flex flex-col gap-8 max-w-2xl">
              <header className="border-b border-outline-variant/30 pb-4">
                <h2 className="text-2xl font-bold text-on-surface tracking-tight">Profile</h2>
                <p className="text-body-md text-on-surface-variant mt-1">
                  Manage your identity, personal information, and workspace presence.
                </p>
              </header>

              {isLoading ? (
                <div className="flex items-center gap-3 py-16 justify-center text-on-surface-variant text-body-md">
                  <Icon name="sync" className="animate-spin text-primary text-[20px]" />
                  <span>Loading profile...</span>
                </div>
              ) : user ? (
                <div className="flex flex-col gap-6">
                  {/* 1. Profile Identity Header Card */}
                  <section className="bg-surface border border-outline-variant/30 rounded-2xl p-6 sm:p-7 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 min-w-0">
                        {/* Circular Avatar (approx 80-96px) with attached camera button */}
                        <div className="relative group shrink-0">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-outline-variant/20 shadow-sm bg-surface-container flex items-center justify-center">
                            {user.profile_image && !avatarError ? (
                              <img
                                src={user.profile_image.startsWith("http") ? user.profile_image : `http://127.0.0.1:8000${user.profile_image}`}
                                alt={`${user.full_name}'s avatar`}
                                onError={() => setAvatarError(true)}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-title-lg sm:text-headline-sm font-bold text-primary select-none">
                                {getInitials(user.full_name)}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                            className="absolute bottom-0 right-0 w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-primary text-on-primary shadow-sm hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all border-2 border-surface flex items-center justify-center cursor-pointer disabled:opacity-50"
                            title="Change profile photo"
                            aria-label="Change profile photo"
                          >
                            <Icon name={isUploadingAvatar ? "sync" : "photo_camera"} className={cn("text-[14px]", isUploadingAvatar && "animate-spin")} />
                          </button>
                        </div>

                        {/* Name, Badge, Email */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <h3 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                            {user.full_name}
                          </h3>
                          <div>
                            <span className="inline-flex items-center text-xs font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                              Personal profile
                            </span>
                          </div>
                          <p className="text-body-sm text-on-surface-variant truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Header Action: Edit profile as primary */}
                      <div className="w-full sm:w-auto shrink-0 flex items-center justify-end">
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleAvatarUpload}
                        />
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditName(user.full_name);
                              setIsEditing(true);
                            }}
                            className="w-full sm:w-auto px-4 py-2 text-label-md font-medium bg-primary text-on-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Icon name="edit" className="text-[16px]" />
                            Edit profile
                          </button>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* 2. Personal Information Section */}
                  <section className="bg-surface border border-outline-variant/30 rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col gap-6">
                    <div className="flex justify-between items-start gap-4 border-b border-outline-variant/20 pb-4">
                      <div>
                        <h3 className="text-title-md font-semibold text-on-surface">Personal information</h3>
                        <p className="text-body-sm text-on-surface-variant mt-0.5">
                          Update the information associated with your MindVault profile.
                        </p>
                      </div>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditName(user.full_name);
                            setIsEditing(true);
                          }}
                          className="text-label-sm font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <Icon name="edit" className="text-[16px]" /> Edit
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleProfileSave} className="flex flex-col gap-5">
                      {/* Full Name */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="full_name" className="text-label-sm font-medium text-on-surface">
                          Full name
                        </label>
                        {isEditing ? (
                          <input
                            id="full_name"
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Enter your full name"
                            autoFocus
                            disabled={isSaving}
                            className="w-full bg-surface-container-lowest border border-primary/60 rounded-xl px-3.5 py-2.5 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-inner"
                          />
                        ) : (
                          <div className="text-body-md text-on-surface font-medium py-1">
                            {user.full_name}
                          </div>
                        )}
                      </div>

                      {/* Email Address */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label htmlFor="email" className="text-label-sm font-medium text-on-surface">
                            Email address
                          </label>
                          <span className="text-xs font-semibold text-outline uppercase tracking-wider bg-surface-container-high px-2 py-0.5 rounded">
                            Read only
                          </span>
                        </div>
                        {isEditing ? (
                          <input
                            id="email"
                            type="email"
                            value={user.email}
                            readOnly
                            disabled
                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-body-md text-on-surface-variant/80 cursor-not-allowed select-none"
                          />
                        ) : (
                          <div className="text-body-md text-on-surface-variant font-medium py-1">
                            {user.email}
                          </div>
                        )}
                        <p className="text-label-xs text-outline mt-0.5">
                          Your email address is managed through your authentication provider and cannot be changed here.
                        </p>
                      </div>

                      {/* Editing Actions */}
                      {isEditing && (
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                          <button
                            type="button"
                            onClick={() => {
                              setEditName(user.full_name);
                              setIsEditing(false);
                            }}
                            disabled={isSaving}
                            className="px-4 py-2 text-label-md font-medium text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSaving || !editName.trim()}
                            className="px-5 py-2 text-label-md font-medium bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                          >
                            {isSaving && <Icon name="sync" className="animate-spin text-[16px]" />}
                            {isSaving ? "Saving..." : "Save changes"}
                          </button>
                        </div>
                      )}
                    </form>
                  </section>

                  {/* 3. Account Overview / Workspace Activity */}
                  <section className="bg-surface border border-outline-variant/30 rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col gap-5">
                    <div className="border-b border-outline-variant/20 pb-4">
                      <h3 className="text-title-md font-semibold text-on-surface">Account overview</h3>
                      <p className="text-body-sm text-on-surface-variant mt-0.5">
                        Summary of your knowledge workspace and activity.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 flex flex-col gap-1">
                        <span className="text-label-xs font-semibold text-outline uppercase tracking-wider">Projects</span>
                        <span className="text-2xl font-bold text-on-surface">{projects.length}</span>
                        <span className="text-[12px] text-on-surface-variant/70">Active workspaces</span>
                      </div>
                      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 flex flex-col gap-1">
                        <span className="text-label-xs font-semibold text-outline uppercase tracking-wider">Mind Maps</span>
                        <span className="text-2xl font-bold text-on-surface">
                          {projects.reduce((acc, p) => acc + (p.mind_maps?.length || 0), 0)}
                        </span>
                        <span className="text-[12px] text-on-surface-variant/70">Created maps</span>
                      </div>
                      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 flex flex-col gap-1">
                        <span className="text-label-xs font-semibold text-outline uppercase tracking-wider">Member Since</span>
                        <span className="text-2xl font-bold text-on-surface">{formatDate(user.created_at)}</span>
                        <span className="text-[12px] text-on-surface-variant/70">Account active</span>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="p-8 text-center bg-surface border border-error/30 rounded-2xl text-error text-body-md">
                  Unable to load profile. Please refresh or check your connection.
                </div>
              )}
            </div>
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
                <Toggle checked={reducedMotion} onChange={setReducedMotion} />
              </div>
              <div className="flex justify-between items-center gap-md mt-md pt-md border-t border-outline-variant/20 hidden">
                <div>
                  <h3 className="text-label-md text-on-surface font-semibold">
                    AI Intelligence Glow
                  </h3>
                  <p className="text-label-md text-on-surface-variant mt-1">
                    Show subtle visual cues on AI-enhanced elements.
                  </p>
                </div>
                <Toggle checked={true} onChange={() => {}} />
              </div>
            </section>
              </div>
            </>
          )}

          {section === "Account" && (
            <>
              <header className="mb-lg border-b border-outline-variant/30 pb-sm">
                <h2 className="text-headline-md text-on-surface">Account</h2>
                <p className="text-body-md text-on-surface-variant mt-xs">
                  Manage your account security and data.
                </p>
              </header>

              <div className="flex flex-col gap-xl">
                <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant/30 shadow-sm">
                  <h3 className="text-label-md text-on-surface font-semibold mb-4">Security</h3>
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                      <div className="text-body-md text-on-surface font-medium">Password</div>
                      <div className="text-body-sm text-on-surface-variant mt-1">Update your password to keep your account secure.</div>
                    </div>
                    <button className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-medium rounded-lg transition-colors border border-outline-variant/30 whitespace-nowrap">
                      Change Password
                    </button>
                  </div>
                </section>

                <section className="bg-error/5 rounded-xl border border-error/20 overflow-hidden">
                  <div className="p-4 border-b border-error/10 bg-error/10">
                    <h3 className="text-label-md text-error font-bold flex items-center gap-2">
                      <Icon name="warning" className="text-[16px]" /> Danger Zone
                    </h3>
                  </div>
                  <div className="p-6 flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-6 border-b border-error/10">
                      <div>
                        <div className="text-body-md text-on-surface font-medium">Log Out</div>
                        <div className="text-body-sm text-on-surface-variant mt-1">Sign out of your account on this device.</div>
                      </div>
                      <button 
                        onClick={() => {
                          localStorage.removeItem("access_token");
                          window.location.href = "/login";
                        }}
                        className="px-4 py-2 bg-surface hover:bg-surface-container-low text-on-surface font-medium rounded-lg transition-colors border border-outline-variant/30 flex items-center gap-2 whitespace-nowrap"
                      >
                        <Icon name="logout" className="text-[16px]" /> Log Out
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div>
                        <div className="text-body-md text-error font-semibold">Delete Account</div>
                        <div className="text-body-sm text-error/80 mt-1">Permanently delete your account and all data.</div>
                      </div>
                      <button 
                        onClick={() => alert("Account deletion disabled in demo.")}
                        className="px-4 py-2 bg-error hover:bg-error/90 text-on-error font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
                      >
                        <Icon name="delete_forever" className="text-[16px]" /> Delete Account
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}

          {section === "Notifications" && (
            <>
              <header className="mb-lg border-b border-outline-variant/30 pb-sm">
                <h2 className="text-headline-md text-on-surface">Notifications</h2>
                <p className="text-body-md text-on-surface-variant mt-xs">
                  Choose what MindVault should notify you about and where those notifications should appear.
                </p>
              </header>

              {isNotifLoading ? (
                <div className="space-y-6 animate-pulse">
                  <div className="h-36 bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6" />
                  <div className="h-64 bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6" />
                </div>
              ) : notifError ? (
                <div className="p-6 bg-error/10 border border-error/20 rounded-xl text-error flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon name="error" className="text-2xl" />
                    <span>{notifError}</span>
                  </div>
                  <button
                    onClick={loadNotificationPreferences}
                    className="px-4 py-1.5 bg-error text-on-error rounded-lg font-medium text-sm shadow-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-xl">
                  {/* Section 1: Notification Channels */}
                  <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant/30 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-label-md text-on-surface font-semibold">Notification channels</h3>
                        <p className="text-label-sm text-on-surface-variant mt-0.5">
                          Receive notifications inside MindVault.
                        </p>
                      </div>
                      {isNotifSaving && (
                        <span className="text-xs text-primary font-medium flex items-center gap-1.5">
                          <Icon name="sync" className="animate-spin text-sm" /> Saving...
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col divide-y divide-outline-variant/20">
                      {/* In-app */}
                      <div className="flex justify-between items-center py-4 gap-4">
                        <div>
                          <div className="text-body-md text-on-surface font-medium">In-app notifications</div>
                          <div className="text-body-sm text-on-surface-variant mt-0.5">
                            Receive notifications inside MindVault.
                          </div>
                        </div>
                        <Toggle
                          checked={notifPrefs?.in_app_enabled ?? true}
                          onChange={(checked) => handleTogglePref("in_app_enabled", checked)}
                        />
                      </div>

                      {/* Email */}
                      <div className="flex justify-between items-center py-4 gap-4">
                        <div>
                          <div className="text-body-md text-on-surface font-medium">Email notifications</div>
                          <div className="text-body-sm text-on-surface-variant mt-0.5">
                            Receive important notifications by email.
                          </div>
                          {!notifPrefs?.email_provider_configured && (
                            <div className="mt-2 text-label-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-lg">
                              <Icon name="info" className="text-[16px] shrink-0" />
                              <span>Email delivery requires provider configuration. Preferences are stored and will automatically apply once an email provider is connected.</span>
                            </div>
                          )}
                        </div>
                        <Toggle
                          checked={notifPrefs?.email_enabled ?? true}
                          onChange={(checked) => handleTogglePref("email_enabled", checked)}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Section 2: Activity (What you want to be notified about) */}
                  <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant/30 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-label-md text-on-surface font-semibold">Activity</h3>
                      <p className="text-label-sm text-on-surface-variant mt-0.5">
                        Control which types of events trigger notifications.
                      </p>
                    </div>

                    <div className="flex flex-col divide-y divide-outline-variant/20">
                      {/* Collaboration */}
                      <div className="flex justify-between items-center py-4 gap-4">
                        <div>
                          <div className="text-body-md text-on-surface font-medium">Collaboration</div>
                          <div className="text-body-sm text-on-surface-variant mt-0.5">
                            Invitations, sharing, and important collaboration activity.
                          </div>
                        </div>
                        <Toggle
                          checked={notifPrefs?.collaboration_enabled ?? true}
                          onChange={(checked) => handleTogglePref("collaboration_enabled", checked)}
                        />
                      </div>

                      {/* AI */}
                      <div className="flex justify-between items-center py-4 gap-4">
                        <div>
                          <div className="text-body-md text-on-surface font-medium">AI activity</div>
                          <div className="text-body-sm text-on-surface-variant mt-0.5">
                            Important AI operations and suggestions.
                          </div>
                        </div>
                        <Toggle
                          checked={notifPrefs?.ai_enabled ?? true}
                          onChange={(checked) => handleTogglePref("ai_enabled", checked)}
                        />
                      </div>

                      {/* Projects & maps */}
                      <div className="flex justify-between items-center py-4 gap-4">
                        <div>
                          <div className="text-body-md text-on-surface font-medium">Projects & maps</div>
                          <div className="text-body-sm text-on-surface-variant mt-0.5">
                            Important project and mind-map activity.
                          </div>
                        </div>
                        <Toggle
                          checked={notifPrefs?.project_enabled ?? true}
                          onChange={(checked) => handleTogglePref("project_enabled", checked)}
                        />
                      </div>

                      {/* Export status */}
                      <div className="flex justify-between items-center py-4 gap-4">
                        <div>
                          <div className="text-body-md text-on-surface font-medium">Export status</div>
                          <div className="text-body-sm text-on-surface-variant mt-0.5">
                            When exports finish or fail.
                          </div>
                        </div>
                        <Toggle
                          checked={notifPrefs?.export_enabled ?? true}
                          onChange={(checked) => handleTogglePref("export_enabled", checked)}
                        />
                      </div>

                      {/* Account & security */}
                      <div className="flex justify-between items-center py-4 gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-body-md text-on-surface font-medium">Account & security</span>
                            <span className="text-xs font-bold uppercase tracking-wider bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant">
                              Always Active
                            </span>
                          </div>
                          <div className="text-body-sm text-on-surface-variant mt-0.5">
                            Important account and security events. Critical security alerts cannot be disabled.
                          </div>
                        </div>
                        <button
                          disabled
                          title="Critical security alerts cannot be disabled"
                          className="opacity-70 cursor-not-allowed"
                        >
                          <Toggle checked={true} onChange={() => {}} />
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Section 3: Email delivery */}
                  <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant/30 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-label-md text-on-surface font-semibold">Email delivery</h3>
                      <p className="text-label-sm text-on-surface-variant mt-0.5">
                        Choose the cadence for email notifications.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {[
                        { id: "important", label: "Important notifications", desc: "Only critical alerts, invitations, and major completions" },
                        { id: "all", label: "All notifications", desc: "Every enabled notification sent as it happens" },
                        { id: "digest", label: "Daily digest", desc: "A daily summary of your activity and notifications" },
                      ].map((opt) => (
                        <label
                          key={opt.id}
                          className={cn(
                            "flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
                            notifPrefs?.email_frequency === opt.id
                              ? "border-primary/50 bg-primary/5"
                              : "border-outline-variant/30 hover:bg-surface-container-low"
                          )}
                        >
                          <input
                            type="radio"
                            name="email_frequency"
                            value={opt.id}
                            checked={notifPrefs?.email_frequency === opt.id}
                            onChange={() => handleTogglePref("email_frequency", opt.id)}
                            className="mt-1 text-primary focus:ring-primary h-4 w-4"
                          />
                          <div>
                            <div className="text-label-md font-medium text-on-surface">{opt.label}</div>
                            <div className="text-body-xs text-on-surface-variant mt-0.5">{opt.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {!notifPrefs?.email_provider_configured && (
                      <p className="text-xs text-on-surface-variant/70 mt-3 italic">
                        * Email delivery requires provider configuration. Selected frequency will take effect once an email provider is connected.
                      </p>
                    )}
                  </section>

                  {/* Section 4: Notification Inbox */}
                  <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant/30 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-label-md text-on-surface font-semibold">Notification Inbox</h3>
                        <p className="text-label-sm text-on-surface-variant mt-0.5">
                          Review and manage all your past notifications.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setInboxFilter("all")}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                            inboxFilter === "all"
                              ? "bg-primary text-on-primary"
                              : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                          )}
                        >
                          All ({inboxTotal})
                        </button>
                        <button
                          onClick={() => setInboxFilter("unread")}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                            inboxFilter === "unread"
                              ? "bg-primary text-on-primary"
                              : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                          )}
                        >
                          Unread ({inboxUnreadCount})
                        </button>
                        {inboxUnreadCount > 0 && (
                          <button
                            onClick={handleInboxMarkAllRead}
                            className="px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors ml-2"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                    </div>

                    {isInboxLoading ? (
                      <div className="p-6 space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-16 bg-surface-container rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : inboxItems.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-3">
                          <Icon name="done_all" className="text-2xl" />
                        </div>
                        <h4 className="text-title-sm font-semibold text-on-surface">You're all caught up</h4>
                        <p className="text-body-sm text-on-surface-variant mt-1 max-w-sm">
                          {inboxFilter === "unread"
                            ? "You have no unread notifications."
                            : "You don't have any notifications yet."}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-outline-variant/20 border border-outline-variant/20 rounded-xl overflow-hidden">
                        {inboxItems.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "p-4 flex items-center justify-between gap-4 transition-colors",
                              item.is_read ? "bg-surface hover:bg-surface-container-low" : "bg-primary/5 hover:bg-primary/10"
                            )}
                          >
                            <div
                              onClick={() => handleInboxClick(item)}
                              className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                            >
                              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0 mt-0.5">
                                <Icon
                                  name={
                                    item.category === "collaboration"
                                      ? "group"
                                      : item.category === "ai"
                                        ? "auto_awesome"
                                        : item.category === "export"
                                          ? "download"
                                          : item.category === "account"
                                            ? "shield"
                                            : "folder"
                                  }
                                  className="text-lg"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-label-md font-semibold", item.is_read ? "text-on-surface" : "text-on-surface font-bold")}>
                                    {item.title}
                                  </span>
                                  {!item.is_read && (
                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                  )}
                                </div>
                                <p className="text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">
                                  {item.message}
                                </p>
                                <span className="text-xs text-on-surface-variant/70 mt-1 block">
                                  {formatDate(item.created_at)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!item.is_read && (
                                <button
                                  onClick={() => handleInboxMarkRead(item.id)}
                                  title="Mark as read"
                                  className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
                                >
                                  <Icon name="check" className="text-lg" />
                                </button>
                              )}
                              <button
                                onClick={() => handleInboxDelete(item.id)}
                                title="Delete notification"
                                className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                              >
                                <Icon name="delete" className="text-lg" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </>
          )}

          {section !== "Profile" && section !== "Appearance" && section !== "Account" && section !== "Notifications" && (
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
    </AppLayout>
  );
}
