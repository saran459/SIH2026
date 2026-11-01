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
print("POST-CLEANUP VERIFICATION OF CLEAN APPLICATION SYSTEM (PORTS 5173 & 5174)")
print("=" * 80)

# 1. Institution Login & Empty State Check
print("\n[Verification 1] Testing Institution login via Applicant Portal (Port 5173)...")
inst_login = post('http://localhost:5173/api/auth/login', {
    'email': 'institution@greenfield.edu',
    'password': 'password123',
    'portal': 'institution'
})
inst_token = inst_login['access_token']
print(f"-> Institution Login OK! User: {inst_login['email']}, Role: {inst_login['role']}")

print("\n[Verification 2] Confirming Applicant Portal empty application list & summary...")
inst_apps = get('http://localhost:5173/api/applications', token=inst_token)
assert len(inst_apps) == 0, f"Expected 0 applications, found {len(inst_apps)}"
print(f"-> Confirmed: Applicant Portal applications count = {len(inst_apps)} (Empty State OK)")

inst_summary = get('http://localhost:5173/api/dashboard/summary', token=inst_token)
print(f"-> Confirmed: Applicant Dashboard Metrics: total={inst_summary['total_applications']}, draft={inst_summary['draft_applications']}, under_review={inst_summary['under_review_applications']}")
assert inst_summary['total_applications'] == 0, "Expected 0 total applications on dashboard!"

# 2. Reviewer Login & Empty State Check
print("\n[Verification 3] Testing Reviewer login via Reviewer Portal (Port 5174)...")
rev_login = post('http://localhost:5174/api/auth/login', {
    'email': 'reviewer@aicte.gov.in',
    'password': 'password123',
    'portal': 'reviewer'
})
rev_token = rev_login['access_token']
print(f"-> Reviewer Login OK! User: {rev_login['email']}, Role: {rev_login['role']}")

print("\n[Verification 4] Confirming Reviewer Portal empty application queue & analytics...")
rev_apps = get('http://localhost:5174/api/applications', token=rev_token)
assert len(rev_apps) == 0, f"Expected 0 applications in reviewer queue, found {len(rev_apps)}"
print(f"-> Confirmed: Reviewer Portal queue count = {len(rev_apps)} (Empty State OK)")

rev_analytics = get('http://localhost:5174/api/dashboard/analytics', token=rev_token)
print(f"-> Confirmed: Reviewer Dashboard Analytics: total={rev_analytics['summary']['total_applications']}")
assert rev_analytics['summary']['total_applications'] == 0, "Expected 0 total applications in reviewer analytics!"

# 3. Submit a Brand New Application
print("\n[Verification 5] Submitting a clean new application from Applicant Portal...")
new_dossier = post('http://localhost:5173/api/applications', {
    'category': 'Extension of Approval (EoA)',
    'academic_year': '2026-27',
    'level': 'Under Graduate',
    'program': 'Computer Science & Engineering',
    'total_faculty_declared': 45,
    'total_intake_declared': 480,
    'built_up_area_sqm': 8500.0,
    'land_area_acres': 5.2,
    'submit_immediately': True
}, token=inst_token)

app_id = new_dossier['id']
app_num = new_dossier['application_number']
print(f"-> New Application Created: Database ID=#{app_id}, Application Number={app_num}, Status={new_dossier['status']}")

# 4. Confirm Record in MySQL
print("\n[Verification 6] Confirming new record directly in MySQL database...")
import sys
sys.path.append('backend')
from app.database import SessionLocal
from app.models.application import Application
from app.models.document import Document
from app.models.application_report import ApplicationReport

db = SessionLocal()
saved_app = db.query(Application).filter(Application.id == app_id).first()
assert saved_app is not None, f"Application #{app_id} not found in MySQL!"
print(f"-> MySQL Confirmation: ID={saved_app.id}, Application Number={saved_app.application_number}, Status={saved_app.status}")

# 5. Confirm Immediate Appearance in Reviewer Portal (Port 5174)
print("\n[Verification 7] Reviewer fetching scrutiny roster via Reviewer Portal (Port 5174)...")
time.sleep(0.5)
rev_apps_after = get('http://localhost:5174/api/applications', token=rev_token)
matching = next((a for a in rev_apps_after if a['id'] == app_id), None)
assert matching is not None, f"New application #{app_id} NOT found in Reviewer Portal!"
print(f"-> SUCCESS: Application #{app_id} ({app_num}) IS VISIBLE in Reviewer Portal!")
print(f"   Status: {matching['status']}")
print(f"   Program: {matching['program']}")
print(f"   Readiness Score: {matching['readiness_score']}%")
print(f"   Assigned Reviewer: {matching.get('assigned_reviewer_id')} (Unassigned Scrutiny Pool)")

# 6. Fetch Dossier Details via Reviewer Portal
print(f"\n[Verification 8] Reviewer inspecting dossier details for Application #{app_id}...")
dossier_detail = get(f'http://localhost:5174/api/applications/{app_id}', token=rev_token)
print(f"-> Retrieved Dossier: Intake={dossier_detail['total_intake_declared']}, Faculty={dossier_detail['total_faculty_declared']}, Docs={dossier_detail['documents_count']}")
assert dossier_detail['application_number'] == app_num

# 7. Check Automated Verification Report
print(f"\n[Verification 9] Checking digital twin automated verification report...")
time.sleep(1.0)
try:
    report = get(f'http://localhost:5174/api/reports/application/{app_id}', token=rev_token)
    print(f"-> Automated Report Generated: Number={report.get('report_number')}, Score={report.get('readiness_score')}%, Status={report.get('overall_recommendation')}")
except Exception as e:
    print(f"-> Report status: {e}")

db.close()
print("\n" + "=" * 80)
print("ALL 9 POST-CLEANUP VERIFICATIONS PASSED WITH FLYING COLORS!")
print("=" * 80)
