const fs = require('fs');

const wsPath = 'frontend/src/routes/workspace.$mindMapId.tsx';
let wsContent = fs.readFileSync(wsPath, 'utf8');

// 1. Add getCurrentUser import if not present
if (!wsContent.includes('getCurrentUser')) {
  const targetImport = 'import { generateAIMindMap,';
  const newImport = 'import { getCurrentUser } from "@/api/auth";\n' + targetImport;
  wsContent = wsContent.replace(targetImport, newImport);
  console.log('✓ Added getCurrentUser import');
}

// 2. Add currentUser state and handleSignOut inside Workspace()
const stateTarget = 'const navigate = useNavigate();';
const stateAddition = `const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<{ full_name?: string; email?: string } | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then(user => setCurrentUser(user))
      .catch(() => {
        // Unauthenticated or offline fallback
      });
  }, []);

  const userInitials = useMemo(() => {
    if (!currentUser?.full_name) return "A";
    const parts = currentUser.full_name.trim().split(/\\s+/);
    if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [currentUser]);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem("access_token");
    toast.success("Signed out successfully");
    navigate({ to: "/login" });
  }, [navigate]);`;

if (!wsContent.includes('const [currentUser, setCurrentUser]') && wsContent.includes(stateTarget)) {
  wsContent = wsContent.replace(stateTarget, stateAddition);
  console.log('✓ Added currentUser state, initials memo, and handleSignOut');
}

// 3. Replace static avatar div with interactive DropdownMenu
const avatarTarget = `          <div
            className="w-8 h-8 rounded-full bg-[#5b50e6] text-white flex items-center justify-center font-semibold text-sm select-none shadow-xs ml-1 cursor-default"
            title="User Account"
          >
            A
          </div>`;

const avatarReplacement = `          {/* User Account Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 rounded-full bg-[#5b50e6] text-white flex items-center justify-center font-semibold text-sm select-none shadow-xs ml-1 hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
                title="User account menu"
                aria-label="User account menu"
              >
                {userInitials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl border border-outline-variant/60 bg-surface">
              {currentUser && (
                <div className="px-3 py-2 border-b border-outline-variant/30 mb-1">
                  <p className="text-label-sm font-semibold text-on-surface truncate">{currentUser.full_name || "User Account"}</p>
                  <p className="text-label-xs text-on-surface-variant truncate">{currentUser.email || ""}</p>
                </div>
              )}
              <DropdownMenuItem
                onClick={() => navigate({ to: "/settings" })}
                className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer hover:bg-surface-container transition-colors"
              >
                <Icon name="person" className="text-[18px] text-on-surface-variant" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate({ to: "/settings" })}
                className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer hover:bg-surface-container transition-colors"
              >
                <Icon name="settings" className="text-[18px] text-on-surface-variant" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-outline-variant/40" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer text-error hover:bg-error/10 transition-colors"
              >
                <Icon name="logout" className="text-[18px]" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>`;

if (wsContent.includes(avatarTarget)) {
  wsContent = wsContent.replace(avatarTarget, avatarReplacement);
  console.log('✓ Replaced static avatar div with interactive account DropdownMenu');
} else {
  console.error('✗ Could not find static avatar div target');
  process.exit(1);
}

fs.writeFileSync(wsPath, wsContent, 'utf8');
console.log('✓ Successfully saved workspace.$mindMapId.tsx');
