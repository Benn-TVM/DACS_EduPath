# EduPath - AI Learning Advisor

EduPath la do an web ho tro sinh vien tim kiem khoa hoc, tao lo trinh hoc tap bang AI, so sanh khoa hoc va doc/dang review tu cong dong.

## Cau truc repo

```text
DACS/
  backend/                 Django + DRF + SQL Server
    api/                   business logic, models, serializers, views
    server/                Django settings va URL goc
    sql/                   SQL scripts phu tro
    manage.py
    requirements.txt
  frontend/                React + TypeScript + Vite
    src/
      pages/
        student/           student flows: dashboard, roadmap, compare, hub
        admin/             admin portal
      services/            API client chung
    public/
    package.json
  documents/               tai lieu, doi chieu plan, du lieu tham chieu
```

## Tinh nang hien tai

- Dang ky, dang nhap, onboarding hoc vien
- Tim kiem va goi y khoa hoc
- Roadmap AI tu prompt hoac JD URL
- Dashboard co widget roadmap, skill va quick stats
- Compare 2-4 khoa hoc
- Student Hub voi review va vote
- Admin portal co cac page tong quan/co so du lieu

## Cong nghe

- Backend: Django, Django REST Framework, SimpleJWT, mssql-django
- Frontend: React, TypeScript, Vite, React Router, Axios
- AI: Gemini provider + fallback logic
- Database: SQL Server

## Yeu cau moi truong

- Python 3.14
- Node.js 20+
- SQL Server
- ODBC Driver 17 for SQL Server

## Backend setup

Tao file `backend/.env` tu `backend/.env.example`, sau do cai dependencies:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Neu can import du lieu khoa hoc:

```powershell
python manage.py import_soict_courses --source ..\documents\soict_courses.xlsx
```

Backend mac dinh chay tai `http://127.0.0.1:8000/`.

## Frontend setup

Tao file `frontend/.env` tu `frontend/.env.example`, sau do:

```powershell
cd frontend
npm install
npm run dev
```

Frontend mac dinh goi API qua `VITE_API_BASE_URL`.

## Scripts huu ich

Backend:

```powershell
cd backend
.\venv\Scripts\python.exe manage.py test
```

Frontend:

```powershell
cd frontend
npm run build
npm run lint
```

## Ghi chu cau truc

- App frontend hien tai da duoc dua truc tiep len `frontend/`, khong con lop `client` trung gian.
- Thu muc `output/`, `backend/tmp/`, `backend/output/`, `backend/venv/`, `frontend/dist/`, `frontend/node_modules/` la artifact/runtime va da duoc dua vao `.gitignore`.
- Tai lieu doi chieu tien do hien tai nam o `documents/current-plan-alignment.md`.
