# Kế hoạch phát triển Dựng hình Không gian 3D nâng cao (GeoGebra 3D Style)

Tài liệu này chứa lộ trình phát triển toàn diện công cụ dựng hình không gian 3D trên frontend, đồng bộ hóa với hệ thống khối hình học ở backend. Kế hoạch được phân loại thành các Phase dưới dạng Checklist.

---

## Phase 1: Công cụ Bắt điểm & Ràng buộc Hình học cơ bản (Snapping & Constraint Engine)
Giai đoạn này tập trung vào việc xây dựng các công cụ nền tảng để tạo ra các điểm phụ thuộc (Dependent Points) thay vì tự động snap ngầm.

- [x] **Công cụ Trung điểm (Midpoint Tool)**:
  - Chọn công cụ -> Pick 2 điểm A và B (hoặc pick 1 Đoạn thẳng).
  - Hệ thống sinh ra 1 Điểm phụ thuộc nằm tại trung điểm. Điểm này tự động cập nhật vị trí nếu A, B hoặc đoạn thẳng thay đổi.
- [x] **Công cụ Giao điểm (Intersection Tool)**:
  - Chọn công cụ -> Pick 2 thực thể hình học.
  - Tự động sinh ra Điểm giao phụ thuộc (Đường+Đường, Đường+Mặt phẳng) hoặc Đoạn thẳng/Đường thẳng giao tuyến (Mặt phẳng+Mặt phẳng).
- [x] **Công cụ Hình chiếu vuông góc (Perpendicular Projection Tool)**:
  - Chọn công cụ -> Pick 1 Điểm A -> Pick 1 Đoạn thẳng (hoặc Mặt phẳng).
  - Tự động tính toán hạ đường vuông góc và sinh ra chân đường vuông góc là một Điểm phụ thuộc H.
- [x] **Smart Guides (Đường gióng ảo)**:
  - Tính năng UI hoạt động ngầm (Auto-snap).
  - Khi kéo chuột, tự động hiển thị tia đứt nét mờ chạy dài vô tận giúp canh thẳng hàng, song song hoặc vuông góc với các cạnh/trục tọa độ có sẵn.

---

## Phase 2: Hoàn thiện Nhóm Hình 2D / Mặt phẳng Đáy (Complete 2D Polygons Suite)
Hỗ trợ đầy đủ định nghĩa, lưu trữ và kết xuất trực quan các hình đa giác phẳng để làm cơ sở dựng hình. Các đa giác được xây dựng thông qua các đỉnh phụ thuộc.

- [x] **Đa giác đều (Regular Polygons)**:
  - Cung cấp chung 1 công cụ "Đa giác đều". Pick 2 điểm (A, B) làm cạnh đáy -> Nhập số lượng cạnh (3, 4, 5, 6...).
  - Dùng để dựng Tam giác đều, Hình vuông, Ngũ giác đều, Lục giác đều.
- [x] **Các Tam giác đặc biệt (Special Triangles)**:
  - **Tam giác vuông:** Chọn công cụ -> Pick 2 điểm A, B (cạnh góc vuông) -> Điểm C (chuột) bị giới hạn chạy trên đường vuông góc tại A hoặc B.
  - **Tam giác cân:** Chọn công cụ -> Pick 2 điểm A, B (đáy) -> Điểm C (chuột) bị giới hạn chạy trên đường trung trực của AB.
  - **Tam giác vuông cân:** Chọn công cụ -> Pick 2 điểm A, B -> Hệ thống tự đẻ ra C tạo thành tam giác vuông cân tại A hoặc B.
- [x] **Các Tứ giác đặc biệt (Special Quadrilaterals)**:
  - **Hình bình hành:** Pick 3 điểm A, B, C -> Tự động sinh ra điểm phụ thuộc D.
  - **Hình chữ nhật:** Pick 2 điểm A, B (1 cạnh) -> Điểm C bị giới hạn chạy trên đường vuông góc. Click chốt C -> Tự sinh ra D.
  - **Hình thoi:** Pick 2 điểm A, B (đường chéo) -> Tự động sinh ra C, D tạo thành hình thoi.
- [x] **Đường tròn (Circles)**:
  - Dựng đường tròn phẳng đi qua 3 điểm (Pick 3 điểm).
  - Dựng đường tròn phẳng xác định bởi Tâm + Bán kính / Tâm + 1 Điểm thuộc đường tròn.
- [x] **Lật hình phẳng 2D & Chuẩn hóa Khối 3D (2D Flipping & 3D Normal Normalization)**:
  - Hỗ trợ nút bấm lật dọc (qua trục chứa cạnh đáy AB) và lật ngang (qua trung trực của AB) cho các hình phẳng đặc biệt trực tiếp từ Sidebar bên phải.
  - Chuẩn hóa vector pháp tuyến của đa giác đáy khi dựng khối 3D (chóp, lăng trụ) để đảm bảo khối 3D luôn đứng thẳng hướng lên trên ($z \ge 0$) kể cả khi đáy bị lật ngược.
- [x] **Khối xoay điều hướng Camera (Orientation Gizmo)**:
  - Thiết kế khối xoay 3D (dạng mini-map Blender style) hiển thị trực quan các trục tọa độ X, Y, Z.
  - Đồng bộ góc xoay thời gian thực theo camera của cả hai chế độ vẽ (Chế độ tự vẽ và Chế độ vẽ thông minh).
  - Cho phép người dùng click trực tiếp vào đầu các trục để xoay camera mượt mà (animation transition 400ms) về góc nhìn tương ứng (Top/Front/Side view).

---

## Phase 3: Hệ thức Đại số & Ràng buộc Động cho Hình 2D (2D Algebraic Relations & Constraints)
Giai đoạn này tập trung vào các đường/tia hình học đặc biệt và xây dựng bộ não tính toán phụ thuộc (Dependency Graph) để giữ các ràng buộc khi kéo thả.

- [x] **Công cụ Trọng tâm (Centroid Tool)**:
  - Chọn công cụ -> Pick vào 1 Đa giác (hoặc pick 3 điểm của tam giác).
  - Tự động sinh ra 1 Điểm phụ thuộc nằm tại trọng tâm đa giác. Điểm này sẽ tự động dịch chuyển nếu các đỉnh thay đổi.
- [x] **Các Công cụ Đường/Tia đặc biệt (Special Line Tools)**:
  - **Đường trung trực:** Chọn công cụ -> Pick 1 đoạn thẳng (hoặc 2 điểm) -> Sinh ra Đường thẳng đi qua trung điểm và vuông góc.
  - **Tia phân giác:** Chọn công cụ -> Pick 3 điểm (A, B, C với B là đỉnh) -> Sinh ra Tia phân giác trong của góc ABC.
  - **Đường song song/vuông góc cố định:** Chọn công cụ -> Pick 1 điểm A -> Pick 1 đường thẳng d -> Sinh ra Đường thẳng/Tia chạy qua A và luôn giữ liên kết song song/vuông góc với d.
- [x] **Hệ thống Ràng buộc Động (Dependency Graph Engine)**:
  - Đây là lõi kiến trúc Code (không phải UI). Xây dựng một đồ thị luồng dữ liệu (DAG).
  - Khi một Điểm gốc (Parent Point) thay đổi tọa độ (do người dùng kéo), hệ thống gọi hàm `resolveDependencies()` lan truyền (propagate) để tính toán lại tọa độ/phương trình của toàn bộ các điểm/đường con phụ thuộc (Child Entities) như: trung điểm, hình chiếu, giao điểm, trọng tâm.

---

## Phase 4: Nhóm Khối 3D & Vật thể Không gian nâng cao (3D Solids Suite)
Xây dựng các khối 3D bằng cơ chế "Đùn" (Extrude) và phát triển từ các mặt phẳng đáy 2D (kế thừa từ Phase 2 và Phase 3).

- [x] **Hệ thống Hình chóp & Tứ diện (Pyramids & Tetrahedrons)**:
  - **Chóp thường / Tứ diện thường:** Chọn công cụ -> Pick 1 Đa giác làm đáy -> Pick 1 điểm tự do làm Đỉnh chóp -> Tự động sinh các cạnh bên.
  - **Chóp đều / Tứ diện đều:** Chọn công cụ -> Pick 1 Đa giác đều làm đáy -> Điểm Đỉnh chóp bị giới hạn chạy trên trục vuông góc với mặt đáy tại Trọng tâm đáy. Click (hoặc nhập số) chốt chiều cao.
- [x] **Hệ thống Lăng trụ & Hình hộp (Prisms & Cuboids)**:
  - **Lăng trụ xiên / Hộp song song:** Chọn công cụ -> Pick mặt đáy -> Pick 1 điểm lơ lửng làm 1 đỉnh mặt trên -> Tự động tịnh tiến đáy lên theo vector để sinh mặt trên.
  - **Lăng trụ đứng / Hộp chữ nhật:** Chọn công cụ -> Pick mặt đáy -> Kéo chuột theo trục vuông góc với đáy (hoặc nhập chiều cao) -> Sinh lăng trụ đứng.
  - **Lập phương:** Pick hình vuông làm đáy -> Tự động lấy độ dài cạnh đáy làm chiều cao để sinh khối lập phương thẳng đứng.
- [x] **Khối tròn xoay (Round Solids)**:
  - **Hình nón (Cone) / Hình trụ (Cylinder):** Chọn công cụ -> Pick 1 Đường tròn làm đáy -> Kéo chuột / Nhập chiều cao dọc theo trục trung tâm -> Tự động đùn lên thành khối nón hoặc trụ phụ thuộc vào đáy.

---

## Phase 5: Giao diện Đo đạc & Tính toán Không gian (Measure & Inspect Mode)
Xây dựng bộ công cụ phục vụ việc kiểm tra sau khi đã dựng hình xong. Nhóm công cụ này sẽ được thiết kế **tách biệt hoàn toàn về mặt UI** so với các công cụ tạo hình (ví dụ: nằm ở một Tab "Đo đạc" riêng, hoặc một Mode "Inspect" riêng biệt) để tránh làm rối màn hình vẽ.

- [ ] **Giao diện Đo đạc chuyên biệt (Inspect UI)**:
  - Thiết kế UI riêng cho việc đo lường, không trộn lẫn với Toolbar dựng hình.
- [ ] **Công cụ Đo Khoảng cách / Độ dài (Distance Tool)**:
  - Pick 2 điểm / 1 đoạn / 1 điểm và 1 mặt -> Hiển thị nhãn khoảng cách lơ lửng trong 3D. Tự động cập nhật khi mô hình thay đổi.
- [ ] **Công cụ Đo Góc (Angle Tool)**:
  - Pick 3 điểm (đỉnh ở giữa) hoặc 2 đường/mặt phẳng -> Vẽ cung tròn biểu diễn góc và hiện nhãn số đo độ.
- [ ] **Công cụ Tính Diện tích & Thể tích (Area & Volume Tool)**:
  - Pick 1 đa giác/đường tròn -> Hiển thị nhãn Diện tích bề mặt.
  - Pick 1 khối 3D (chóp, lăng trụ, nón...) -> Hiển thị nhãn Thể tích khối.
