import sys
from fastapi.testclient import TestClient
from backend.app.main import app

def test_activities_kannada():
    client = TestClient(app)

    # 1. Create activity with Kannada title and description
    payload = {
        "title": "Grand Rajyotsava Celebrations 2026",
        "title_en": "Grand Rajyotsava Celebrations 2026",
        "title_kn": "ಭವ್ಯ ರಾಜ್ಯೋತ್ಸವ ಸಂಭ್ರಮ ೨೦೨೬",
        "description": "Celebration of Kannada heritage across Acharya campus.",
        "desc_en": "Celebration of Kannada heritage across Acharya campus.",
        "desc_kn": "ಆಚಾರ್ಯ ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ ಕನ್ನಡ ಪರಂಪರೆ ಮತ್ತು ಸಂಸ್ಕೃತಿಯ ಅದ್ಧೂರಿ ಆಚರಣೆ.",
        "activity_date": "2026-11-01",
        "image_url": "https://example.com/rajyotsava.jpg",
        "category": "Major Activity"
    }

    create_res = client.post("/api/activities", json=payload)
    print("Create status:", create_res.status_code)
    assert create_res.status_code == 200, create_res.text
    created_data = create_res.json()
    act_id = created_data["id"]

    assert created_data["title_en"] == payload["title_en"]
    assert created_data["title_kn"] == payload["title_kn"]
    assert created_data["desc_en"] == payload["desc_en"]
    assert created_data["desc_kn"] == payload["desc_kn"]
    print("✓ Activity created with Kannada fields successfully")

    # 2. Get activity by id
    get_res = client.get(f"/api/activities/{act_id}")
    assert get_res.status_code == 200
    fetched_data = get_res.json()
    assert fetched_data["title_kn"] == payload["title_kn"]
    assert fetched_data["desc_kn"] == payload["desc_kn"]
    print("✓ Activity fetched and verified Kannada fields")

    # 3. Update activity with modified Kannada text
    update_payload = {
        "title_kn": "ನವೀಕರಿಸಿದ ಭವ್ಯ ರಾಜ್ಯೋತ್ಸವ ಸಂಭ್ರಮ ೨೦೨೬",
        "desc_kn": "ನವೀಕರಿಸಿದ ವಿವರ: ಆಚಾರ್ಯ ಸಂಸ್ಥೆಗಳಲ್ಲಿ ಅದ್ಭುತ ಸಾಂಸ್ಕೃತಿಕ ಕಾರ್ಯಕ್ರಮಗಳು."
    }
    update_res = client.put(f"/api/activities/{act_id}", json=update_payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["title_kn"] == update_payload["title_kn"]
    assert updated_data["desc_kn"] == update_payload["desc_kn"]
    print("✓ Activity updated with new Kannada fields successfully")

    # 4. Clean up / delete activity
    del_res = client.delete(f"/api/activities/{act_id}")
    assert del_res.status_code == 200
    print("✓ Cleaned up test activity")

    print("\nALL ACTIVITY KANNADA TESTS PASSED!")

if __name__ == "__main__":
    test_activities_kannada()
