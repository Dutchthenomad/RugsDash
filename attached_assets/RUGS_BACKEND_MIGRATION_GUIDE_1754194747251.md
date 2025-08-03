# 🚨 RUGS.FUN BACKEND MIGRATION GUIDE
## Critical Update Required: frontend-version Parameter

**Date:** August 2025  
**Impact:** ALL WebSocket connections to rugs.fun backend  
**Priority:** HIGH - Connections will fail without this update

---

## 📋 SUMMARY

The rugs.fun backend has been updated to require a `frontend-version=1.0` parameter in all Socket.IO connection URLs. **ALL existing scripts must be updated** or they will fail to connect.

### ✅ WHAT WORKS NOW:
```
https://backend.rugs.fun?frontend-version=1.0
```

### ❌ WHAT NO LONGER WORKS:
```
https://backend.rugs.fun
wss://backend.rugs.fun
```

---

## 🔧 REQUIRED CHANGES BY FILE TYPE

### 1. JAVASCRIPT/NODE.JS CONNECTIONS

#### ❌ OLD (Will Fail):
```javascript
const socket = io('https://backend.rugs.fun', {
    reconnection: true,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling']
});
```

#### ✅ NEW (Required):
```javascript
const socket = io('https://backend.rugs.fun?frontend-version=1.0', {
    reconnection: true,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling']
});
```

### 2. PYTHON CONNECTIONS

#### ❌ OLD (Will Fail):
```python
import socketio
sio = socketio.Client()
sio.connect('https://backend.rugs.fun')
```

#### ✅ NEW (Required):
```python
import socketio
sio = socketio.Client()
sio.connect('https://backend.rugs.fun?frontend-version=1.0')
```

### 3. HTML/BROWSER CONNECTIONS

#### ❌ OLD (Will Fail):
```html
<script>
const socket = io('https://backend.rugs.fun');
</script>
```

#### ✅ NEW (Required):
```html
<script>
const socket = io('https://backend.rugs.fun?frontend-version=1.0');
</script>
```

---

## 📂 FILES THAT NEED UPDATES

Based on your codebase analysis, update these files:

### 🎯 PRIORITY 1 - Core Connection Scripts
- [ ] `src/ai/websocket-manager.js` (Line ~50)
- [ ] `src/ui/mobile-dashboard.html` (Line ~1740)
- [ ] `new-version-study/socket-test.py` ✅ (Already Fixed)

### 🎯 PRIORITY 2 - Dashboard & UI Files
- [ ] `GRAD-STUDY/03-IMPLEMENTATION/UI/basic-rugs-dashboard.html` (Line ~316)
- [ ] `test-dashboard.html` (Check for Socket.IO connections)

### 🎯 PRIORITY 3 - Documentation & Examples
- [ ] `GRAD-STUDY/01-CORE-SPECS/rugs-websocket-complete-guide.md` (Line ~25)
- [ ] `GRAD-STUDY/SideBetSysArc/websocket_integration_corrected.md` (Line ~31)

---

## 🔍 SEARCH & REPLACE PATTERNS

Use these patterns to quickly find and update all instances:

### Pattern 1: Basic URL
**Find:** `'https://backend.rugs.fun'`  
**Replace:** `'https://backend.rugs.fun?frontend-version=1.0'`

### Pattern 2: Double Quotes
**Find:** `"https://backend.rugs.fun"`  
**Replace:** `"https://backend.rugs.fun?frontend-version=1.0"`

### Pattern 3: WSS Protocol (If Any)
**Find:** `'wss://backend.rugs.fun'`  
**Replace:** `'https://backend.rugs.fun?frontend-version=1.0'`

### Pattern 4: Configuration Objects
**Find:**
```javascript
url: 'https://backend.rugs.fun'
```
**Replace:**
```javascript
url: 'https://backend.rugs.fun?frontend-version=1.0'
```

---

## ⚡ QUICK VALIDATION SCRIPT

Use this to test if your connection works:

```python
# quick-test.py
import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print("✅ Connection successful!")

@sio.event
def connect_error(data):
    print(f"❌ Connection failed: {data}")

try:
    sio.connect('https://backend.rugs.fun?frontend-version=1.0')
    time.sleep(2)
    print("✅ Backend migration successful!")
except Exception as e:
    print(f"❌ Still broken: {e}")
finally:
    if sio.connected:
        sio.disconnect()
```

---

## 🚨 CRITICAL REMINDERS

### 1. **NO OTHER CHANGES NEEDED**
- Event handlers remain the same
- Data structures unchanged  
- Only the connection URL requires the parameter

### 2. **CONNECTION BEHAVIOR**
- Engine.IO still works fine
- Only Socket.IO namespace needs the parameter
- Anti-bot protection still in effect

### 3. **TESTING CHECKLIST**
- [ ] Connection establishes successfully
- [ ] Receiving `gameStateUpdate` events
- [ ] Receiving `newTrade` events  
- [ ] No connection errors in logs
- [ ] Data matches expected format

---

## 📞 DEBUGGING TIPS

### If Connection Still Fails:
1. **Check the exact URL** - parameter must be exactly `frontend-version=1.0`
2. **Verify no typos** - common mistake: `frontendversion` vs `frontend-version`
3. **Test with browser first** - Open dev tools and confirm working URL
4. **Check for caching** - Clear any cached connection configurations

### Success Indicators:
- Console shows "✅ Connection established!"
- Receiving live game data every ~250ms
- No "namespace failed to connect" errors

---

## 📝 CHANGELOG TRACKING

**Version:** Post-August 2025 Backend Update  
**Breaking Change:** frontend-version parameter now required  
**Backward Compatibility:** None - old URLs will fail  
**Migration Time:** ~30 minutes for typical codebase

---

**📌 Save this file and reference it during your migration process!**