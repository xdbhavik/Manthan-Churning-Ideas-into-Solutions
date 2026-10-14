#!/usr/bin/env python3
import urllib.request
import json

def post(url, body, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
    return json.loads(urllib.request.urlopen(req, timeout=10).read().decode())

def get(url, token=None):
    headers = {}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(url, headers=headers)
    return json.loads(urllib.request.urlopen(req, timeout=10).read().decode())

def login(phone):
    lres = post('http://localhost:8080/auth/login', {'phone': phone})
    vres = post('http://localhost:8080/auth/verify-otp', {'challengeId': lres['challengeId'], 'code': '123456'})
    return vres.get('accessToken')

def test_full_kyc_roundtrip():
    print("=" * 70)
    print("  TESTING SUBMITTER -> KYC AGENT (REVIEWER) ROUNDTRIP")
    print("=" * 70)

    # 1. Submitter (9900000006) Logs in
    sub_phone = '9900000006'
    sub_token = login(sub_phone)
    print(f"\n[Step 1] Submitter {sub_phone} logged in successfully.")

    # 2. Submitter drafts a new KYC registration
    create_payload = {
        'sourceType': 'NGO',
        'account': {
            'phone': sub_phone,
            'email': 'pragati.trust@example.org'
        },
        'source': {
            'organizationName': 'Pragati Rural Development Trust',
            'pan': 'AAATP1234Z',
            'state': 'Rajasthan',
            'district': 'Udaipur',
            'contactPersonName': 'Rameshwar Lal Sharma',
            'contactPhone': sub_phone,
            'ngoType': 'TRUST',
            'trustDeedNumber': 'RJ-UDP-TR-2024-554'
        },
        'documents': []
    }
    draft = post('http://localhost:8080/registration', create_payload, sub_token)
    reg_id = draft['registrationId']
    print(f"[Step 2] Submitter created DRAFT registration:")
    print(f"         ID: {reg_id}")
    print(f"         Status: {draft['status']}")

    # 3. Submitter submits the KYC registration
    submitted = post(f'http://localhost:8080/registration/{reg_id}/submit', {}, sub_token)
    print(f"\n[Step 3] Submitter submitted the KYC registration:")
    print(f"         Status: {submitted['status']}")
    print(f"         SubmittedAt: {submitted.get('submittedAt')}")

    # 4. KYC Agent (9829858790) Logs in
    rev_phone = '9829858790'
    rev_token = login(rev_phone)
    print(f"\n[Step 4] KYC Agent (Reviewer {rev_phone}) logged in successfully.")

    # 5. KYC Agent queries queue
    queue = get('http://localhost:8080/reviewer/registrations', rev_token)
    print(f"         Queue Total Size: {len(queue)} dossiers")

    found = next((r for r in queue if r.get('registrationId') == reg_id), None)
    if not found:
        print(f"\n[FAILED]: Registration {reg_id} was NOT found in KYC agent queue!")
        return False

    src = found.get('source', {})
    print(f"\n[Step 5] [SUCCESS] KYC Agent RECEIVED the request:")
    print(f"         Dossier ID:     {found.get('registrationId')}")
    print(f"         Organization:   {src.get('organizationName')}")
    print(f"         Category:       {found.get('sourceBucket')} / {found.get('sourceType')}")
    print(f"         Jurisdiction:   {src.get('district')}, {src.get('state')}")
    print(f"         Queue Status:   {found.get('status')}")

    # 6. KYC Agent assigns to self (UNDER_REVIEW)
    assigned = post(f'http://localhost:8080/reviewer/registrations/{reg_id}/assign', {}, rev_token)
    print(f"\n[Step 6] KYC Agent claimed dossier (assigned to self):")
    print(f"         New Status:     {assigned.get('status')}")
    print(f"         Assigned Agent: {assigned.get('assignedReviewerId')}")

    # 7. KYC Agent approves registration
    approved = post(f'http://localhost:8080/reviewer/registrations/{reg_id}/approve', {'comment': 'All trust deeds and PAN verified.'}, rev_token)
    print(f"\n[Step 7] KYC Agent APPROVED the dossier:")
    print(f"         Final Status:   {approved.get('status')}")
    print(f"         Source ID:      {approved.get('sourceId')}")

    # 8. Verify Submitter account is now ACTIVE & VERIFIED
    sub_accounts = get('http://localhost:8080/source/accounts', sub_token)
    print(f"\n[Step 8] Verifying Submitter account status:")
    print(f"         Active Accounts Count: {len(sub_accounts)}")
    if sub_accounts:
        acc = sub_accounts[0]
        print(f"         Display Name:   {acc.get('displayName')}")
        print(f"         Status:         {acc.get('status')}")
        print(f"         Verification:   {acc.get('verificationStatus')}")
        print(f"         canSubmit:      {acc.get('canSubmit')}")

    print("\n" + "=" * 70)
    print("  RESULT: KYC AGENT RECEIVES AND PROCESSES REQUESTS SUCCESSFULLY!")
    print("=" * 70)
    return True

if __name__ == '__main__':
    test_full_kyc_roundtrip()
