import sys
import os
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.app.database import get_db, SessionLocal
from backend.app.models import User, Admin

client = TestClient(app)

def run_tests():
    print("=== Testing 6 Authorized Superadmin Credentials ===")
    
    superadmins = [
        ("akvsadayt", "akvsa@ayush", "Ayush H Mane", False),
        ("akvsapriya", "akvsa@priya", "Priyanka S Reddy", False),
        ("akvsaarjun", "akvsa@arjun", "Arjun V", True),
        ("akvsaculturals", "akvsa@culturals", "Culturals", False),
        ("akvsatejas", "akvsa@tejas", "Mr. Tejas K", True),
        ("akvsarakshi", "akvsa@rakshi", "Mrs. Rakshitha B. T", True),
    ]

    tokens = {}

    for username, password, expected_name, expected_first_time in superadmins:
        res = client.post("/api/auth/login/superadmin", json={
            "username": username,
            "password": password
        })
        assert res.status_code == 200, f"Login failed for {username}: {res.status_code} {res.text}"
        data = res.json()
        assert data.get("success") is True, f"Login response unsuccessful: {data}"
        user_info = data.get("user", {})
        assert user_info.get("name") == expected_name, f"Expected name {expected_name}, got {user_info.get('name')}"
        assert user_info.get("role") == "SUPERADMIN", f"Expected SUPERADMIN role, got {user_info.get('role')}"
        assert user_info.get("first_time_setup_required") == expected_first_time, f"Expected first_time_setup_required={expected_first_time} for {username}, got {user_info.get('first_time_setup_required')}"
        tokens[username] = data.get("token")
        print(f"  [PASS] {username} ({expected_name}) logged in successfully. first_time_setup_required={expected_first_time}")

    print("\n=== Testing Portal Lockdown on Unauthorized Usernames ===")
    unauthorized_usernames = ["superadmin", "akv-nt-2026", "admin", "testuser", "akvsa_intruder"]
    for unauth in unauthorized_usernames:
        res = client.post("/api/auth/login/superadmin", json={
            "username": unauth,
            "password": "AnyPassword123!"
        })
        assert res.status_code == 403, f"Expected 403 Forbidden for {unauth}, got {res.status_code}"
        print(f"  [PASS] Unauthorized username '{unauth}' correctly blocked with 403 Forbidden.")

    print("\n=== Testing Culturals Isolation (Credential 4) ===")
    culturals_token = tokens["akvsaculturals"]
    res_culturals = client.post(
        "/api/auth/superadmin/first-time-setup",
        json={"email": "culturals@acharya.ac.in", "auid": "CULT01"},
        headers={"Authorization": f"Bearer {culturals_token}"}
    )
    assert res_culturals.status_code == 400, f"Expected 400 for culturals onboarding attempt, got {res_culturals.status_code}"
    print(f"  [PASS] akvsaculturals cannot be fed or asked additional details (400 Bad Request).")

    print("\n=== Testing First-Time Setup for Credentials 3, 5 & 6 ===")
    arjun_token = tokens["akvsaarjun"]
    tejas_token = tokens["akvsatejas"]
    
    # Test valid onboarding for Arjun V
    res_arjun = client.post(
        "/api/auth/superadmin/first-time-setup",
        json={
            "email": "arjunv.akv@acharya.ac.in",
            "auid": "AIT-ARJUN-2026",
            "faculty_id": "AIT-ARJUN-2026",
            "phone": "9876543210",
            "department": "Kannada Vedike"
        },
        headers={"Authorization": f"Bearer {arjun_token}"}
    )
    assert res_arjun.status_code == 200, f"Expected 200 for Arjun V setup, got {res_arjun.status_code} {res_arjun.text}"
    print("  [PASS] Arjun V first-time onboarding completed successfully.")

    # Test invalid email domain
    res_bad_email = client.post(
        "/api/auth/superadmin/first-time-setup",
        json={"email": "tejas@gmail.com", "auid": "AIT-TEJAS"},
        headers={"Authorization": f"Bearer {tejas_token}"}
    )
    assert res_bad_email.status_code == 422 or res_bad_email.status_code == 400, f"Expected validation failure for non-acharya email, got {res_bad_email.status_code}"
    print("  [PASS] Invalid email rejected.")

    # Test valid onboarding for Tejas K
    res_setup = client.post(
        "/api/auth/superadmin/first-time-setup",
        json={
            "email": "tejask@acharya.ac.in",
            "auid": "AIT-TEJAS-2026",
            "faculty_id": "AIT-TEJAS-2026",
            "phone": "9876543210",
            "department": "Kannada"
        },
        headers={"Authorization": f"Bearer {tejas_token}"}
    )
    assert res_setup.status_code == 200, f"Expected 200 for valid setup, got {res_setup.status_code} {res_setup.text}"
    setup_data = res_setup.json()
    assert setup_data["user"]["first_time_setup_required"] is False
    assert setup_data["user"]["email"] == "tejask@acharya.ac.in"
    print("  [PASS] Tejas K first-time onboarding completed successfully.")

    # Reset Arjun V and Tejas K back to pending first_time_setup_required=True for clean state
    db = SessionLocal()
    try:
        admin_arjun = db.query(Admin).filter(Admin.username == "akvsaarjun").first()
        if admin_arjun and admin_arjun.user:
            admin_arjun.user.first_time_setup_required = True
            admin_arjun.user.email = "pending.arjun@acharya.ac.in"
            admin_arjun.user.auid = "PENDING-ARJUNV"
            admin_arjun.user.faculty_id = None

        admin_tejas = db.query(Admin).filter(Admin.username == "akvsatejas").first()
        if admin_tejas and admin_tejas.user:
            admin_tejas.user.first_time_setup_required = True
            admin_tejas.user.email = "tejas.superadmin@acharya.ac.in"
            admin_tejas.user.auid = "SA-AKVSATEJAS"
            admin_tejas.user.faculty_id = None

        db.commit()
        print("  [PASS] Clean state restored for Arjun V and Mr. Tejas K (first_time_setup_required=True).")
    finally:
        db.close()

    print("\nALL SUPERADMIN TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
