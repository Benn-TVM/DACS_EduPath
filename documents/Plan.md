# Doi chieu implementation plan voi codebase hien tai

Tai lieu nay doi chieu truc tiep voi repo `D:\Workspace\DACS` o trang thai hien tai, thay cho ban plan cu da bi lech sau cac thay doi moi.

## Ket luan nhanh

Codebase hien tai khong con dung o muc "Phase 1 dang do" nua.

Tinh hinh sat voi code hon la:

- **Phase 1 - Smart Roadmap**: da co backend, frontend, route, nav, dashboard widget va luong su dung chinh.
- **Phase 2 - Dashboard ca nhan hoa**: da lam mot phan ro rang, dac biet la widget roadmap/skills/stats.
- **Phase 3 - So sanh khoa hoc**: da co backend API va frontend page hoat dong.
- **Phase 4 - Student Hub / Cong dong**: da co model review, vote, feed page va review section tren course detail, nhung chua day du tinh nang cong dong nang cao.

Noi cach khac: bai hien tai da vuot xa ban doi chieu cu, va hien dang o trang thai **co the demo duoc ca roadmap, dashboard, compare va review feed**, nhung con thieu test bao phu va mot so polish UI/UX.

## Doi chieu theo phase

### Phase 1 - Smart Roadmap

#### 1. Model va database

Trang thai: **Da lam**

Da co trong [backend/api/models.py](/d:/Workspace/DACS/backend/api/models.py):

- `Course` da co metadata cho compare/roadmap:
  - `difficulty_level`
  - `estimated_hours`
  - `price_type`
  - `certificate_type`
- `Roadmap`
- `RoadmapStep`

Ghi chu:

- `extracted_skills`, `roadmap_data`, `RoadmapStep.skills` dang luu bang `TextField` theo JSON string.
- Cach nay van phu hop voi SQL Server va khong can doi ngay neu uu tien demo.

#### 2. AI service layer

Trang thai: **Da lam**

Da co trong [backend/api/ai_service.py](/d:/Workspace/DACS/backend/api/ai_service.py):

- `AIProvider`
- `GeminiProvider`
- `FallbackProvider`
- `get_ai_provider()`
- logic prompt tao roadmap
- logic tao tom tat compare bang AI

Danh gia:

- Kien truc provider da su dung duoc ngay.
- Da co fallback khi thieu API key hoac AI loi.

#### 3. JD parser

Trang thai: **Da lam**

Da co trong [backend/api/jd_parser.py](/d:/Workspace/DACS/backend/api/jd_parser.py):

- nhan text tu do
- nhan URL JD
- lay noi dung bang `requests` + `BeautifulSoup`

Danh gia:

- Dap ung muc tieu do an/demo.
- Chua co parser rieng cho tung site, nhung hien tai la du.

#### 4. API endpoints roadmap

Trang thai: **Da lam**

Da co trong:

- [backend/api/views.py](/d:/Workspace/DACS/backend/api/views.py)
- [backend/api/serializers.py](/d:/Workspace/DACS/backend/api/serializers.py)
- [backend/api/urls.py](/d:/Workspace/DACS/backend/api/urls.py)

Endpoint da co:

- `POST /api/roadmap/generate/`
- `GET /api/roadmaps/`
- `GET /api/roadmaps/<id>/`
- `PUT /api/roadmaps/<id>/`
- `DELETE /api/roadmaps/<id>/`

Ngoai ra da co them:

- `GET /api/dashboard/stats/` de nuoi widget dashboard tu roadmap

Luu y ky thuat:

- O [backend/api/views.py](/d:/Workspace/DACS/backend/api/views.py:408), `order` dang lay tu AI payload. Neu AI khong tra `order` thi step co the ve `0`.

#### 5. Frontend roadmap page va luong chinh

Trang thai: **Da lam va da noi vao luong chinh**

Da co:

- [frontend/src/pages/student/app-pages/RoadmapPage.tsx](/d:/Workspace/DACS/frontend/src/pages/student/app-pages/RoadmapPage.tsx)
- [frontend/src/pages/student/hooks/useRoadmap.ts](/d:/Workspace/DACS/frontend/src/pages/student/hooks/useRoadmap.ts)
- [frontend/src/pages/student/styles/roadmap.css](/d:/Workspace/DACS/frontend/src/pages/student/styles/roadmap.css)

Da noi vao flow chinh:

- export `RoadmapPage` trong [frontend/src/pages/student/app-pages/index.ts](/d:/Workspace/DACS/frontend/src/pages/student/app-pages/index.ts)
- route `/roadmap` trong [frontend/src/pages/student/StudentPortal.tsx](/d:/Workspace/DACS/frontend/src/pages/student/StudentPortal.tsx:29)
- nav `Lo trinh AI` trong [frontend/src/pages/student/student-core.ts](/d:/Workspace/DACS/frontend/src/pages/student/student-core.ts:45)
- `student-layout.tsx` da support `active="roadmap"` trong [frontend/src/pages/student/student-layout.tsx](/d:/Workspace/DACS/frontend/src/pages/student/student-layout.tsx:24)

Tinh nang da co tren UI:

- tao roadmap tu prompt/JD
- xem roadmap vua tao
- load roadmap cu tu history
- toggle hoan thanh tung step
- xoa roadmap

#### 6. Search page va vi tri trong san pham

Trang thai: **Da duoc day xuong thanh tinh nang phu**

Thuc te hien tai:

- `SearchPage` van ton tai o route `/search`
- nav chinh uu tien `roadmap`, `compare`, `hub`
- dashboard CTA da tro ve `/roadmap` trong [DashboardPage.tsx](/d:/Workspace/DACS/frontend/src/pages/student/app-pages/DashboardPage.tsx:302)

Danh gia:

- Phan nay da sat hon thong diep "AI Learning Advisor" so voi plan cu.

### Phase 2 - Dashboard ca nhan hoa

Trang thai: **Da lam mot phan quan trong**

Da co trong:

- [frontend/src/pages/student/app-pages/DashboardPage.tsx](/d:/Workspace/DACS/frontend/src/pages/student/app-pages/DashboardPage.tsx)
- [frontend/src/pages/student/app-pages/DashboardWidgets.tsx](/d:/Workspace/DACS/frontend/src/pages/student/app-pages/DashboardWidgets.tsx)
- [backend/api/views.py](/d:/Workspace/DACS/backend/api/views.py:489)

Da co:

- widget tien do roadmap
- widget ky nang da dat / dang hoc
- quick stats (`total_roadmaps`, `total_saved`)
- CTA di sang roadmap
- dashboard van giu kha nang course discovery va recommendation

Danh gia:

- Dashboard hien tai da khong con chi la trang catalog.
- Tuy nhien no van la hybrid:
  - vua la dashboard ca nhan hoa
  - vua la trang kham pha khoa hoc

Phan chua xong hoan toan:

- chua co "goi y tuan nay" dung nghia ca nhan hoa theo lich hoc
- chua co next-best-action thong minh dua tren roadmap hien tai

### Phase 3 - So sanh khoa hoc

Trang thai: **Da lam backend + frontend co ban**

Da co backend:

- `POST /api/courses/compare/` trong [backend/api/views.py](/d:/Workspace/DACS/backend/api/views.py:564)

Da co frontend:

- [frontend/src/pages/student/app-pages/ComparePage.tsx](/d:/Workspace/DACS/frontend/src/pages/student/app-pages/ComparePage.tsx)
- [frontend/src/pages/student/hooks/useCompare.ts](/d:/Workspace/DACS/frontend/src/pages/student/hooks/useCompare.ts)
- route `/compare` trong [frontend/src/pages/student/StudentPortal.tsx](/d:/Workspace/DACS/frontend/src/pages/student/StudentPortal.tsx:30)

Tinh nang da co:

- chon 2-4 khoa hoc
- so sanh theo gia, do kho, thoi luong, chung chi
- AI summary ngan gon cho ket qua compare

Phan chua xong:

- chua thay nut "So sanh" duoc noi tu course card/course detail vao flow chon nhanh
- sidebar cua trang compare dang de `active="none"` trong [ComparePage.tsx](/d:/Workspace/DACS/frontend/src/pages/student/app-pages/ComparePage.tsx:59), nen UX chua that su khop nav chinh

### Phase 4 - Student Hub / Cong dong

Trang thai: **Da lam mot phan, chua day du**

Da co backend:

- `CourseReview`
- `ReviewVote`
- `GET/POST /api/reviews/`
- `POST /api/reviews/<id>/vote/`

Da co frontend:

- [frontend/src/pages/student/app-pages/StudentHubPage.tsx](/d:/Workspace/DACS/frontend/src/pages/student/app-pages/StudentHubPage.tsx)
- [frontend/src/pages/student/hooks/useReviews.ts](/d:/Workspace/DACS/frontend/src/pages/student/hooks/useReviews.ts)
- [frontend/src/pages/student/app-pages/CourseReviewSection.tsx](/d:/Workspace/DACS/frontend/src/pages/student/app-pages/CourseReviewSection.tsx)

Da noi vao san pham:

- route `/hub`
- feed review cong dong
- sort `recent` / `top`
- upvote/downvote review
- review section trong [CourseDetailPage.tsx](/d:/Workspace/DACS/frontend/src/pages/student/app-pages/CourseDetailPage.tsx:190)

Danh gia:

- Plan cu ghi "chua bat dau" la khong con dung.
- Trang thai dung hon la "da co MVP cho review community".

Phan chua co:

- comment thread
- moderation/admin workflow
- pagination/feed ranking nang cao
- thong bao hoac profile activity lien quan den review

## Doi chieu quyet dinh ky thuat

### AI provider

Trang thai hien tai:

- Gemini la provider chinh
- co fallback de he thong van demo duoc khi khong co API key

Danh gia:

- Quyáº¿t dinh nay hop ly va nen giu.

### Vector DB

Trang thai hien tai:

- chua dung Pinecone hay vector DB rieng
- dang dua tren TF-IDF / ranking co san

Danh gia:

- Van chap nhan duoc cho bai hien tai.
- Khong can mo rong them neu muc tieu la hoan thien demo on dinh.

### Kien truc frontend

Trang thai hien tai:

- to chuc theo `pages/student/{app-pages,hooks,services,styles}`
- luong student tach kha ro khoi admin

Danh gia:

- Cau truc nay dung duoc va de theo doi.
- Tuy nhien repo van con mot so dau hieu chua don dep:
  - co `venv`, `node_modules`, `dist`, `output`, `tmp` trong workspace
  - tai lieu plan cu chua cap nhat theo code

## Khoang trong uu tien cao nhat

Neu doi xung voi code hien tai, thu tu viec can uu tien nen la:

1. Cap nhat lai plan/tai lieu cho sat code
2. Bo sung test backend cho roadmap, compare, review/vote
3. Polish UX cho compare va hub
4. Tang chat "advisor" cho dashboard thay vi chi dung widget thong ke
5. Sau cung moi nghiem tuc hoa cong dong nang cao

## Task breakdown moi cho repo nay

### Task A - Dong bo lai tai lieu va plan

Muc tieu:

- cap nhat `current-plan-alignment.md`
- mo ta dung tinh nang da co
- xoa nhan dinh da loi thoi ve roadmap route/nav/export

Trang thai:

- **Da cap nhat trong lan review nay**

### Task B - Test bao phu cho roadmap / compare / review

Muc tieu:

- test generate roadmap voi fallback
- test list/detail/update/delete roadmap
- test compare 2-4 courses
- test create review + vote flow

Trang thai:

- **Chua lam**

### Task C - Polish frontend cho compare va hub

Muc tieu:

- active state dung cho sidebar compare
- them nut/flow compare tu course detail hoac course cards
- thong diep empty/loading/onboarding ro hon

Trang thai:

- **Lam tiep sau test**

### Task D - Nang cap dashboard thanh advisor that su

Muc tieu:

- goi y next step tu roadmap hien tai
- hoc gi tiep theo trong tuan
- canh bao roadmap nao dang dung lai

Trang thai:

- **Da co nen, chua toi muc thong minh hoa**

### Task E - Mo rong cong dong

Muc tieu:

- comment thread
- moderation
- ranking/pagination
- profile activity

Trang thai:

- **Phase sau**

## Verification hien tai

Da kiem tra truc tiep tren codebase hien tai:

- frontend build pass voi `npm run build`
- backend test pass voi `python manage.py test`

Nhung can luu y:

- test hien tai chua bao phu roadmap
- test hien tai chua bao phu compare
- test hien tai chua bao phu review/hub

## Tom tat 1 cau

Plan cu dang danh gia thap hon thuc te; code hien tai **da hoan thanh phan lon Phase 1, da co mot phan ro rang cua Phase 2, va da co MVP cho Phase 3-4**, viec can lam tiep khong phai la "noi roadmap vao flow" nua ma la **dong bo tai lieu, bo sung test va polish san pham**.

