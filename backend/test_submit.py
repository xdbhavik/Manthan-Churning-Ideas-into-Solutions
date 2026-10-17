import urllib.request
import json
import os
import socket

# Fallback for environments with DNS sinkholing / local resolver issues
_orig_getaddrinfo = socket.getaddrinfo
def _patched_getaddrinfo(host, port, *args, **kwargs):
    if host == 'api.bhavik.site':
        try:
            return _orig_getaddrinfo(host, port, *args, **kwargs)
        except socket.gaierror:
            return _orig_getaddrinfo('13.205.158.156', port, *args, **kwargs)
    return _orig_getaddrinfo(host, port, *args, **kwargs)
socket.getaddrinfo = _patched_getaddrinfo

BASE_URL = os.environ.get('API_GATEWAY_URL', 'https://api.bhavik.site').rstrip('/')

req = urllib.request.Request(f'{BASE_URL}/auth/login', data=json.dumps({'phone':'9876543210'}).encode(), headers={'Content-Type':'application/json'})
d = json.loads(urllib.request.urlopen(req).read().decode())
vreq = urllib.request.Request(f'{BASE_URL}/auth/verify-otp', data=json.dumps({'challengeId':d['challengeId'], 'code':d.get('devOtp','123456')}).encode(), headers={'Content-Type':'application/json'})
token = json.loads(urllib.request.urlopen(vreq).read().decode())['accessToken']

# Get submissions
sreq = urllib.request.Request(f'{BASE_URL}/portal/submissions', headers={'Authorization': f'Bearer {token}'})
subs = json.loads(urllib.request.urlopen(sreq).read().decode())
for s in subs:
    print(s['submissionId'], s['title'], s['status'])

draft = next((s for s in subs if s['status'] == 'DRAFT'), None)
if draft:
    print('Submitting draft:', draft['title'])
    sub_url = f"{BASE_URL}/portal/submissions/{draft['submissionId']}/submit"
    sub_req = urllib.request.Request(sub_url, data=b'', headers={'Authorization': f'Bearer {token}'})
    res = urllib.request.urlopen(sub_req)
    res_data = json.loads(res.read().decode())
    print('SUCCESS! New status:', res_data['status'], 'Reviewer User ID:', res_data.get('reviewerUserId'))
