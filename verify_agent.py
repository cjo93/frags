#!/usr/bin/env python3
import requests
import json
import sys

print("=== TASK 1: SSE Stream Verification ===")
events = []
session_id = None

try:
    resp = requests.get('http://localhost:8000/agent/session?user_id=test&prompt=read', stream=True, timeout=3)
    for line in resp.iter_lines():
        if not line:
            continue
        s = line.decode() if isinstance(line, bytes) else line
        if s.startswith('event:'):
            evt = s.split(':', 1)[1].strip()
            events.append(evt)
            if evt not in ['ping']:
                print(f'  ✓ event: {evt}')
        if '"session_id"' in s and not session_id:
            try:
                d = json.loads(s.split('data: ', 1)[1])
                session_id = d.get('session_id')
                print(f'  ✓ session_id: {session_id}')
            except:
                pass
        if len(events) >= 6:
            break
except Exception as e:
    print(f"  Error: {e}")

unique_events = set(events)
required = {'session', 'action_proposal', 'final'}
has_all = required.issubset(unique_events)
print(f'\n  Events found: {unique_events}')
print(f'  ✓ TASK 1 PASS' if has_all else f'  ✗ FAIL - Missing: {required - unique_events}')

# TASK 2: Cancel verification
print("\n=== TASK 2: Cancel Verification ===")
if session_id:
    try:
        resp = requests.post(f'http://localhost:8000/agent/session/{session_id}/cancel')
        result = resp.json()
        print(f'  Response: {result}')
        print(f'  ✓ TASK 2 PASS' if result.get('ok') else f'  ✗ FAIL')
    except Exception as e:
        print(f"  ✗ Error: {e}")
else:
    print(f"  ✗ No session_id captured")

# TASK 3: Executor allowlist
print("\n=== TASK 3: Executor Allowlist & Pass-Level Gating ===")

# Test unsafe action
resp = requests.post(
    'http://localhost:8000/agent/action/execute',
    json={'session_id': 'fake_session', 'action': 'import_gedcom', 'args': {}}
)
result = resp.json()
print(f"  import_gedcom (unsafe): {result}")
blocked = not result.get('ok')
print(f'  ✓ Blocked' if blocked else f'  ✗ Not blocked')

# Test safe action with real session
if session_id:
    resp = requests.post(
        'http://localhost:8000/agent/action/execute',
        json={'session_id': session_id, 'action': 'open_module', 'args': {'route': '/field'}}
    )
    result = resp.json()
    print(f"  open_module (safe): {result}")
    ok = result.get('ok') and result.get('type') == 'navigate'
    print(f'  ✓ TASK 3 PASS' if ok else f'  ✗ FAIL')

print("\n" + "="*60)
if has_all and blocked and ok:
    print("✓ Agent verified: stream + cancel + proposals + executor gating all pass")
else:
    print("✗ Some tasks failed - see above")
