const fs = require('fs');

// 1. Update LeftToolPanel.tsx
let leftTool = fs.readFileSync('frontend/src/components/LeftToolPanel.tsx', 'utf8');
const searchLeft = 'id: "vertical" as LayoutDirection,';
if (leftTool.includes(searchLeft) && !leftTool.includes('id: "free" as LayoutDirection,')) {
  const replacementLeft = `id: "vertical" as LayoutDirection,
                  },
                  {
                    id: "free" as LayoutDirection,
                    title: "Free Positioning",
                    desc: "Disable auto-layout. Freely drag and place nodes anywhere on the canvas.",
                    icon: "pan_tool",`;
  // find the full vertical block
  const fullVertical = leftTool.slice(leftTool.indexOf(searchLeft));
  const closingIdx = fullVertical.indexOf('},');
  if (closingIdx !== -1) {
    const originalVerticalBlock = fullVertical.slice(0, closingIdx + 2);
    const updatedVerticalBlock = originalVerticalBlock + `\n                  {\n                    id: "free" as LayoutDirection,\n                    title: "Free Positioning",\n                    desc: "Disable auto-layout. Freely drag and place nodes anywhere on the canvas.",\n                    icon: "pan_tool",\n                  },`;
    leftTool = leftTool.replace(originalVerticalBlock, updatedVerticalBlock);
    fs.writeFileSync('frontend/src/components/LeftToolPanel.tsx', leftTool, 'utf8');
    console.log('Updated LeftToolPanel.tsx');
  }
} else {
  console.log('LeftToolPanel already has free or target not found');
}

// 2. Update Inspector.tsx
let inspector = fs.readFileSync('frontend/src/components/Inspector.tsx', 'utf8');
const searchInspector = '{ key: "vertical" as const, label: "Vertical", icon: "swap_vert" },';
if (inspector.includes(searchInspector) && !inspector.includes('key: "free" as const')) {
  inspector = inspector.replace(
    'grid grid-cols-3 gap-2',
    'grid grid-cols-4 gap-1.5'
  );
  inspector = inspector.replace(
    searchInspector,
    `${searchInspector}\n              { key: "free" as const, label: "Free", icon: "pan_tool" },`
  );
  fs.writeFileSync('frontend/src/components/Inspector.tsx', inspector, 'utf8');
  console.log('Updated Inspector.tsx');
} else {
  console.log('Inspector already has free or target not found');
}
