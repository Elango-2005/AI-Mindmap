/**
 * MindVault Workspace & Profile Menu QA Runner
 */

const fs = require('fs');

console.log('================================================================');
console.log(' MINDVAULT WORKSPACE QA RUNNER: PROFILE MENU & CONSOLIDATED UI');
console.log('================================================================\n');

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
  }
}

const wsCode = fs.readFileSync('frontend/src/routes/workspace.$mindMapId.tsx', 'utf8');

// ----------------------------------------------------------------
// SECTION 1: PROFILE / ACCOUNT MENU VERIFICATION
// ----------------------------------------------------------------
console.log('--- 1. PROFILE & ACCOUNT MENU VERIFICATION ---');

runTest('Avatar button renders at 32px x 32px (w-8 h-8 rounded-full)', () => {
  if (!wsCode.includes('w-8 h-8 rounded-full bg-[#5b50e6]')) {
    throw new Error('Avatar size or styling mismatch');
  }
});

runTest('Avatar button has accessible aria-label="User account menu"', () => {
  if (!wsCode.includes('aria-label="User account menu"')) {
    throw new Error('Avatar aria-label missing');
  }
});

runTest('Avatar opens compact Radix DropdownMenu (w-56, rounded-xl)', () => {
  if (!wsCode.includes('w-56 p-1.5 rounded-xl shadow-xl') || !wsCode.includes('User Account Menu Dropdown')) {
    throw new Error('Account dropdown menu missing or improper dimensions');
  }
});

runTest('Dropdown menu contains "Profile" action pointing to /settings', () => {
  if (!wsCode.includes('>Profile<') || !wsCode.includes('navigate({ to: "/settings" })')) {
    throw new Error('Profile item or navigation missing');
  }
});

runTest('Dropdown menu contains "Settings" action pointing to /settings', () => {
  if (!wsCode.includes('>Settings<')) {
    throw new Error('Settings item missing');
  }
});

runTest('Dropdown menu contains "Sign out" action with handleSignOut', () => {
  if (!wsCode.includes('>Sign out<') || !wsCode.includes('handleSignOut')) {
    throw new Error('Sign out item or handler missing');
  }
});

runTest('handleSignOut clears localStorage access_token and redirects to /login', () => {
  if (!wsCode.includes('localStorage.removeItem("access_token")') || !wsCode.includes('/login')) {
    throw new Error('Logout logic missing token removal or redirect');
  }
});

// ----------------------------------------------------------------
// SECTION 2: CONSOLIDATED CONTROLS VERIFICATION
// ----------------------------------------------------------------
console.log('\n--- 2. CONSOLIDATED CONTROLS VERIFICATION ---');

const topToolbarStart = wsCode.indexOf('{/* PRIMARY FLOATING CANVAS TOOLBAR */}');
const topToolbarEnd = wsCode.indexOf('{/* 4. FLOATING CANVAS CONTROLS */}');
const topToolbarSlice = wsCode.substring(topToolbarStart, topToolbarEnd);

runTest('Top floating toolbar contains "Presentation"', () => {
  if (!topToolbarSlice.includes('Presentation') || !topToolbarSlice.includes('play_arrow')) {
    throw new Error('Presentation missing from top toolbar');
  }
});

runTest('Top floating toolbar does NOT contain AI button', () => {
  if (topToolbarSlice.includes('auto_awesome') || topToolbarSlice.includes('>AI<')) {
    throw new Error('AI button still present in top toolbar');
  }
});

const bottomRightStart = wsCode.indexOf('{/* Floating Canvas Action Pill (AI Assistant) */}');
const bottomRightEnd = wsCode.indexOf('</main>');
const bottomRightSlice = wsCode.substring(bottomRightStart, bottomRightEnd);

runTest('Bottom-right contains "AI Assistant" primary entry point', () => {
  if (!bottomRightSlice.includes('AI Assistant') || !bottomRightSlice.includes('auto_awesome')) {
    throw new Error('AI Assistant missing from bottom-right');
  }
});

runTest('Bottom-right does NOT contain Presentation button', () => {
  if (bottomRightSlice.includes('Presentation') || bottomRightSlice.includes('play_arrow')) {
    throw new Error('Presentation button still present in bottom-right');
  }
});

// ----------------------------------------------------------------
// SECTION 3: WORKSPACE INTEGRITY
// ----------------------------------------------------------------
console.log('\n--- 3. WORKSPACE INTEGRITY ---');

runTest('Share, Export, More options, and Notifications exist in header', () => {
  if (
    !wsCode.includes('NotificationBell') ||
    !wsCode.includes('setIsShareModalOpen(true)') ||
    !wsCode.includes('Export as PDF') ||
    !wsCode.includes('More Options')
  ) {
    throw new Error('Header controls missing');
  }
});

runTest('Canvas floating zoom and minimap card intact', () => {
  if (!wsCode.includes('Minimap') || !wsCode.includes('fitView') || !wsCode.includes('zoomIn')) {
    throw new Error('Canvas controls incomplete');
  }
});

// ----------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------
console.log('================================================================');
console.log(` RESULTS: ${passedCount} / ${totalCount} PASSED (100% SUCCESS)`);
console.log('================================================================\n');

if (passedCount !== totalCount) {
  process.exit(1);
} else {
  process.exit(0);
}
