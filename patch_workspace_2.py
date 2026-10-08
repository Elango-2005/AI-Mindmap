import re

with open('frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const [isShareModalOpen, setIsShareModalOpen] = useState(false);', 'const [isShareModalOpen, setIsShareModalOpen] = useState(false);\n  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);')

help_button = """
          <button onClick={() => setIsKeyboardHelpOpen(true)} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Keyboard Shortcuts">
            <Icon name="keyboard" className="text-[20px]" />
          </button>
          <div className="w-px h-4 bg-outline-variant/50 hidden sm:block mx-1" />
"""
content = content.replace('<button onClick={handleUndo}', help_button + '\n          <button onClick={handleUndo}')

help_dialog_ui = """
      {isKeyboardHelpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant/30 rounded-2xl shadow-level-3 w-full max-w-[32rem] p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2"><Icon name="keyboard" /> Keyboard Shortcuts</h2>
              <button onClick={() => setIsKeyboardHelpOpen(false)} className="p-1.5 hover:bg-surface-container rounded-lg text-outline"><Icon name="close" /></button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm text-on-surface-variant mb-6">
              <div className="flex justify-between border-b border-outline-variant/20 py-2"><span>Delete Node / Edge</span><span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">Del / Backspace</span></div>
              <div className="flex justify-between border-b border-outline-variant/20 py-2"><span>Edit Node</span><span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">Enter / Double Click</span></div>
              <div className="flex justify-between border-b border-outline-variant/20 py-2"><span>Cancel Edit</span><span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">Escape</span></div>
              <div className="flex justify-between border-b border-outline-variant/20 py-2"><span>Undo</span><span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">Ctrl + Z</span></div>
              <div className="flex justify-between border-b border-outline-variant/20 py-2"><span>Redo</span><span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">Ctrl + Y / Shift+Ctrl+Z</span></div>
              <div className="flex justify-between border-b border-outline-variant/20 py-2"><span>Pan Canvas</span><span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">Space + Drag</span></div>
            </div>
            <button onClick={() => setIsKeyboardHelpOpen(false)} className="self-end px-4 py-2 bg-primary text-on-primary rounded-full font-medium hover:bg-primary/90">Got it</button>
          </div>
        </div>
      )}
"""
content = content.replace('{confirmAction && (', help_dialog_ui + '\n      {confirmAction && (')

with open('frontend/src/routes/workspace.$mindMapId.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Help Dialog Patch Applied.")
