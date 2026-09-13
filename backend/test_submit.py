import urllib.request
import json

req = urllib.request.Request('http://localhost:8090/auth/login', data=json.dumps({'phone':'9876543210'}).encode(), headers={'Content-Type':'application/json'})
d = json.loads(urllib.request.urlopen(req).read().decode())
vreq = urllib.request.Request('http://localhost:8090/auth/verify-otp', data=json.dumps({'challengeId':d['challengeId'], 'code':d.get('devOtp','123456')}).encode(), headers={'Content-Type':'application/json'})
token = json.loads(urllib.request.urlopen(vreq).read().decode())['accessToken']

# Get submissions
sreq = urllib.request.Request('http://localhost:8090/portal/submissions', headers={'Authorization': f'Bearer {token}'})
subs = json.loads(urllib.request.urlopen(sreq).read().decode())
for s in subs:
    print(s['submissionId'], s['title'], s['status'])

draft = next((s for s in subs if s['status'] == 'DRAFT'), None)
if draft:
    print('Submitting draft:', draft['title'])
    sub_url = f"http://localhost:8090/portal/submissions/{draft['submissionId']}/submit"
    sub_req = urllib.request.Request(sub_url, data=b'', headers={'Authorization': f'Bearer {token}'})
    res = urllib.request.urlopen(sub_req)
    res_data = json.loads(res.read().decode())
    print('SUCCESS! New status:', res_data['status'], 'Reviewer User ID:', res_data.get('reviewerUserId'))
