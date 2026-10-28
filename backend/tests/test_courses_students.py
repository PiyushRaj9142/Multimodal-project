import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_list_courses():
    response = client.get("/api/courses")
    assert response.status_code == 200
    courses = response.json()
    assert isinstance(courses, list)
    assert len(courses) >= 1

def test_create_and_update_course():
    code = "TEST-999"
    resp = client.post("/api/courses", json={"course_code": code, "name": "Test Engineering"})
    assert resp.status_code == 201
    course_id = resp.json()["id"]

    # Duplicate should fail
    dup = client.post("/api/courses", json={"course_code": code, "name": "Duplicate"})
    assert dup.status_code == 400

    # Update
    upd = client.patch(f"/api/courses/{course_id}", json={"name": "Advanced Test Engineering"})
    assert upd.status_code == 200
    assert upd.json()["name"] == "Advanced Test Engineering"

def test_students_crud_and_csv_import():
    # List students
    res = client.get("/api/students")
    assert res.status_code == 200
    students = res.json()
    assert len(students) >= 10  # seeded demo has 15

    # Create individual student
    stu_res = client.post("/api/students", json={
        "student_code": "STU-UNIT-1",
        "display_name": "Unit Tester",
        "video_consent": True,
        "audio_consent": True
    })
    assert stu_res.status_code == 201
    stu_id = stu_res.json()["id"]

    # CSV import with valid and malformed rows
    csv_data = "student_code,display_name\nCSV-001,Alice Smith\nCSV-002,Bob Jones\n,Malformed Row\n"
    files = {"file": ("students.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    imp_res = client.post("/api/students/import", files=files)
    assert imp_res.status_code == 200
    data = imp_res.json()
    assert data["successful_imports"] == 2
    assert data["failed_imports"] == 1
    assert len(data["errors"]) == 1
    assert data["errors"][0]["row_number"] == 4
