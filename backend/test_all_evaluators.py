#!/usr/bin/env python3
import urllib.request
import json
import time

def login_and_test(phone, expected_pool):
    # 1. Login
    lreq = urllib.request.Request('http://localhost:8080/auth/login', 
                                  data=json.dumps({'phone': phone}).encode(), 
                                  headers={'Content-Type': 'application/json'})
    lres = json.loads(urllib.request.urlopen(lreq, timeout=10).read().decode())
    
    # 2. Verify OTP
    vreq = urllib.request.Request('http://localhost:8080/auth/verify-otp', 
                                  data=json.dumps({'challengeId': lres['challengeId'], 'code': lres.get('devOtp', '123456')}).encode(), 
                                  headers={'Content-Type': 'application/json'})
    vres = json.loads(urllib.request.urlopen(vreq, timeout=10).read().decode())
    token = vres.get('accessToken') or vres.get('token')
    
    # 3. Profile
    preq = urllib.request.Request('http://localhost:8080/evaluation/me/profile', 
                                  headers={'Authorization': f'Bearer {token}'})
    prof = json.loads(urllib.request.urlopen(preq, timeout=10).read().decode())
    
    # 4. Assignments
    areq = urllib.request.Request('http://localhost:8080/evaluation/me/assignments', 
                                  headers={'Authorization': f'Bearer {token}'})
    asns = json.loads(urllib.request.urlopen(areq, timeout=15).read().decode())
    
    # 5. Project Reviews
    rreq = urllib.request.Request('http://localhost:8080/evaluation/me/project-reviews', 
                                  headers={'Authorization': f'Bearer {token}'})
    revs = json.loads(urllib.request.urlopen(rreq, timeout=10).read().decode())
    
    print(f"=== {expected_pool} Evaluator ({phone}) ===")
    print(f"  User ID:       {vres.get('user', {}).get('userId')}")
    print(f"  Profile ID:    {prof.get('profileId')}")
    print(f"  Evaluator Pool:{prof.get('evaluatorType')}")
    print(f"  Assignments:   {len(asns)} records")
    for a in asns:
        print(f"    * [{a.get('status')}] Cycle: {a.get('cycleId')} | Problem: {a.get('problemId')}")
    print(f"  Project Reviews: {len(revs)} records")
    for r in revs:
        print(f"    * [{r.get('status')}] {r.get('submissionTitle')} ({r.get('problemTitle')})")
    print()

def main():
    print("Testing Evaluator Portals visibility across all 5 pools:\n")
    evaluators = [
        ("9700000001", "GOVERNMENT"),
        ("9700000002", "INDUSTRY"),
        ("9700000003", "HEI"),
        ("9700000004", "CITIZEN"),
        ("9700000005", "COMMUNITY")
    ]
    for phone, pool in evaluators:
        login_and_test(phone, pool)

if __name__ == '__main__':
    main()
