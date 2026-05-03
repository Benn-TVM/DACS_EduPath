# EduPath Frontend

Frontend cua du an EduPath duoc viet bang React + TypeScript + Vite.

## Thu muc chinh

```text
src/
  pages/
    student/      student flows: dashboard, roadmap, compare, hub
    admin/        admin portal
  services/       API client chung
  assets/         static assets
  components/     routing/shared UI
```

## Chay local

Tao file `.env` tu `.env.example`:

```powershell
copy .env.example .env
```

Sau do cai package va chay dev server:

```powershell
npm install
npm run dev
```

## Scripts

```powershell
npm run dev
npm run build
npm run lint
npm run preview
```

## Bien moi truong

- `VITE_API_BASE_URL`: URL goc cua backend API. Mac dinh trong project la `http://127.0.0.1:8000/api/`.
