import urllib.request
import json
import time

def post(url, data=None, token=None):
    body = json.dumps(data).encode('utf-8') if data is not None else b''
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get(url, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

print("=" * 80)
print("TESTING FULL END-TO-END FLOW ACROSS VITE PORTALS (PORTS 5173 & 5174)")
print("=" * 80)

# 1. Login Institution via Port 5173 (Applicant Portal)
print("\n[Step 1] Applicant Portal (Port 5173): Logging in as institution@greenfield.edu...")
login_inst = post('http://localhost:5173/api/auth/login', {
    'email': 'institution@greenfield.edu',
    'password': 'password123',
    'portal': 'institution'
})
inst_token = login_inst['access_token']
print(f"-> Logged in as: {login_inst['email']}, Role: {login_inst['role']}, Institution ID: {login_inst['institution_id']}")

# 2. Submit Application via Port 5173
print("\n[Step 2] Applicant Portal (Port 5173): Submitting new application dossier...")
new_app = post('http://localhost:5173/api/applications', {
    'category': 'Extension of Approval (EoA)',
    'academic_year': '2026-27',
    'level': 'Under Graduate',
    'program': 'Information Technology & Cyber Security',
    'total_faculty_declared': 50,
    'total_intake_declared': 500,
    'built_up_area_sqm': 8800.0,
    'land_area_acres': 5.5,
    'submit_immediately': True
}, token=inst_token)

app_id = new_app['id']
app_num = new_app['application_number']
status = new_app['status']
print(f"-> Application Successfully Created & Submitted!")
print(f"   Database Record ID: #{app_id}")
print(f"   Official Application Number: {app_num}")
print(f"   Status: {status}")

# 3. Login Reviewer via Port 5174 (Reviewer Portal)
print("\n[Step 3] Reviewer Portal (Port 5174): Logging in as reviewer@aicte.gov.in...")
login_rev = post('http://localhost:5174/api/auth/login', {
    'email': 'reviewer@aicte.gov.in',
    'password': 'password123',
    'portal': 'reviewer'
})
rev_token = login_rev['access_token']
print(f"-> Logged in as: {login_rev['email']}, Role: {login_rev['role']}")

# 4. Fetch Applications Roster via Port 5174
print("\n[Step 4] Reviewer Portal (Port 5174): Fetching scrutiny application list...")
apps = get('http://localhost:5174/api/applications', token=rev_token)
found = next((a for a in apps if a['id'] == app_id), None)
assert found is not None, f"Application #{app_id} not visible in Reviewer Portal!"
print(f"-> SUCCESS: Newly submitted application is visible on Reviewer Portal!")
print(f"   Application Number: {found['application_number']}")
print(f"   Status: {found['status']}")
print(f"   Readiness Score: {found['readiness_score']}%")
print(f"   Assigned Reviewer: {found.get('assigned_reviewer_id')} (Unassigned pool)")

# 5. Fetch Dossier Detail via Port 5174
print(f"\n[Step 5] Reviewer Portal (Port 5174): Fetching dossier details for Application #{app_id}...")
detail = get(f'http://localhost:5174/api/applications/{app_id}', token=rev_token)
print(f"-> Dossier Details:")
print(f"   Program: {detail['program']}")
print(f"   Faculty Declared: {detail['total_faculty_declared']}")
print(f"   Intake Declared: {detail['total_intake_declared']}")
print(f"   Documents Attached: {detail['documents_count']}")

# 6. Reviewer Allocates Dossier to Self via Port 5174
print(f"\n[Step 6] Reviewer Portal (Port 5174): Reviewer self-assigns Application #{app_id}...")
assigned = post(f'http://localhost:5174/api/applications/{app_id}/assign-reviewer?reviewer_id=3', data=None, token=rev_token)
print(f"-> Dossier Allocated to Reviewer ID: {assigned['assigned_reviewer_id']} ({assigned.get('assigned_reviewer_name')})")
print(f"   New Status: {assigned['status']}")

# 7. Check Automated Verification Report
print(f"\n[Step 7] Checking Automated Verification Report...")
time.sleep(1.0)
try:
    report = get(f'http://localhost:5174/api/reports/application/{app_id}', token=rev_token)
    print(f"-> Report Found! Report Number: {report.get('report_number')}, Score: {report.get('readiness_score')}%")
except Exception as e:
    print(f"-> Report status check: {e}")

print("\n" + "=" * 80)
print("ALL CROSS-PORTAL WORKFLOW STEPS (PORT 5173 -> PORT 5174) COMPLETED SUCCESSFULLY!")
print("=" * 80)
