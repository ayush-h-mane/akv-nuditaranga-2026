import sys
import os
sys.path.insert(0, os.path.abspath("."))
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings

client = TestClient(app)

def test_working_committee_admin_auid_flow():
    print("==================================================")
    print("TEST: WORKING COMMITTEE ADMIN AUID REGISTRATION & LOGIN")
    print("==================================================")

    # 1. Missing AUID for Working Committee should fail (HTTP 400 or 422)
    missing_auid_payload = {
        "full_name": "Test WC Coordinator",
        "admin_type": "WORKING_COMMITTEE",
        "email": "wc.test1@acharya.ac.in",
        "phone": "9876501234",
        "institute": "Acharya Institute of Technology",
        "department": "Computer Science & Engineering",
        "volunteer_domain": "Promotions",
        "photo_url": "https://example.com/avatar.jpg",
        "password": "Password@123",
        "confirm_password": "Password@123"
    }
    resp = client.post("/api/auth/register/admin", json=missing_auid_payload)
    assert resp.status_code == 400, f"Expected 400 for missing AUID, got {resp.status_code}: {resp.text}"
    print("[PASS] 1. Missing AUID correctly rejected with HTTP 400")

    # 2. Invalid AUID format should fail (HTTP 422)
    invalid_auid_payload = dict(missing_auid_payload)
    invalid_auid_payload["auid"] = "A!"
    resp = client.post("/api/auth/register/admin", json=invalid_auid_payload)
    assert resp.status_code == 422, f"Expected 422 for invalid AUID format, got {resp.status_code}: {resp.text}"
    print("[PASS] 2. Invalid AUID format correctly rejected with HTTP 422")

    # 3. Valid Working Committee registration with AUID
    valid_auid = "AIT24WC777"
    valid_email = "wc.coordinator777@acharya.ac.in"
    wc_payload = {
        "full_name": "Prajwal Gowda",
        "auid": valid_auid,
        "admin_type": "WORKING_COMMITTEE",
        "email": valid_email,
        "phone": "9876543210",
        "institute": "Acharya Institute of Technology",
        "department": "Information Science & Engineering",
        "volunteer_domain": "Stage Management",
        "photo_url": "https://example.com/prajwal.jpg",
        "password": "CoordinatorPass@2026",
        "confirm_password": "CoordinatorPass@2026"
    }
    resp = client.post("/api/auth/register/admin", json=wc_payload)
    if resp.status_code == 409:
        print("[INFO] 3. Account already registered from prior run")
    else:
        assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["status"] == "PENDING_APPROVAL"
        assert data["auid"] == valid_auid
        print(f"[PASS] 3. Working Committee Admin Registered with AUID: {valid_auid} (Status: PENDING_APPROVAL)")

    # 4. Attempt login with AUID before Super Admin approval -> should be 403 Forbidden
    login_resp = client.post("/api/auth/login/admin", json={
        "username": valid_auid,
        "password": "CoordinatorPass@2026"
    })
    if login_resp.status_code != 200:
        assert login_resp.status_code == 403, f"Expected 403 Forbidden, got {login_resp.status_code}: {login_resp.text}"
        assert "awaiting Super Admin approval" in login_resp.json()["detail"]
        print("[PASS] 4. Unapproved login with AUID properly blocked with 403 (awaiting approval)")

    # 5. Super Admin logs in and approves this admin
    sa_login = client.post("/api/auth/login/admin", json={
        "username": settings.SUPERADMIN_USERNAME,
        "password": settings.SUPERADMIN_PASSWORD
    })
    assert sa_login.status_code == 200, f"Super Admin login failed: {sa_login.text}"
    sa_token = sa_login.json()["token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    admins_list = client.get("/api/superadmin/admins", headers=sa_headers).json()
    target_admin = next((a for a in admins_list if a.get("auid") == valid_auid or a.get("email") == valid_email), None)
    assert target_admin is not None, f"Admin with AUID {valid_auid} must be listed in Super Admin view"
    assert target_admin["auid"] == valid_auid, f"Admin record must display AUID: {target_admin}"
    print(f"[PASS] 5. Admin record retrieved in SuperAdmin list with verified AUID: {target_admin['auid']}")

    if target_admin["approval_status"] == "PENDING_APPROVAL":
        appr_resp = client.post(f"/api/superadmin/admins/{target_admin['id']}/approve", headers=sa_headers)
        assert appr_resp.status_code == 200
        print(f"[PASS] 6. Super Admin approved admin ID: {target_admin['id']}")
    else:
        print(f"[INFO] 6. Admin ID: {target_admin['id']} is already approved")

    # 7. Login with uppercase AUID
    login_upper = client.post("/api/auth/login/admin", json={
        "username": valid_auid,
        "password": "CoordinatorPass@2026"
    })
    assert login_upper.status_code == 200, f"Login with uppercase AUID failed: {login_upper.text}"
    user_data = login_upper.json()["user"]
    assert user_data["auid"] == valid_auid
    assert user_data["role"] == "ADMIN"
    print(f"[PASS] 7. Logged in successfully with uppercase AUID: {valid_auid}")

    # 8. Login with lowercase AUID
    login_lower = client.post("/api/auth/login/admin", json={
        "username": valid_auid.lower(),
        "password": "CoordinatorPass@2026"
    })
    assert login_lower.status_code == 200, f"Login with lowercase AUID failed: {login_lower.text}"
    assert login_lower.json()["user"]["auid"] == valid_auid
    print(f"[PASS] 8. Logged in successfully with lowercase AUID: {valid_auid.lower()}")

    # 9. Verify forgot-password identifier lookup with AUID
    forgot_resp = client.post("/api/auth/forgot-password", json={
        "identifier": valid_auid
    })
    assert forgot_resp.status_code == 200
    print(f"[PASS] 9. Forgot password identifier lookup works with AUID: {valid_auid}")

    print("==================================================")
    print("ALL WORKING COMMITTEE AUID TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_working_committee_admin_auid_flow()
