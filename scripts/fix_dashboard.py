#!/usr/bin/env python3
import sys

filepath = '/Users/cjo/frags-1/frontend/src/app/dashboard/page.tsx'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Add SpiralEvents section before Disclaimer
spiral_section = '''
        {/* Spiral Events */}
        {user && (
          <section className="mb-12">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-medium">Recent Activity</h2>
              <span className="text-xs text-neutral-400">Spiral log</span>
            </div>
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
              <SpiralEvents userId={user.id} limit={20} autoRefresh />
            </div>
          </section>
        )}

        {/* Disclaimer */'''

content = content.replace('{/* Disclaimer */', spiral_section)

# 2. Add VoiceOverlay before closing </main>
voice_overlay = '''
      {/* Voice Overlay */}
      {user && <VoiceOverlay userId={user.id} />}
    </main>'''

content = content.replace('    </main>', voice_overlay)

with open(filepath, 'w') as f:
    f.write(content)

print("✓ Added SpiralEvents section and VoiceOverlay component")
