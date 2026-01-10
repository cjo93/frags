#!/usr/bin/env python3
import requests
import json
import time

# Start session and wait for metadata to be stored
print('Starting session...')
resp = requests.get('http://localhost:8000/agent/session?user_id=carol&prompt=test', stream=True, timeout=30)
session_id = None
lines_received = 0

for line in resp.iter_lines():
    if line:
        lines_received += 1
        line = line.decode('utf-8')
        if line.startswith('data:'):
            data = json.loads(line[5:].strip())
            if 'session_id' in data:
                session_id = data['session_id']
                print(f'✓ Session ID: {session_id}')
        if lines_received > 4:
            break

resp.close()

if session_id:
    time.sleep(0.5)
    
    # Execute action
    print('\n✓ Executing log_event action...')
    exec_resp = requests.post('http://localhost:8000/agent/action/execute', json={
        'session_id': session_id,
        'action': 'log_event',
        'args': {'kind': 'final_test', 'note': 'with proper user_id'}
    })
    result = exec_resp.json()
    print(json.dumps(result, indent=2))
    
    # Verify in log file
    print('\n✓ Checking Spiral log:')
    with open('/Users/cjo/frags-1/.spiral_logs.jsonl', 'r') as f:
        lines = f.readlines()
        last = json.loads(lines[-1])
        print(f'  user_id: {last["user_id"]}')
        print(f'  event: {last["event"]}')
        
    if last["user_id"] == "carol":
        print('\n✅ SUCCESS: user_id persisted correctly!')
    else:
        print(f'\n❌ FAIL: Expected user_id=carol, got {last["user_id"]}')
else:
    print('❌ FAIL: Could not get session_id')
