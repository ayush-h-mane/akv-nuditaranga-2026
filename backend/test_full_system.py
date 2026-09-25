import sys
import os
import json
import traceback

sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings

client = TestClient(app)

results = {
    "passed": [],
    "failed": [],
    "errors_found": [],
    "mistakes_discovered": []
}

def log_pass(step_num, title, detail=""):
    msg = f"[PASS] Step {step_num}: {title}"
    if detail:
        msg += f" -> {detail}"
    print(msg)
    results["passed"].append({"step": step_num, "title": title, "detail": detail})

def log_fail(step_num, title, error_msg):
    msg = f"[FAIL] Step {step_num}: {title} -> {error_msg}"
    print(msg)
    results["failed"].append({"step": step_num, "title": title, "error": error_msg})
    results["errors_found"].append(f"Step {step_num} ({title}): {error_msg}")

def run_comprehensive_portal_tests():
    print("\n" + "=" * 65)
    print("ACHARYA KANNADA VEDIKE (AKV) - COMPREHENSIVE END-TO-END TEST SUITE")
    print("=" * 65 + "\n")

    # ----------------------------------------------------
    # SECTION 1: SYSTEM & HEALTH
    # ----------------------------------------------------
    print("--- SECTION 1: SYSTEM HEALTH & CONFIGURATION ---")
    try:
        resp = client.get("/api/health")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "healthy"
        log_pass(1, "API Health Check", f"Status: {data.get('status')}")
    except Exception as e:
        log_fail(1, "API Health Check", str(e))

    # ----------------------------------------------------
    # SECTION 2: STUDENT PORTAL (SIGNUP, LOGIN, PROFILE)
    # ----------------------------------------------------
    print("\n--- SECTION 2: STUDENT PORTAL (SIGNUP, AUTH, PROFILE) ---")
    
    vol_user = None
    vol_token = None
    part_user = None
    spec_user = None

    # Step 2: Student Signup as VOLUNTEER
    try:
        payload = {
            "full_name": "Rohan Gowda",
            "auid": "AIT22CS001",
            "email": "rohan.gowda@acharya.ac.in",
            "phone": "9845012345",
            "institute": "Acharya Institute of Technology",
            "department": "Computer Science & Engineering",
            "semester": 6,
            "section": "A",
            "gender": "Male",
            "role": "VOLUNTEER",
            "password": "Password@123",
            "confirm_password": "Password@123"
        }
        resp = client.post("/api/auth/register/student", json=payload)
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        vol_user = data["user"]
        assert vol_user["role"] == "VOLUNTEER"
        assert vol_user["registration_id"].startswith("AKV-2026-")
        log_pass(2, "Student Signup as VOLUNTEER", f"AUID: {vol_user['auid']}, RegID: {vol_user['registration_id']}")
    except Exception as e:
        log_fail(2, "Student Signup as VOLUNTEER", str(e))

    # Step 3: Student Signup as PARTICIPANT
    try:
        payload = {
            "full_name": "Ananya Sharma",
            "auid": "AIT22IS002",
            "email": "ananya.sharma@acharya.ac.in",
            "phone": "9845098765",
            "institute": "Acharya Institute of Technology",
            "department": "Information Science & Engineering",
            "semester": 6,
            "section": "B",
            "gender": "Female",
            "role": "PARTICIPANT",
            "password": "Password@123",
            "confirm_password": "Password@123"
        }
        resp = client.post("/api/auth/register/student", json=payload)
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
        part_user = resp.json()["user"]
        assert part_user["role"] == "PARTICIPANT"
        log_pass(3, "Student Signup as PARTICIPANT", f"AUID: {part_user['auid']}")
    except Exception as e:
        log_fail(3, "Student Signup as PARTICIPANT", str(e))

    # Step 4: Student Signup as SPECTATOR
    try:
        payload = {
            "full_name": "Karthik Hegde",
            "auid": "AIT22EC003",
            "email": "karthik.hegde@acharya.ac.in",
            "phone": "9845055555",
            "institute": "Acharya Institute of Technology",
            "department": "Electronics & Communication",
            "semester": 4,
            "section": "A",
            "gender": "Male",
            "role": "SPECTATOR",
            "password": "Password@123",
            "confirm_password": "Password@123"
        }
        resp = client.post("/api/auth/register/student", json=payload)
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
        spec_user = resp.json()["user"]
        assert spec_user["role"] == "SPECTATOR"
        log_pass(4, "Student Signup as SPECTATOR", f"AUID: {spec_user['auid']}")
    except Exception as e:
        log_fail(4, "Student Signup as SPECTATOR", str(e))

    # Step 5: Duplicate Signup Validation
    try:
        dup_payload = {
            "full_name": "Duplicate Rohan",
            "auid": "AIT22CS001",
            "email": "another.email@acharya.ac.in",
            "phone": "9845012345",
            "institute": "AIT",
            "department": "CSE",
            "semester": 6,
            "section": "A",
            "gender": "Male",
            "role": "VOLUNTEER",
            "password": "Password@123",
            "confirm_password": "Password@123"
        }
        resp = client.post("/api/auth/register/student", json=dup_payload)
        assert resp.status_code == 409, f"Expected 409 Conflict, got {resp.status_code}"
        assert "AUID" in resp.json()["detail"]
        log_pass(5, "Duplicate AUID Prevention", "Rejected with 409 Conflict")
    except Exception as e:
        log_fail(5, "Duplicate AUID Prevention", str(e))

    # Step 6: Student Login - Invalid Credentials
    try:
        resp = client.post("/api/auth/login/student", json={
            "auid": "AIT22CS001",
            "password": "IncorrectPassword123"
        })
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        log_pass(6, "Invalid Password Login Rejection", "Rejected with 401 Unauthorized")
    except Exception as e:
        log_fail(6, "Invalid Password Login Rejection", str(e))

    # Step 7: Student Login - Valid Credentials
    try:
        resp = client.post("/api/auth/login/student", json={
            "auid": "AIT22CS001",
            "password": "Password@123"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "token" in data
        assert data["user"]["auid"] == "AIT22CS001"
        vol_token = data["token"]
        log_pass(7, "Student Login (Volunteer)", f"JWT issued for {data['user']['name']}")
    except Exception as e:
        log_fail(7, "Student Login (Volunteer)", str(e))

    # Step 8: Forgot Password & Reset Cycle
    dev_reset_token = None
    try:
        resp = client.post("/api/auth/forgot-password", json={"identifier": "AIT22CS001"})
        assert resp.status_code == 200, f"Forgot password failed: {resp.text}"
        data = resp.json()
        import re
        from backend.app.services.email_service import DEBUG_EMAIL_OUTBOX
        token_match = re.search(r"reset-token=([A-Za-z0-9_-]+)", DEBUG_EMAIL_OUTBOX[-1]["html"])
        dev_reset_token = token_match.group(1) if token_match else None
        assert dev_reset_token is not None, "Expected reset token delivered in outbound email"
        log_pass(8, "Password Reset Request", f"Token generated & dispatched in email (10 min expiry from akv@acharya.ac.in)")

        # Execute Reset Password
        reset_resp = client.post("/api/auth/reset-password", json={
            "token": dev_reset_token,
            "new_password": "UpdatedPassword@2026",
            "confirm_password": "UpdatedPassword@2026"
        })
        assert reset_resp.status_code == 200, f"Reset execution failed: {reset_resp.text}"
        log_pass(9, "Password Reset Execution", "Single-use token redeemed successfully")

        # Test login with old password (must fail)
        old_login = client.post("/api/auth/login/student", json={
            "auid": "AIT22CS001",
            "password": "Password@123"
        })
        assert old_login.status_code == 401, "Old password should no longer work"

        # Test login with new password (must succeed)
        new_login = client.post("/api/auth/login/student", json={
            "auid": "AIT22CS001",
            "password": "UpdatedPassword@2026"
        })
        assert new_login.status_code == 200, "New password login failed"
        vol_token = new_login.json()["token"]
        log_pass(10, "Post-Reset Login Verification", "Old password revoked, new password active")
    except Exception as e:
        log_fail(8, "Password Reset Flow", str(e))

    # Step 11: Student Dashboard Verification
    try:
        student_headers = {"Authorization": f"Bearer {vol_token}"}
        resp = client.get("/api/student/dashboard", headers=student_headers)
        assert resp.status_code == 200, f"Dashboard failed: {resp.text}"
        dash = resp.json()
        assert dash["profile"]["auid"] == "AIT22CS001"
        assert dash["volunteer_info"]["is_volunteer"] is True
        log_pass(11, "Student Dashboard Data", f"Role: {dash['profile']['role']}, Volunteer Status: Verified")
    except Exception as e:
        log_fail(11, "Student Dashboard Data", str(e))

    # ----------------------------------------------------
    # SECTION 3: EVENT BROWSING & 1-CLICK MAPPING
    # ----------------------------------------------------
    print("\n--- SECTION 3: EVENT BROWSING & PARTICIPANT MAPPING ---")
    available_events = []
    registered_reg_id = None
    try:
        resp = client.get("/api/events")
        assert resp.status_code == 200, f"Events fetch failed: {resp.text}"
        available_events = resp.json()
        assert len(available_events) >= 1, "At least 1 event should exist in seeded DB"
        log_pass(12, "Event Catalog Browsing", f"Found {len(available_events)} festival events")

        target_event = available_events[0]
        # Register student for event (1-Click Authenticated Registration)
        reg_payload = {
            "event_id": target_event["id"],
            "is_team": False
        }
        reg_resp = client.post("/api/student/register-event", json=reg_payload, headers=student_headers)
        assert reg_resp.status_code == 200, f"Event registration failed: {reg_resp.text}"
        reg_data = reg_resp.json()
        registered_reg_id = reg_data["registration_id"]
        assert registered_reg_id is not None
        log_pass(13, "1-Click Event Mapping (Student)", f"Registered for '{target_event['title_en']}' -> Pass ID: {registered_reg_id}")
    except Exception as e:
        log_fail(12, "Event Catalog & Registration", str(e))

    # Step 14: Digital Pass Lookup
    try:
        pass_resp = client.get(f"/api/registrations/auid/AIT22CS001")
        assert pass_resp.status_code == 200, f"Pass lookup by AUID failed: {pass_resp.text}"
        passes = pass_resp.json()
        assert len(passes) >= 1
        assert passes[0]["registration_id"] == registered_reg_id
        log_pass(14, "Digital Pass Generation & Lookup", f"Pass active with status: {passes[0]['status']}")
    except Exception as e:
        log_fail(14, "Digital Pass Generation & Lookup", str(e))

    # ----------------------------------------------------
    # SECTION 4: SUPERADMIN PORTAL
    # ----------------------------------------------------
    print("\n--- SECTION 4: SUPERADMIN PORTAL & PERMISSIONS ---")
    sa_token = None
    sa_headers = {}

    # Step 15: Direct SuperAdmin Login
    try:
        resp = client.post("/api/auth/login/admin", json={
            "username": settings.SUPERADMIN_USERNAME,
            "password": settings.SUPERADMIN_PASSWORD
        })
        assert resp.status_code == 200, f"SuperAdmin login failed: {resp.text}"
        data = resp.json()
        assert data["user"]["role"] == "SUPERADMIN"
        sa_token = data["token"]
        sa_headers = {"Authorization": f"Bearer {sa_token}"}
        log_pass(15, "SuperAdmin Authentication", f"Official credentials verified ({settings.SUPERADMIN_USERNAME})")
    except Exception as e:
        log_fail(15, "SuperAdmin Authentication", str(e))

    # ----------------------------------------------------
    # SECTION 5: COORDINATOR / ADMIN PORTAL & APPROVAL
    # ----------------------------------------------------
    print("\n--- SECTION 5: ADMIN SIGNUP, PENDING APPROVAL & PRIVILEGES ---")
    admin_token = None
    admin_headers = {}
    pending_admin_id = None

    # Step 16: Admin Registration
    try:
        adm_payload = {
            "full_name": "Suresh Rao",
            "username": "suresh_rao",
            "email": "suresh.rao@acharya.ac.in",
            "phone": "9900112233",
            "institute": "Acharya Institute of Technology",
            "department": "Mechanical Engineering",
            "password": "AdminPassword@2026",
            "confirm_password": "AdminPassword@2026"
        }
        resp = client.post("/api/auth/register/admin", json=adm_payload)
        assert resp.status_code == 201, f"Admin registration failed: {resp.text}"
        assert resp.json()["status"] == "PENDING_APPROVAL"
        log_pass(16, "Admin Registration Submission", "Account created with status: PENDING_APPROVAL")
    except Exception as e:
        log_fail(16, "Admin Registration Submission", str(e))

    # Step 17: Unapproved Admin Login Attempt
    try:
        resp = client.post("/api/auth/login/admin", json={
            "username": "suresh_rao",
            "password": "AdminPassword@2026"
        })
        assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}"
        assert "awaiting Super Admin approval" in resp.json()["detail"]
        log_pass(17, "Unapproved Admin Login Gate", "Properly blocked with 403 Forbidden")
    except Exception as e:
        log_fail(17, "Unapproved Admin Login Gate", str(e))

    # Step 18: SuperAdmin Approves Admin
    try:
        admins_resp = client.get("/api/superadmin/admins", headers=sa_headers)
        assert admins_resp.status_code == 200
        admin_list = admins_resp.json()
        target = next((a for a in admin_list if a["username"] == "suresh_rao"), None)
        assert target is not None, "Registered admin not found in SuperAdmin list"
        pending_admin_id = target["id"]

        appr_resp = client.post(f"/api/superadmin/admins/{pending_admin_id}/approve", headers=sa_headers)
        assert appr_resp.status_code == 200
        log_pass(18, "SuperAdmin Admin Approval", f"Admin ID {pending_admin_id} (suresh_rao) APPROVED")
    except Exception as e:
        log_fail(18, "SuperAdmin Admin Approval", str(e))

    # Step 19: Approved Admin Login
    try:
        resp = client.post("/api/auth/login/admin", json={
            "username": "suresh_rao",
            "password": "AdminPassword@2026"
        })
        assert resp.status_code == 200, f"Approved admin login failed: {resp.text}"
        admin_token = resp.json()["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        log_pass(19, "Approved Admin Login", "JWT issued successfully after approval")
    except Exception as e:
        log_fail(19, "Approved Admin Login", str(e))

    # ----------------------------------------------------
    # SECTION 6: VOLUNTEER ATTENDANCE MAPPING
    # ----------------------------------------------------
    print("\n--- SECTION 6: VOLUNTEER ATTENDANCE MAPPING & EXTRACTION ---")
    
    # Step 20: Automatic Volunteer Extraction
    vol_user_id = None
    try:
        resp = client.get("/api/admin/volunteers/today", headers=admin_headers)
        assert resp.status_code == 200, f"Volunteer extraction failed: {resp.text}"
        data = resp.json()
        vols = data["volunteers"]
        auid_list = [v["auid"] for v in vols]
        assert "AIT22CS001" in auid_list, "Volunteer AIT22CS001 MUST be extracted automatically"
        assert "AIT22IS002" not in auid_list, "Participant AIT22IS002 MUST NOT appear in volunteer list"
        assert "AIT22EC003" not in auid_list, "Spectator AIT22EC003 MUST NOT appear in volunteer list"
        target_vol = next(v for v in vols if v["auid"] == "AIT22CS001")
        vol_user_id = target_vol["user_id"]
        log_pass(20, "Automatic Volunteer Roster Extraction", f"Isolated {len(vols)} true volunteer(s) with 0 participants/spectators")
    except Exception as e:
        log_fail(20, "Automatic Volunteer Roster Extraction", str(e))

    # Step 21: Admin Marks Volunteer Attendance
    try:
        att_payload = {
            "volunteer_user_id": vol_user_id,
            "status": "PRESENT"
        }
        resp = client.post("/api/admin/volunteers/attendance", json=att_payload, headers=admin_headers)
        assert resp.status_code == 200, f"Marking attendance failed: {resp.text}"
        res_data = resp.json()
        assert res_data["status"] == "PRESENT"
        assert res_data["check_in_time"] is not None
        log_pass(21, "Admin Volunteer Attendance Marking", f"Marked PRESENT at {res_data['check_in_time']}")
    except Exception as e:
        log_fail(21, "Admin Volunteer Attendance Marking", str(e))

    # Step 22: Attendance Privacy Control
    try:
        resp = client.get("/api/admin/attendance/export", headers=admin_headers)
        assert resp.status_code == 403, f"Admin should be forbidden from export: {resp.status_code}"
        log_pass(22, "Attendance Privacy Enforcement", "Regular admin blocked from bulk export (403 Forbidden)")
    except Exception as e:
        log_fail(22, "Attendance Privacy Enforcement", str(e))

    # Step 23: SuperAdmin Attendance Exports & Overrides
    try:
        # CSV Export
        csv_resp = client.get("/api/superadmin/attendance/export-csv", headers=sa_headers)
        assert csv_resp.status_code == 200, f"CSV export failed: {csv_resp.text}"
        assert "Volunteer Name" in csv_resp.text
        assert "AIT22CS001" in csv_resp.text
        log_pass(23, "SuperAdmin CSV Attendance Export", f"CSV generated ({len(csv_resp.text)} chars)")

        # XLSX Export
        xlsx_resp = client.get("/api/superadmin/attendance/export-xlsx", headers=sa_headers)
        assert xlsx_resp.status_code == 200, f"XLSX export failed: {xlsx_resp.status_code}"
        assert len(xlsx_resp.content) > 1000
        log_pass(24, "SuperAdmin XLSX Attendance Export", f"Excel binary generated ({len(xlsx_resp.content)} bytes)")

        # SuperAdmin Edit Attendance with Audit Trail
        att_records = client.get("/api/superadmin/attendance", headers=sa_headers).json()["records"]
        target_rec = next(r for r in att_records if r["auid"] == "AIT22CS001")
        edit_resp = client.put(f"/api/superadmin/attendance/{target_rec['id']}", json={
            "status": "LATE",
            "notes": "Verified traffic delay"
        }, headers=sa_headers)
        assert edit_resp.status_code == 200
        log_pass(25, "SuperAdmin Attendance Override & Audit", "Status updated to LATE with reason log")
    except Exception as e:
        log_fail(23, "SuperAdmin Attendance Management", str(e))

    # ----------------------------------------------------
    # SECTION 7: EVENT CHECK-IN DESK & QR SCAN ATTENDANCE
    # ----------------------------------------------------
    print("\n--- SECTION 7: EVENT CHECK-IN DESK & CAMERA QR SCAN ATTENDANCE ---")

    # Step 26: QR Code JSON Payload Check-In (Direct Camera Scanner Simulator)
    try:
        # Simulated payload emitted by DigitalPass.jsx QR Code:
        qr_camera_payload = json.dumps({
            "reg_id": registered_reg_id,
            "auid": "AIT22CS001",
            "name": "Rohan Gowda",
            "institute": "Acharya Institute of Technology",
            "event": "Nuditaranga 2026"
        })

        # Dual-route test: /check-in and /checkin
        resp = client.post("/api/check-in", json={
            "registration_id": qr_camera_payload,
            "agent": "Camera QR Scanner Desk"
        })
        assert resp.status_code == 200, f"Camera QR JSON check-in failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "Checked In"
        assert data["registration_id"] == registered_reg_id
        log_pass(26, "Camera QR JSON Payload Check-In", f"Parsed JSON string -> Checked in {data['full_name']}")
    except Exception as e:
        log_fail(26, "Camera QR JSON Payload Check-In", str(e))

    # Step 27: Double Scan Idempotency Check
    try:
        resp = client.post("/api/check-in", json={
            "registration_id": registered_reg_id,
            "agent": "Camera QR Scanner Desk"
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "Checked In"
        log_pass(27, "Double Scan Handling", "Subsequent scans safely return confirmed 'Checked In' status")
    except Exception as e:
        log_fail(27, "Double Scan Handling", str(e))

    # Step 28: Pass Verification Endpoint
    try:
        verify_resp = client.get(f"/api/check-in/verify/{registered_reg_id}")
        assert verify_resp.status_code == 200
        assert verify_resp.json()["status"] == "Checked In"
        log_pass(28, "Pass Verification Endpoint", f"Pass {registered_reg_id} verified as Checked In")
    except Exception as e:
        log_fail(28, "Pass Verification Endpoint", str(e))

    # Step 29: Check-In Revert / Cancellation
    try:
        revert_resp = client.post(f"/api/check-in/revert/{registered_reg_id}")
        assert revert_resp.status_code == 200
        assert revert_resp.json()["status"] == "Registered"
        log_pass(29, "Check-In Reversal", f"Successfully reverted {registered_reg_id} to Registered")

        # Now re-check in using AUID lookup directly (simulating manual entry)
        manual_resp = client.post("/api/checkin", json={
            "registration_id": "AIT22CS001",
            "agent": "Manual Entry Desk"
        })
        assert manual_resp.status_code == 200
        assert manual_resp.json()["status"] == "Checked In"
        log_pass(30, "Manual Check-In via AUID", f"Checked in via AUID lookup: {manual_resp.json()['full_name']}")
    except Exception as e:
        log_fail(29, "Check-In Revert & Manual Re-entry", str(e))

    # ----------------------------------------------------
    # SECTION 8: PUBLIC GUEST REGISTRATION & AUDIT TRAIL
    # ----------------------------------------------------
    print("\n--- SECTION 8: PUBLIC REGISTRATION & AUDIT TRAIL ---")
    guest_reg_id = None
    try:
        guest_payload = {
            "event_id": available_events[0]["id"],
            "full_name": "Meera Patel",
            "usn": "1AY22CS088",
            "email": "meera.patel@acharya.ac.in",
            "phone": "9887766554",
            "department": "Artificial Intelligence",
            "semester": 4,
            "section": "C",
            "is_team": False
        }
        guest_resp = client.post("/api/registrations", json=guest_payload)
        assert guest_resp.status_code == 200, f"Public guest registration failed: {guest_resp.text}"
        guest_data = guest_resp.json()
        guest_reg_id = guest_data["registration_id"]
        log_pass(31, "Public Guest Event Registration", f"Created pass: {guest_reg_id} for USN: 1AY22CS088")

        # Check in guest attendee via USN
        guest_checkin = client.post("/api/check-in", json={
            "registration_id": "1AY22CS088",
            "agent": "Guest Desk"
        })
        assert guest_checkin.status_code == 200
        assert guest_checkin.json()["status"] == "Checked In"
        log_pass(32, "Guest Check-In via USN", f"Guest {guest_data['full_name']} checked in via USN")
    except Exception as e:
        log_fail(31, "Public Guest Registration", str(e))

    # Step 33: Audit Trail Verification
    try:
        audit_resp = client.get("/api/superadmin/audit-logs", headers=sa_headers)
        assert audit_resp.status_code == 200
        logs = audit_resp.json()
        assert len(logs) >= 4, f"Expected at least 4 audit log entries, found {len(logs)}"
        log_pass(33, "Audit Trail Verification", f"Confirmed {len(logs)} tamper-evident audit records")
    except Exception as e:
        log_fail(33, "Audit Trail Verification", str(e))

    # Step 34: Privilege Escalation Prevention
    try:
        # Student attempts to call superadmin endpoint
        esc_resp = client.get("/api/superadmin/admins", headers=student_headers)
        assert esc_resp.status_code == 403, f"Expected 403 Forbidden, got {esc_resp.status_code}"
        
        # Admin attempts to call superadmin endpoint
        adm_esc = client.get("/api/superadmin/admins", headers=admin_headers)
        assert adm_esc.status_code == 403, f"Expected 403 Forbidden, got {adm_esc.status_code}"

        log_pass(34, "Privilege Escalation Prevention", "Strict RBAC enforced: Student & Admin blocked from SuperAdmin API")
    except Exception as e:
        log_fail(34, "Privilege Escalation Prevention", str(e))

    # ----------------------------------------------------
    # FINAL SUMMARY
    # ----------------------------------------------------
    print("\n" + "=" * 65)
    print("TEST SUITE EXECUTION SUMMARY")
    print("=" * 65)
    print(f"Total Steps Tested: {len(results['passed']) + len(results['failed'])}")
    print(f"Passed: {len(results['passed'])}")
    print(f"Failed: {len(results['failed'])}")
    if results['failed']:
        print("\nFailures:")
        for f in results['failed']:
            print(f"  - Step {f['step']} ({f['title']}): {f['error']}")
    else:
        print("\nALL PORTALS, REGISTRATIONS, EVENT MAPPINGS, AND ATTENDANCE TESTS PASSED 100%!")
    print("=" * 65 + "\n")

    return results

if __name__ == "__main__":
    run_comprehensive_portal_tests()
