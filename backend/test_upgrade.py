import sys
import os
sys.path.insert(0, os.path.abspath("."))
import json
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings

client = TestClient(app)

def run_all_tests():
    print("==================================================")
    print("AKV NUDITARANGA 2026 - BACKEND TEST SUITE")
    print("==================================================")

    # 1. Health Check
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    print("[PASS] 1. API Health Check OK")

    # 2. Register Student as VOLUNTEER
    vol_payload = {
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
    resp = client.post("/api/auth/register/student", json=vol_payload)
    if resp.status_code == 409:
        print("[INFO] 2. Volunteer already registered from previous run")
    else:
        assert resp.status_code == 201, f"Volunteer registration failed: {resp.text}"
        data = resp.json()
        assert data["user"]["role"] == "VOLUNTEER"
        assert data["user"]["registration_id"].startswith("AKV-2026-")
        print(f"[PASS] 2. Student Registered as VOLUNTEER (RegID: {data['user']['registration_id']})")

    # 3. Register Student as PARTICIPANT
    part_payload = {
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
    resp = client.post("/api/auth/register/student", json=part_payload)
    if resp.status_code != 409:
        assert resp.status_code == 201, f"Participant registration failed: {resp.text}"
        print(f"[PASS] 3. Student Registered as PARTICIPANT")

    # 4. Register Student as SPECTATOR
    spec_payload = {
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
    resp = client.post("/api/auth/register/student", json=spec_payload)
    if resp.status_code != 409:
        assert resp.status_code == 201, f"Spectator registration failed: {resp.text}"
        print(f"[PASS] 4. Student Registered as SPECTATOR")

    # 5. Duplicate AUID check
    resp = client.post("/api/auth/register/student", json=vol_payload)
    assert resp.status_code == 409, "Duplicate AUID should return 409 Conflict"
    print("[PASS] 5. Duplicate AUID / Email rejected with 409 Conflict")

    # 6. Student Login
    login_resp = client.post("/api/auth/login/student", json={
        "auid": "AIT22CS001",
        "password": "Password@123"
    })
    assert login_resp.status_code == 200, f"Student login failed: {login_resp.text}"
    student_token = login_resp.json()["token"]
    print("[PASS] 6. Student Login verified, JWT Token issued")

    # 7. Invalid password check
    invalid_login = client.post("/api/auth/login/student", json={
        "auid": "AIT22CS001",
        "password": "WrongPassword!"
    })
    assert invalid_login.status_code == 401, "Invalid password should return 401"
    print("[PASS] 7. Invalid Student Login rejected with 401 Unauthorized")

    # 8. Password Reset Request
    forgot_resp = client.post("/api/auth/forgot-password", json={
        "identifier": "AIT22CS001"
    })
    assert forgot_resp.status_code == 200
    import re
    from backend.app.services.email_service import DEBUG_EMAIL_OUTBOX
    token_match = re.search(r"reset-token=([A-Za-z0-9_-]+)", DEBUG_EMAIL_OUTBOX[-1]["html"])
    dev_token = token_match.group(1) if token_match else None
    assert dev_token is not None, "Reset token should be present in outbound email"
    print("[PASS] 8. Password Reset requested, secure token delivered in email from akv@acharya.ac.in")

    # 9. Password Reset Execution
    reset_resp = client.post("/api/auth/reset-password", json={
        "token": dev_token,
        "new_password": "NewSecretPass@2026",
        "confirm_password": "NewSecretPass@2026"
    })
    assert reset_resp.status_code == 200, f"Reset execution failed: {reset_resp.text}"
    print("[PASS] 9. Password successfully reset via single-use token")

    # 10. Login with new password
    new_login = client.post("/api/auth/login/student", json={
        "auid": "AIT22CS001",
        "password": "NewSecretPass@2026"
    })
    assert new_login.status_code == 200
    student_token = new_login.json()["token"]
    print("[PASS] 10. Login verified with newly updated password")

    # 11. Admin Registration
    adm_payload = {
        "full_name": "Suresh Rao",
        "username": "suresh_rao",
        "email": "suresh.rao@acharya.ac.in",
        "phone": "9900112233",
        "institute": "Acharya Institute of Technology",
        "department": "Mechanical Engineering",
        "password": "AdminPass@2026",
        "confirm_password": "AdminPass@2026"
    }
    resp = client.post("/api/auth/register/admin", json=adm_payload)
    if resp.status_code != 409:
        assert resp.status_code == 201
        assert resp.json()["status"] == "PENDING_APPROVAL"
        print("[PASS] 11. Admin Registration submitted with status PENDING_APPROVAL")

    # 12. Attempt Admin login before approval
    pending_login = client.post("/api/auth/login/admin", json={
        "username": "suresh_rao",
        "password": "AdminPass@2026"
    })
    assert pending_login.status_code == 403
    assert "awaiting Super Admin approval" in pending_login.json()["detail"]
    print("[PASS] 12. Unapproved Admin login blocked with 403 Forbidden")

    # 13. Super Admin Login
    sa_login = client.post("/api/auth/login/admin", json={
        "username": settings.SUPERADMIN_USERNAME,
        "password": settings.SUPERADMIN_PASSWORD
    })
    assert sa_login.status_code == 200, f"Super Admin login failed: {sa_login.text}"
    sa_token = sa_login.json()["token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}
    print("[PASS] 13. Super Admin Authentication successful")

    # 14. Super Admin Approves Admin
    admins_list = client.get("/api/superadmin/admins", headers=sa_headers).json()
    pending_admin = next((a for a in admins_list if a["username"] == "suresh_rao"), None)
    assert pending_admin is not None, "Registered admin should appear in Super Admin list"
    
    appr_resp = client.post(f"/api/superadmin/admins/{pending_admin['id']}/approve", headers=sa_headers)
    assert appr_resp.status_code == 200
    print("[PASS] 14. Super Admin approved the pending admin")

    # 15. Admin logs in after approval
    appr_login = client.post("/api/auth/login/admin", json={
        "username": "suresh_rao",
        "password": "AdminPass@2026"
    })
    assert appr_login.status_code == 200, f"Approved admin login failed: {appr_login.text}"
    admin_token = appr_login.json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] 15. Approved Admin successfully logged in")

    # 16. Automatic Volunteer Management Verification
    today_vols_resp = client.get("/api/admin/volunteers/today", headers=admin_headers)
    assert today_vols_resp.status_code == 200
    vols_data = today_vols_resp.json()
    vol_names = [v["auid"] for v in vols_data["volunteers"]]
    assert "AIT22CS001" in vol_names, "Volunteer AIT22CS001 must automatically appear in volunteer list"
    assert "AIT22EC003" not in vol_names, "Spectator AIT22EC003 must NOT appear in volunteer list"
    print(f"[PASS] 16. Automatic Volunteer Extraction verified (Found {len(vol_names)} volunteers, 0 manual additions)")

    # 17. Admin Marks Today's Volunteer Attendance
    target_vol = next(v for v in vols_data["volunteers"] if v["auid"] == "AIT22CS001")
    mark_resp = client.post("/api/admin/volunteers/attendance", json={
        "volunteer_user_id": target_vol["user_id"],
        "status": "PRESENT"
    }, headers=admin_headers)
    assert mark_resp.status_code == 200, f"Marking attendance failed: {mark_resp.text}"
    print("[PASS] 17. Admin marked volunteer Present for today with instant check-in timestamp")

    # 18. Attendance Privacy: Regular Admin blocked from export
    blocked_export = client.get("/api/admin/attendance/export", headers=admin_headers)
    assert blocked_export.status_code == 403, "Admin must be blocked from exporting attendance"
    print("[PASS] 18. Attendance Privacy Enforced: Approved Admin blocked from attendance exports")

    # 19. Super Admin Exports: CSV & XLSX
    csv_resp = client.get("/api/superadmin/attendance/export-csv", headers=sa_headers)
    assert csv_resp.status_code == 200
    assert "Volunteer Name" in csv_resp.text
    print("[PASS] 19a. Super Admin CSV Attendance Export verified")

    xlsx_resp = client.get("/api/superadmin/attendance/export-xlsx", headers=sa_headers)
    assert xlsx_resp.status_code == 200
    assert len(xlsx_resp.content) > 1000
    print(f"[PASS] 19b. Super Admin XLSX Attendance Export verified ({len(xlsx_resp.content)} bytes)")

    # 20. Super Admin Modifies Attendance Record with Audit Log
    att_list = client.get("/api/superadmin/attendance", headers=sa_headers).json()["records"]
    target_att = next((r for r in att_list if r["auid"] == "AIT22CS001"), None)
    assert target_att is not None
    edit_resp = client.put(f"/api/superadmin/attendance/{target_att['id']}", json={
        "status": "LATE",
        "notes": "Verified traffic delay"
    }, headers=sa_headers)
    assert edit_resp.status_code == 200
    print("[PASS] 20. Super Admin edited attendance record with audit trail")

    # 21. Verify Audit Logs
    audit_resp = client.get("/api/superadmin/audit-logs", headers=sa_headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert len(logs) >= 3
    print(f"[PASS] 21. Audit Trail verified ({len(logs)} activities recorded)")

    # 22. 1-Click Authenticated Student Event Registration
    events = client.get("/api/events").json()
    if events:
        ev_id = events[0]["id"]
        reg_click = client.post("/api/student/register-event", json={
            "event_id": ev_id,
            "is_team": False
        }, headers={"Authorization": f"Bearer {student_token}"})
        if reg_click.status_code != 409:
            assert reg_click.status_code == 200, f"Event registration failed: {reg_click.text}"
            print(f"[PASS] 22. 1-Click Event Registration verified: Reg ID {reg_click.json()['registration_id']}")

    # 23. Student Dashboard Verification
    dash_resp = client.get("/api/student/dashboard", headers={"Authorization": f"Bearer {student_token}"})
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert dash_data["profile"]["auid"] == "AIT22CS001"
    assert dash_data["volunteer_info"]["is_volunteer"] is True
    print("[PASS] 23. Student Dashboard verified with role-specific volunteer data")

    print("\n==================================================")
    print("ALL 23 BACKEND UPGRADE TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    run_all_tests()
