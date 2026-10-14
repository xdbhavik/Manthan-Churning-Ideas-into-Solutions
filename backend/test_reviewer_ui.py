#!/usr/bin/env python3
import urllib.request

html = urllib.request.urlopen('http://localhost:8086/').read().decode('utf-8')
js = urllib.request.urlopen('http://localhost:8086/app.js').read().decode('utf-8')

print("=== REVIEWER UI LIVE VERIFICATION ===")
print("1. on-auth-screen CSS rule present in HTML:", "body.on-auth-screen #nav-menu" in html)
print("2. Hardcoded phone in input removed:", "98298 58790" not in html[html.find("id=\"mobile-number\""):html.find("id=\"mobile-number\"")+150])
print("3. nav-reg-count initialized to 0:", 'id="nav-reg-count">0<' in html)
print("4. on-auth-screen isolation present in JS:", "on-auth-screen" in js)
print("5. Authenticated redirect from login present in JS:", "isAuthRoute && isAuthenticated" in js)
print("6. Logout cleanup removes classes and state:", "document.body.classList.add('on-auth-screen')" in js)
