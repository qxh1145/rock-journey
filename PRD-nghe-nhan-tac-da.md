# PRD — Web game “Nghệ nhân tạc đá”

**Phiên bản:** 1.3 (bỏ role staff, admin đảm nhận trao quà)  
**Ngày:** 05/10/2026  
**Trạng thái:** Dự thảo để review  
**Nền tảng:** Web responsive, ưu tiên mobile; Supabase Auth + PostgreSQL/Edge Functions; frontend host riêng

## 1. Tóm tắt sản phẩm

“Nghệ nhân tạc đá” là web game kiến thức trên di động. Người chơi đăng nhập bằng Google và trả lời 12 câu hỏi về đá mỹ nghệ. Sau mỗi 2 câu trả lời được lưu (đúng hoặc sai), mascot chạy animation tạc đá và chuyển sang hình thái kế tiếp. Mỗi tài khoản Google/email được phép có một lượt chơi; lượt đang dở được tiếp tục sau khi thoát hoặc mất mạng. Người hoàn thành đủ 12 câu và trả lời đúng chính xác 10 câu nhận danh hiệu “Mầm Nghề” và đủ điều kiện nhận quà. Mọi kết quả khác hiển thị lời cảm ơn đã tham gia. Admin tra cứu người chơi theo email, ghi nhận quà đã trao, đồng thời có dashboard quản trị, giám sát, chỉnh sửa dữ liệu và xuất báo cáo.

## 2. Mục tiêu và chỉ số thành công

### Mục tiêu

- Truyền tải kiến thức nghề điêu khắc đá qua trải nghiệm ngắn, dễ dùng trên điện thoại.
- Tạo động lực hoàn thành bằng tiến trình mascot, hiệu ứng và danh hiệu.
- Bảo đảm mỗi email đã xác thực chỉ có một lượt, có thể resume an toàn.
- Cho phép admin tra cứu kết quả và tránh trao quà lặp.

### Chỉ số đề xuất

- Tỷ lệ đăng nhập Google thành công.
- Tỷ lệ bắt đầu game trên số người đăng nhập lần đầu.
- Tỷ lệ hoàn thành đủ 12 câu.
- Tỷ lệ hoàn thành với đúng chính xác 10/12 câu và nhận danh hiệu “Mầm Nghề”.
- Tỷ lệ resume thành công sau gián đoạn.
- Tỷ lệ lỗi lưu câu trả lời / lỗi xác thực.
- Số bản ghi quà đã trao và thao tác bị từ chối do không đủ điều kiện hoặc đã nhận.

Mục tiêu định lượng cần được chủ sản phẩm chốt sau khi có lưu lượng dự kiến.

## 3. Phạm vi

### Trong phạm vi

- Landing, bắt buộc Google Sign-In, kiểm tra trạng thái lượt chơi.
- Game 12 câu hỏi trắc nghiệm; mỗi câu chỉ được chốt một lần.
- Hiện đúng/sai; nếu sai, hiện đáp án đúng và giải thích.
- Sau mỗi 2 câu trả lời đã lưu (không phụ thuộc đúng/sai), chạy animation tạc đá và chuyển mascot sang hình thái kế tiếp; các mốc là 2, 4, 6, 8, 10, 12 câu.
- Kết quả cuối: đúng chính xác 10/12 nhận danh hiệu “Mầm Nghề” và đủ điều kiện quà; các kết quả khác nhận lời cảm ơn.
- Lưu người dùng, session, câu trả lời, câu hỏi, playlist, audit và trạng thái quà trong Supabase PostgreSQL; dùng Auth, RLS và RPC/Edge Functions cho nghiệp vụ nhạy cảm.
- Giao diện admin tra cứu email và đánh dấu quà đã trao.
- Dashboard admin để giám sát tiến độ, quản lý thông tin người dùng và dữ liệu game theo quyền CRUD, xuất báo cáo.
- Nhạc nền và sound effects, có điều khiển âm thanh.

### Ngoài phạm vi

- Chơi nhiều lượt, đổi email hoặc xóa lượt để chơi lại.
- Form nhập email thủ công thay cho Google Sign-In.
- Trang trí tiền cảnh bổ sung và ảnh sản phẩm điêu khắc đá cho showcase cuối (đã bỏ theo quyết định nghiệp vụ).
- Thanh toán, giao hàng, đặt lịch nhận quà, quản lý kho quà.
- Bảng xếp hạng, chia sẻ mạng xã hội, nhiều ngôn ngữ, CMS câu hỏi tự phục vụ.
- Chống gian lận cấp cao hoặc xác minh nhân thân ngoài email Google.

## 4. Personas

| Persona | Nhu cầu | Quyền/khả năng |
|---|---|---|
| Người chơi | Chơi nhanh trên điện thoại, biết mình đúng sai, thấy mascot tiến triển, tiếp tục nếu bị gián đoạn | Đăng nhập Google, bắt đầu/tiếp tục một lượt, xem kết quả |
| Quản trị nội dung/vận hành | Cấu hình 12 câu, đáp án/giải thích, xem tình trạng hệ thống | Quyền quản trị; thao tác nội dung có kiểm soát phiên bản |
| Admin | Theo dõi toàn hệ thống, quản lý dữ liệu/người dùng, xuất báo cáo; tìm đúng người chơi theo email, xác nhận điểm và điều kiện, ghi nhận đã trao quà | CRUD theo phạm vi quyền admin; tra cứu email, đánh dấu đã nhận quà; mọi thay đổi được audit log |

## 5. Giả định và quyết định cần chốt

1. 12 câu hỏi có thứ tự cố định như nhau cho mọi người ở phiên bản đầu; nội dung và đáp án được cấu hình trước khi mở game.
2. Người chơi được xác định duy nhất bằng email Google đã xác thực, chuẩn hóa chữ thường và bỏ khoảng trắng. Supabase Auth xác thực Google; dùng `auth.uid` làm định danh nội bộ và không tin email tùy ý do client gửi lên.
3. Một lượt được tạo khi người chơi bấm “Bắt đầu” sau đăng nhập và kiểm tra chưa có lượt. Khi đã tạo, lượt được giữ để resume; không có timeout làm mất lượt.
4. “Hoàn thành” nghĩa là đã trả lời đủ 12 câu. Chỉ người có đúng chính xác 10/12 câu đúng nhận danh hiệu “Mầm Nghề” và đủ điều kiện quà. Người có điểm số khác nhận lời cảm ơn vì đã tham gia, không nhận danh hiệu và không đủ điều kiện quà.
5. Quà có số lượng và cách trao do vận hành quản lý ngoài game. Điều kiện trong hệ thống chỉ xác nhận đủ tư cách, không đảm bảo còn quà.
6. Game có nhạc nền và sound effects. Người chơi được chọn/đổi nhạc từ playlist do chủ sản phẩm định nghĩa sẵn. Trình duyệt có thể chặn autoplay; khi đó nhạc bắt đầu sau tương tác đầu tiên. Có điều khiển nhạc nền và hiệu ứng; lựa chọn được nhớ trên thiết bị, âm lượng khởi điểm vừa phải.
7. Supabase là nguồn dữ liệu chính; frontend gọi Supabase bằng SDK với publishable key, còn nghiệp vụ chấm điểm/trao quà/quản trị dùng RPC hoặc Edge Functions có xác thực và phân quyền.
8. Chỉ có vai trò `admin` (không có role nhân sự riêng cho việc trao quà); quyền admin được cấp riêng; không cho người dùng tự nâng quyền. Tài khoản admin đầu tiên được cấp qua thao tác quản trị an toàn.

## 6. User flow

### Người chơi mới

```text
Landing → Đăng nhập bằng Google → Supabase Auth xác thực Google, PostgreSQL/RLS áp dụng quyền
  → Không có lượt → Giới thiệu luật/CTA bắt đầu
  → Tạo lượt một cách nguyên tử → Câu 1
  → Trả lời lần lượt câu 1–12 → Màn hình kết quả
```

### Người chơi quay lại khi đang chơi

```text
Landing → Đăng nhập Google → Supabase truy vấn lượt IN_PROGRESS
  → Khôi phục câu chưa trả lời đầu tiên + điểm + mascot
  → Tiếp tục chơi
```

### Người chơi đã hoàn thành

```text
Landing → Đăng nhập Google → Supabase truy vấn lượt COMPLETED
  → Hiện điểm/kết quả, danh hiệu “Mầm Nghề” nếu đúng 10/12 hoặc lời cảm ơn nếu không; kèm trạng thái quà
  → Không có CTA chơi lại
```

### Admin

```text
Đăng nhập admin → Dashboard tổng quan → Lọc/tìm người dùng hoặc session
  → Xem tiến độ và chi tiết → CRUD dữ liệu được phép / xuất báo cáo
  → Mọi thay đổi quan trọng được ghi audit log

Trao quà: Tìm email → Xem điểm, trạng thái, điều kiện, lịch sử quà
  → Nếu đủ điều kiện và chưa nhận: xác nhận trao → ghi nhận người thao tác/thời điểm
```

## 7. Functional requirements

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-01 | Trang game hoạt động tốt ở màn hình điện thoại, hỗ trợ tablet/desktop | Must |
| FR-02 | Bắt buộc xác thực Google trước khi bắt đầu; không có ô nhập email thủ công | Must |
| FR-03 | Supabase Auth xác thực tài khoản Google và cung cấp `auth.uid` cùng email đã xác thực | Must |
| FR-04 | Mỗi định danh chỉ có tối đa một lượt; tạo lượt phải chống đua khi nhiều tab/yêu cầu đồng thời | Must |
| FR-05 | Hiển thị đúng một câu tại một thời điểm; mỗi câu chỉ ghi nhận một đáp án cuối | Must |
| FR-06 | Trả lời đúng: báo đúng, tăng điểm; sau khi lưu, nếu vừa hoàn thành cặp câu thì chạy animation tạc và chuyển mascot sang hình thái kế tiếp | Must |
| FR-07 | Trả lời sai: khóa câu, hiện đáp án đúng và giải thích, điểm không tăng; vẫn tính vào cặp 2 câu để kích hoạt animation tạc ở câu chẵn | Must |
| FR-08 | Lưu mỗi câu trả lời và tiến trình qua Supabase vào PostgreSQL; tải lại/trở lại tiếp tục đúng câu | Must |
| FR-09 | Hiển thị tiến trình 12 câu và số câu đúng; không để trạng thái UI vượt dữ liệu đã được Supabase xác nhận | Must |
| FR-10 | Kết thúc đủ 12 câu: đúng chính xác 10/12 cấp “Mầm Nghề” và đủ điều kiện quà; mọi điểm số khác hiện lời cảm ơn và không đủ điều kiện | Must |
| FR-11 | Người chơi hoàn thành không thể chơi lại; đăng nhập lại thấy kết quả cũ | Must |
| FR-12 | Bắt buộc có nhạc nền và sound effects; người chơi chọn/đổi track trong playlist cấu hình sẵn, điều khiển bật/tắt riêng từng nhóm và nhớ lựa chọn trên thiết bị | Must |
| FR-13 | Màn hình nội bộ cho admin tra cứu theo email, xem kết quả và điều kiện quà | Must |
| FR-14 | Chỉ admin mới được đánh dấu quà đã trao; lưu người thao tác, thời điểm | Must |
| FR-15 | Mọi thao tác ghi nhận đáp án/quà có phản hồi đang xử lý, thành công hoặc lỗi và có thể retry an toàn | Must |
| FR-16 | Hỗ trợ giảm chuyển động theo cài đặt hệ điều hành; hiệu ứng không cản trở thao tác | Should |
| FR-17 | Có role `admin` riêng, dashboard tổng quan theo dõi lượt đang chơi/hoàn thành, điểm, đủ điều kiện quà và trạng thái trao | Must |
| FR-18 | Admin có thể tra cứu thông tin người dùng và tiến độ/câu trả lời theo phân quyền | Must |
| FR-19 | Admin được CRUD người dùng, câu hỏi/cấu hình game, playlist và trạng thái quà theo quy tắc; thao tác nhạy cảm phải ghi audit log | Must |
| FR-20 | Admin xuất báo cáo người dùng, tiến độ, điểm và quà theo bộ lọc; hỗ trợ CSV tối thiểu | Must |

## 8. Business rules

### Câu hỏi và điểm

- Tổng 12 câu, mỗi câu có một đáp án đúng, nhiều lựa chọn và phần giải thích cho tình huống trả lời sai.
- Mỗi câu chỉ chấp nhận một lần trả lời. Cơ sở dữ liệu/RPC tin cậy là nơi quyết định đáp án đúng/sai và điểm.
- `correctCount` chỉ tăng khi đáp án đúng; tối đa 12.
- Điểm chỉ dùng để tính kết quả, danh hiệu và điều kiện quà; không điều khiển tiến độ tạc mascot.
- Mỗi câu được lưu, dù đúng hay sai, đều tăng `answeredCount`; sau mỗi câu chẵn (2, 4, 6, 8, 10, 12), phát một animation tạc đá và chuyển mascot sang hình thái kế tiếp. Câu lẻ chỉ lưu đáp án/cập nhật tiến độ, không chạy animation tạc. Câu sai không tăng điểm, không làm mascot lùi và không cho trả lời lại.
- Thứ tự câu được giữ ổn định trong một lượt. Nếu nội dung câu được cập nhật sau khi người chơi bắt đầu, lượt cũ vẫn tham chiếu phiên bản câu hỏi ban đầu.

### Mascot và danh hiệu

| Số câu đã trả lời (`answeredCount`) | Hình thái mascot | Hiệu ứng khi đạt mốc |
|---:|---|---|
| 0–1 | Khối đá nguyên bản (`RAW`) | Chưa hoàn tất cặp câu đầu |
| 2–3 | Tạc lần 1 (`CARVED_1`) | Animation tạc và chuyển hình thái lần 1 |
| 4–5 | Tạc lần 2 (`CARVED_2`) | Animation tạc và chuyển hình thái lần 2 |
| 6–7 | Tạc lần 3 (`CARVED_3`) | Animation tạc và chuyển hình thái lần 3 |
| 8–9 | Tạc lần 4 (`CARVED_4`) | Animation tạc và chuyển hình thái lần 4 |
| 10–11 | Tạc lần 5 (`CARVED_5`) | Animation tạc và chuyển hình thái lần 5 |
| 12 | Hoàn thiện (`FINISHED`) | Animation tạc lần 6, hoàn tất hình thái cuối |

- Mỗi câu trả lời được lưu đều tăng `answeredCount`; chỉ khi count vừa chạm số chẵn 2, 4, 6, 8, 10 hoặc 12 mới chạy một animation tạc và chuyển mascot đúng một hình thái. Đáp án trong cặp có thể đúng hoặc sai. Dùng idempotency/event ID theo mốc để retry không phát trùng.
- Khi resume, mascot khôi phục theo hình thái đạt được gần nhất: `floor(answeredCount / 2)`, còn điểm khôi phục riêng theo `correctCount`. Không phát lại animation của các mốc đã xác nhận trước đó. Nếu phản hồi mốc bị thất lạc, retry cùng idempotency key và phát animation tối đa một lần.
- Câu 10 là mốc tạc thứ 5, không cấp danh hiệu. Sau khi hoàn thành đủ 12 câu, chỉ `correctCount == 10` mới cấp danh hiệu “Mầm Nghề” và đủ điều kiện quà.

### Kết quả và danh hiệu

- Chỉ kết quả cuối đúng chính xác 10/12 được cấp danh hiệu “Mầm Nghề” và đủ điều kiện nhận quà.
- Các kết quả 0–9/12 và 11–12/12 đều hiển thị lời cảm ơn vì đã tham gia; không hiện danh hiệu và không đủ điều kiện quà.
- Không trao danh hiệu khi người chơi mới trả lời đến câu 10; phải hoàn thành đủ 12 câu mới chốt kết quả.
- Thông điệp đạt: “Chúc mừng! Bạn nhận được danh hiệu Mầm Nghề.” Thông điệp còn lại: “Cảm ơn bạn đã tham gia hành trình tạc đá cùng chúng tôi.”

### Lượt và quà

- Một lượt duy nhất theo Google subject/email đã xác thực.
- `IN_PROGRESS` có thể resume vô thời hạn theo chính sách hiện tại; không tạo lượt mới.
- Đã `COMPLETED`: chỉ xem lại kết quả; không có thao tác reset/chơi lại phía người chơi.
- `qualifiedForReward = (status == COMPLETED && answeredCount == 12 && correctCount == 10)`.
- `rewardClaimed` chỉ có thể chuyển từ false sang true bởi admin, với thao tác nguyên tử để ngăn hai người cùng ghi nhận.
- Mỗi lượt đủ điều kiện chỉ ghi nhận trao quà một lần. Lưu `rewardClaimedAt`, `rewardClaimedBy` và mã tham chiếu/ghi chú tùy chọn.

## 9. State machine

### Trạng thái lượt

```text
NO_SESSION ── start (sau auth + kiểm tra duy nhất) ──> IN_PROGRESS
IN_PROGRESS ── trả lời câu 1–12, còn câu chưa làm ──> IN_PROGRESS
IN_PROGRESS ── trả lời đủ 12 câu ──> COMPLETED
COMPLETED ── đăng nhập lại ──> COMPLETED (read-only cho người chơi)
```

Lỗi mạng không phải trạng thái nghiệp vụ mới: client hiển thị trạng thái mất kết nối, giữ lựa chọn chưa xác nhận cục bộ và đồng bộ lại. Supabase chỉ xác nhận câu sau khi giao dịch đã lưu. Khi người dùng gửi lại cùng request ID, Supabase trả cùng kết quả mà không cộng điểm lần hai.

### Trạng thái quà

```text
NOT_QUALIFIED (chưa hoàn thành hoặc correctCount khác 10)
QUALIFIED_UNCLAIMED (COMPLETED + answeredCount = 12 + correctCount = 10 + chưa trao)
CLAIMED (đã được admin ghi nhận)
```

Không cho chuyển ngược trạng thái và không cho CLAIMED nếu không đủ điều kiện.

## 10. Danh sách màn hình

| Màn hình | Nội dung chính | Hành động |
|---|---|---|
| Landing | Tên game, mô tả ngắn, mascot khối đá, CTA đăng nhập | Đăng nhập Google |
| Đang xác thực/lỗi xác thực | Trạng thái xử lý, thông báo lỗi dễ hiểu | Thử lại/chọn tài khoản Google |
| Hướng dẫn | Luật 12 câu, một lần mỗi câu, ngưỡng 10/12 | Bắt đầu hoặc tiếp tục |
| Gameplay | Số câu, tiến trình trả lời, điểm, mascot lớn, câu hỏi trên sổ lật, checkbox và mute | Chọn một đáp án, xem dấu tick, chốt câu trả lời |
| Phản hồi đáp án | Đúng/sai; nếu sai hiện đáp án đúng và giải thích | Câu tiếp theo |
| Mất kết nối/đồng bộ | Cho biết dữ liệu nào đang chờ xác nhận | Thử đồng bộ lại |
| Kết quả | Điểm /12, trạng thái hoàn thành và mascot; đúng chính xác 10 hiện huy hiệu “Mầm Nghề”, các kết quả khác hiện lời cảm ơn | Xem kết quả; không chơi lại |
| Tra cứu quà (admin) | Tìm email, lọc trạng thái | Mở chi tiết |
| Chi tiết người chơi/quà | Email, thời gian, điểm, câu trả lời tùy quyền, eligibility, trạng thái quà | Đánh dấu đã trao |
| Không có quyền/lỗi vận hành | Thông báo truy cập bị từ chối hoặc lỗi | Quay lại/thử lại |
| Dashboard admin | KPI, bộ lọc, bảng hoạt động gần đây/cảnh báo | Lọc, mở hồ sơ, xuất báo cáo |
| Hồ sơ người dùng admin | Email, session, tiến độ, đáp án, điểm, quà, audit phù hợp | CRUD theo quyền, khóa/ẩn danh hóa |
| Quản lý nội dung admin | Câu hỏi, phiên bản bộ câu hỏi, playlist và tài khoản admin | Tạo/sửa bản nháp, kích hoạt, lưu trữ |

## 11. UX behavior

- Thiết kế mobile-first; vùng bấm đáp án lớn, cách nhau rõ, dễ dùng bằng một tay.
- Không tự chuyển câu ngay sau khi chọn; hiển thị phản hồi và nút “Câu tiếp theo” để người chơi đọc giải thích. Ở câu 12, nút trở thành “Xem kết quả”.
- Chọn checkbox chỉ đặt lựa chọn tạm và hiện dấu tick; người chơi bấm “Chốt đáp án” để gửi. Sau khi server xác nhận, hiện phản hồi/giải thích; nếu `answeredCount` vừa chạm số chẵn thì chạy animation tạc đá dù câu đúng hay sai. Câu lẻ không kích hoạt animation tạc. Nếu yêu cầu đang gửi, khóa tương tác chống gửi trùng.
- Có tiến trình rõ: “Câu 4/12”, số câu đúng và trạng thái mascot. Phần trăm tạc tính theo số câu đã trả lời, không theo điểm đúng.
- Nếu tải lại, mở đúng câu kế tiếp chưa trả lời; khôi phục `correctCount` và mascot stage theo `answeredCount` độc lập.
- Nếu đăng nhập lại nhưng lượt đã hoàn thành, hiển thị kết quả cuối và trạng thái nhận quà hiện tại nếu được phép công khai; không cung cấp nút chơi lại.
- Điều khiển nhạc nền và sound effects luôn dễ tìm, có nhãn và trạng thái truy cập được cho screen reader.
- Người chơi mở danh sách track, chọn track khác và chuyển nhạc ngay trong phiên chơi; thao tác này không ảnh hưởng câu hỏi hoặc tiến trình.
- Khi đổi track, giảm âm ngắn hoặc crossfade nếu khả thi để tránh chuyển đột ngột.
- Dùng văn bản kèm màu/biểu tượng cho đúng/sai, không chỉ phân biệt bằng màu.
- Khi bật reduced motion, thay animation dài bằng chuyển trạng thái ngắn/fade; game vẫn dùng được.

## 12. Đặc tả animation

### Thành phần sân khấu

Mascot đặt trên bệ đá với background. Búa/đục, bụi, mảnh đá và vết nứt là lớp hiệu ứng tách rời để có thể animate, thay thế hoặc giảm chuyển động. Các lớp hiệu ứng không che câu hỏi hay nút đáp án.

### Mốc và nhịp tham khảo

| Mốc | Trình tự gợi ý | Thời lượng mục tiêu |
|---|---|---:|
| Sau câu chẵn đã lưu (2, 4, 6, 8, 10) | Búa/đục tác động, bụi/mảnh đá; chuyển mascot sang hình thái kế tiếp | 0,7–1,2 giây |
| Sau câu lẻ đã lưu (1, 3, 5, 7, 9, 11) | Cập nhật tiến trình câu/điểm và phản hồi đáp án; không chạy animation tạc | Không có |
| Sau câu 12 đã lưu | Búa/đục hoàn tất hình thái cuối; có thể thêm ánh sáng hoàn thiện nhẹ trong cùng sequence, không liên quan điểm số | Tối đa 1,4 giây |

- Chỉ các mốc mỗi 2 câu mới chạy animation tạc; câu trả lời sai cũng được tính vào cặp như câu đúng. Mỗi mốc làm mascot tiến đúng một hình thái. Danh hiệu chỉ xuất hiện sau màn kết quả khi xác định đủ 12 câu và chính xác 10 câu đúng.
- Giữ hiệu ứng thường dưới 0,8 giây; hiệu ứng mốc/đánh bóng tối đa 1,4 giây. Không chặn thao tác hoặc bắt người chơi chờ lâu; reduced motion thay bằng chuyển stage/fade ngắn.
- Ưu tiên sprite/layer animation nhẹ hoặc CSS/Lottie tối ưu; tránh tải video lớn.
- Cần asset ở kích thước đủ nét cho màn hình mật độ cao, có nền trong suốt với các layer ghép; thống nhất anchor/pivot và vùng an toàn.
- Khi resume, render đúng trạng thái cuối; không chạy lại sequence lịch sử.

## 13. Sound spec

Nhạc nền và sound effects là thành phần bắt buộc nhằm tạo không khí và phản hồi cho người chơi, nhưng không lấn át câu hỏi hoặc lời giải thích.

### Nhạc nền

- Có nhạc nền không lời xuyên suốt trải nghiệm game, gợi không khí xưởng điêu khắc thủ công.
- Playlist do chủ sản phẩm định nghĩa sẵn; người chơi chỉ chọn track trong danh sách, không nhập URL hay tải nhạc lên.
- Mỗi track có `trackId`, tên hiển thị, tệp/URL asset, thời lượng, trạng thái hoạt động và thứ tự hiển thị.
- Người chơi được đổi track bất cứ lúc nào; ghi nhớ track hiện tại trên thiết bị và dùng lại khi quay lại.
- Nhạc loop mượt, không nghe thấy điểm nối; có thể chuyển cảnh nhẹ giữa landing, gameplay và kết quả.
- Âm lượng nền vừa phải, thấp hơn sound effects; giảm nhẹ nhạc khi có hiệu ứng quan trọng.
- Nếu trình duyệt chặn autoplay, bắt đầu phát sau tương tác đầu tiên và hiển thị trạng thái/điều khiển âm thanh rõ ràng.
- Người chơi có thể bật/tắt nhạc nền độc lập với sound effects; ghi nhớ lựa chọn trên thiết bị.

| Sự kiện | Âm thanh gợi ý | Quy tắc |
|---|---|---|
| Nhạc nền | Track được chọn từ playlist cấu hình sẵn | Loop mượt, âm lượng vừa phải; người chơi đổi track được |
| Chọn đáp án | Click nhẹ | Chỉ sau tương tác người dùng |
| Trả lời đúng | Âm xác nhận tích cực | Không quá lớn/giật mình |
| Trả lời sai | Âm báo nhẹ, không mang tính phạt | Đi cùng thông tin giải thích |
| Đục đá | Búa/đục, đá vỡ, bụi | Một hiệu ứng ở mỗi mốc 2 câu (2/4/6/8/10/12), bất kể đúng/sai |
| Hoàn thiện hình thái cuối | Âm quét/ting lấp lánh | Đi kèm sequence tạc ở mốc 12; không phụ thuộc điểm số |
| Nhận danh hiệu | Âm thành tựu ngắn | Chỉ khi kết quả cuối chính xác 10/12 |

- Có lựa chọn track từ playlist cùng điều khiển bật/tắt riêng cho nhạc nền và sound effects; thay đổi có hiệu lực ngay.
- Tôn trọng chính sách autoplay của trình duyệt; sound effects phát theo tương tác, nhạc nền bắt đầu sau tương tác đầu tiên nếu cần.
- Lưu lựa chọn âm thanh trên thiết bị; trạng thái âm thanh không ảnh hưởng nghiệp vụ.
- Cung cấp fallback khi âm thanh không phát được; không truyền thông tin chỉ qua âm thanh.

## 14. Xác thực và phân quyền

### Google Sign-In

- Dùng Supabase Auth với Google OAuth; cấu hình OAuth client và callback URL cho production/staging.
- Không nhận email tùy ý từ client làm bằng chứng danh tính. Supabase Auth xử lý luồng Google OAuth; database policy/RPC đọc danh tính từ JWT đã xác thực.
- Dùng `auth.uid` làm khóa người chơi ổn định; lưu email đã xác thực làm thuộc tính tra cứu, chuẩn hóa email và giữ snapshot lúc bắt đầu lượt.
- Chỉ yêu cầu scope tối thiểu: thông tin profile/email cần thiết.
- Token/credential không ghi vào log hoặc dữ liệu ứng dụng. Supabase SDK quản lý session; không đưa `service_role` key vào frontend.
- Hỗ trợ đăng xuất; đăng nhập lại cùng tài khoản đưa người dùng về lượt hiện có.
- Đổi email Google sau này: liên kết theo `sub`; email hiện tại là thuộc tính cập nhật, cần giữ email lúc chơi để phục vụ kiểm toán/tra cứu lịch sử.

### Admin

- Admin đăng nhập bằng Google qua Supabase Auth; quyền nội bộ được cấp độc lập trong bảng `admin_roles`, không dựa riêng vào việc tài khoản đã đăng nhập Google.
- Chỉ có một role nội bộ là `admin` (`admin_roles.role` chỉ cho phép `'admin'`): tra cứu người chơi theo email, ghi nhận trao quà, CRUD trong phạm vi quản trị, theo dõi dashboard, xem thông tin người dùng và xuất báo cáo. Quy tắc kiểm tra: [docs/admin-auth.md](docs/admin-auth.md).
- Admin không được sửa/xóa câu trả lời đã chốt hay điểm tính từ câu trả lời. Việc ghi nhận đã trao quà phải kiểm tra điều kiện, thực hiện nguyên tử, chỉ một lần và được audit (người thao tác, thời điểm).
- Admin CRUD dữ liệu người dùng phải tuân thủ quy tắc bất biến: không sửa câu trả lời đã chốt hoặc điểm tính từ câu trả lời; muốn xử lý sai sót phải dùng quy trình điều chỉnh có lý do, lưu giá trị trước/sau và người thao tác. Không xóa vật lý dữ liệu lượt/câu trả lời đã hoàn thành; dùng soft delete/anonymize theo chính sách lưu trữ.
- Thao tác admin như sửa câu hỏi cho phiên bản tương lai, cập nhật playlist, khóa tài khoản, ẩn/khôi phục hồ sơ, điều chỉnh trạng thái trao quà và xuất dữ liệu đều được ghi vào audit log.

## 15. Resume và đồng bộ

- Supabase lưu trạng thái lượt sau mỗi câu trả lời được chốt. Không chờ đến cuối game mới ghi.
- API/RPC trả `nextQuestionIndex`, `correctCount`, `answeredCount`, `mascotStage` (mỗi 2 câu đã trả lời tiến một stage), `status`, và `chiselEventId` chỉ khi câu vừa lưu làm `answeredCount` chạm số chẵn. Client chỉ chạy animation ở mốc đó khi nhận event ID mới; retry cùng idempotency key không tạo event hoặc animation trùng.
- Khi mất mạng trước khi Supabase xác nhận: giữ câu chọn trong bộ nhớ/local storage có thời hạn và gửi lại cùng `idempotencyKey`; UI ghi rõ “Chưa đồng bộ”. Không tuyên bố câu đã được tính cho tới khi nhận xác nhận.
- Khi mất mạng sau khi Supabase đã ghi nhưng phản hồi thất lạc: retry cùng key; Supabase tra lại answer đã ghi và không cộng điểm lần hai.
- Nếu mở đồng thời nhiều tab: chỉ một câu trả lời cho một `questionId` được chấp nhận; tab còn lại refresh trạng thái và báo đã được ghi nhận.
- Nếu client đang ở câu cũ do tab khác gửi: trả lỗi xung đột có trạng thái mới nhất, không mất tiến trình.
- Local storage chỉ dùng hỗ trợ khôi phục UI, không phải nguồn dữ liệu chính và không chứa OAuth token.

## 16. Logic quà và tra cứu của admin

### Tra cứu

- Tìm kiếm chính xác hoặc một phần email đã chuẩn hóa; kết quả tối thiểu gồm email, trạng thái lượt, số đúng/12, hoàn thành lúc, đủ điều kiện, đã nhận quà.
- Chỉ admin mới xem thông tin/câu trả lời chi tiết.
- Có trạng thái không tìm thấy, đang chơi, chưa đủ điều kiện, đủ điều kiện chưa nhận, đã nhận.

### Ghi nhận trao quà

- CTA “Đánh dấu đã nhận quà” chỉ bật nếu đủ điều kiện và chưa nhận.
- Có xác nhận thao tác rõ ràng; RPC/Edge Function kiểm tra lại điều kiện và trạng thái tại thời điểm ghi.
- Ghi `rewardClaimedAt`, `rewardClaimedBy`, và audit event. Retry phải idempotent; nếu đã nhận, trả trạng thái hiện hành, không tạo lần trao thứ hai.
- Nếu trao quà thực tế nhưng hệ thống lỗi, admin cần quy trình đối soát; không cho phép tự sửa lịch sử không dấu vết.

## 16A. Dashboard admin và CRUD

### Dashboard

- Thẻ tổng quan: tổng người dùng, lượt đang chơi, lượt hoàn thành, tỷ lệ resume, điểm trung bình, số đủ điều kiện nhận quà, chưa nhận và đã nhận.
- Biểu đồ/đếm theo thời gian: bắt đầu lượt, hoàn thành lượt, phân bố điểm, lỗi lưu/xác thực nếu có telemetry.
- Bảng hoạt động gần đây và cảnh báo vận hành; hỗ trợ lọc theo khoảng ngày, trạng thái session, điểm và trạng thái quà.
- Tìm người dùng theo email; xem hồ sơ cơ bản, thời gian tạo lượt/hoạt động gần nhất, tiến độ câu hỏi, điểm, câu trả lời và trạng thái quà.

### Phạm vi CRUD admin

| Đối tượng | Tạo | Đọc | Cập nhật | Xóa |
|---|---|---|---|---|
| Người dùng/hồ sơ | Tạo bản ghi quản trị khi cần | Tất cả trường được phép | Cập nhật metadata, khóa/khôi phục, ẩn danh hóa theo chính sách | Soft delete/ẩn danh hóa; không xóa vật lý lịch sử chơi |
| Câu hỏi và bộ câu hỏi | Tạo phiên bản mới | Xem nội dung/phiên bản | Sửa bản nháp; bản đã được session sử dụng không sửa hồi tố | Ngừng kích hoạt/đánh dấu lưu trữ |
| Playlist nhạc | Thêm track metadata | Xem danh sách | Sửa tiêu đề/thứ tự/URL/active | Ngừng kích hoạt; không xóa nếu session đang tham chiếu |
| Trạng thái quà | Không áp dụng | Xem trạng thái/audit | Điều chỉnh qua thao tác có xác nhận và lý do | Không xóa audit/historic claim |
| Tài khoản admin (`admin_roles`) | Thêm tài khoản admin | Xem quyền | Đổi trạng thái | Thu hồi quyền; giữ audit |

Admin không được sửa trực tiếp `correctCount` hoặc câu trả lời để làm thay đổi kết quả. Nếu cần sửa lỗi dữ liệu, dùng chức năng điều chỉnh đặc biệt có lý do bắt buộc, ghi giá trị trước/sau và tạo audit event.

### Xuất báo cáo

- Cho phép xuất CSV UTF-8 tối thiểu; trường có thể chọn: email, mã người chơi/session, ngày bắt đầu/hoàn thành, số câu đã trả lời, điểm, danh hiệu, đủ điều kiện, trạng thái quà, thời điểm/người trao.
- Cho phép lọc trước khi xuất theo ngày, điểm, trạng thái lượt và trạng thái quà.
- Câu trả lời chi tiết chỉ đưa vào báo cáo khi admin chọn rõ và được cấp quyền; mặc định không xuất để giảm lộ dữ liệu.
- Ghi audit log cho lần xuất: admin, thời điểm, bộ lọc, loại trường và số dòng; không ghi file nội dung nhạy cảm vào log.
- Chỉ role admin được xuất; file tải xuống cần được xử lý như dữ liệu cá nhân và không tự động chia sẻ công khai.

## 17. Data model (các bảng PostgreSQL)

### `Player`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `playerId` | UUID | ID nội bộ |
| `googleSub` | string | Unique, định danh Google ổn định |
| `emailNormalized` | string | Unique theo quy tắc một email/một lượt |
| `emailAtPlay` | string | Email snapshot lúc tạo lượt |
| `displayName` | string? | Tùy chọn, chỉ lấy nếu cần |
| `createdAt`, `updatedAt` | datetime | UTC |

### `GameSession`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `sessionId` | UUID | ID lượt |
| `playerId` | UUID | Unique cho lượt game hiện tại |
| `status` | enum | `IN_PROGRESS`, `COMPLETED` |
| `questionSetVersion` | string | Phiên bản 12 câu |
| `startedAt`, `completedAt` | datetime? | UTC |
| `answeredCount` | integer | 0–12 |
| `correctCount` | integer | 0–12 |
| `mascotStage` | enum/giá trị suy ra | `RAW`, `CARVED_1`–`CARVED_5`, `FINISHED`; bằng số mốc 2 câu đã đạt, suy ra từ `answeredCount`, không phải `correctCount` |
| `qualificationStatus` | enum/bool | Chỉ đủ điều kiện khi hoàn thành 12 câu và `correctCount == 10` |
| `rewardClaimed` | boolean | Mặc định false |
| `rewardClaimedAt` | datetime? | UTC |
| `rewardClaimedBy` | string? | ID admin (`auth.uid`) |
| `rowVersion` | integer | Optimistic concurrency |

### `Answer`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `answerId` | UUID | ID bản ghi |
| `sessionId` | UUID | FK |
| `questionId` | string | ID ổn định |
| `questionIndex` | integer | 1–12 |
| `selectedOptionId` | string | Không lưu nội dung do client tự khai |
| `isCorrect` | boolean | Do RPC/Edge Function tin cậy tính |
| `answeredAt` | datetime | UTC |
| `idempotencyKey` | string | Unique theo lượt |

Ràng buộc nghiệp vụ: chỉ một answer cho mỗi cặp (`sessionId`, `questionId`); không cho người chơi sửa/xóa answer qua các RPC dành cho người chơi.

### `QuestionVersion`

`questionSetVersion`, `questionId`, `index`, `prompt`, `options[]`, `correctOptionId`, `explanation`, `active`. Đáp án đúng không cần gửi xuống client trước khi trả lời; RPC/Edge Function chấm điểm.

### `AuditLog`

`auditId`, `actorId`, `action`, `sessionId`, `before`, `after`, `createdAt`, `requestId`, `metadata`. Áp dụng tối thiểu cho ghi nhận quà và thay đổi quản trị.

### `AdminRole`

`userId | email_normalized | role | active | granted_by | granted_at | revoked_at`. Role mặc định `player`; `role` chỉ cho phép giá trị `'admin'`, danh sách admin được quản trị nội bộ và không thể tự cấp từ frontend.

## 18. Supabase/PostgreSQL schema

Supabase PostgreSQL là nguồn dữ liệu chính. Tạo bảng quan hệ cho `players`, `game_sessions`, `answers`, `question_sets/questions`, `music_playlist`, `admin_roles`, `audit_logs`. Bật RLS và không lưu token OAuth hoặc secret trong bảng.

### Bảng `players`

`id (auth.uid FK) | email_normalized | email_at_play | display_name | first_seen_at | last_seen_at`

### Bảng `game_sessions`

`id | player_id | status | question_set_version | started_at | completed_at | answered_count | correct_count | mascot_stage | qualified_for_reward | reward_claimed | reward_claimed_at | reward_claimed_by | row_version`

### Bảng `answers`

`id | session_id | question_id | question_index | selected_option_id | is_correct | answered_at | idempotency_key`

### Bảng `audit_logs`

`id | actor_id | actor_email | action | target_type | target_id | before_json | after_json | created_at | request_id`

### Bảng `admin_roles`

`user_id (auth.uid) | email_normalized | role | active | granted_by | granted_at | revoked_at`

### Bảng `music_playlist`

`id | title | asset_url | duration_seconds | active | display_order`

- Dùng foreign key đến `auth.users` cho player/actor và unique constraint cho `player_id` trong `game_sessions`, (`session_id`, `question_id`) trong `answers`, cùng idempotency keys.
- Bật RLS cho mọi bảng; chỉ expose view/RPC tối thiểu cần thiết. Câu trả lời đúng không được đọc trực tiếp cho đến khi câu đã chốt.

## 19. API/RPC Supabase

Frontend được host riêng và gọi Supabase Auth/Database SDK. Những thao tác cần bảo vệ dùng RPC PostgreSQL hoặc Edge Functions; không cho client thay điểm hoặc sửa answers trực tiếp.

| Hàm | Mục đích | Ghi chú |
|---|---|---|
| `get_current_session()` | Lấy trạng thái lượt hiện có | Trả `NONE`, `IN_PROGRESS` hoặc `COMPLETED` |
| `start_session()` | Tạo lượt | Chỉ nếu chưa có; dùng khóa và kiểm tra trùng theo định danh |
| `get_session_state(session_id)` | Lấy trạng thái/resume | Không trả đáp án đúng cho câu chưa trả lời |
| `submit_answer(session_id, question_id, option_id, idempotency_key)` | Gửi câu trả lời | RPC/Edge Function chấm điểm và ghi PostgreSQL trong transaction |
| `get_result(session_id)` | Lấy kết quả cuối | Chỉ trả kết quả của người chơi đang xác thực |
| `admin_search_players(email)` | Tìm người chơi theo email | Admin only |
| `admin_claim_reward(session_id, request_id)` | Ghi nhận đã trao | Admin only; RPC/Edge Function kiểm tra eligibility; nguyên tử, chỉ một lần; audit actor/thời điểm + idempotency |
| `admin_get_dashboard(filters)` | Lấy KPI và tổng hợp tiến độ | Admin only |
| `admin_search_users(filters)` | Tìm/lọc người dùng và session | Admin only; phân trang |
| `admin_get_user_detail(user_id)` | Xem hồ sơ, tiến độ, answers và lịch sử quà | Admin only; audit read nếu chính sách yêu cầu |
| `admin_update_user(user_id, patch, reason)` | CRUD/khóa/ẩn danh hóa hồ sơ | Admin only; allowlist field, audit before/after |
| `admin_manage_questions(action, payload)` | Quản lý bản nháp/phiên bản câu hỏi | Admin only; không sửa hồi tố phiên bản đang dùng |
| `admin_manage_playlist(action, payload)` | Thêm/sửa/ngừng track | Admin only |
| `admin_export_report(filters, fields)` | Tạo CSV theo bộ lọc | Admin only; audit lần xuất |

Mọi RPC/Edge Function trả object kết quả có `ok`, `code`, `message`, `data` với mã ổn định: `UNAUTHENTICATED`, `FORBIDDEN`, `SESSION_ALREADY_EXISTS`, `SESSION_COMPLETED`, `QUESTION_OUT_OF_ORDER`, `QUESTION_ALREADY_ANSWERED`, `INVALID_OPTION`, `CONFLICT`, `RATE_LIMITED`, `DATABASE_UNAVAILABLE` (bảng đầy đủ: `docs/rpc-error-codes.md`). Không trả đáp án đúng hàng loạt trước khi người dùng trả lời.

## 20. Analytics/events

Chỉ ghi dữ liệu tối thiểu cần thiết; không gửi token Google, nội dung nhận dạng nhạy cảm hoặc đáp án đúng lên nền tảng analytics bên thứ ba.

| Event | Thời điểm | Thuộc tính gợi ý |
|---|---|---|
| `landing_viewed` | Mở landing | `campaign_id`, `device_class` |
| `google_signin_started` | Bắt đầu đăng nhập | `provider` |
| `google_signin_succeeded/failed` | Kết quả đăng nhập | `error_code` nếu lỗi |
| `game_started` | Tạo lượt mới thành công | `session_id` giả danh, `question_set_version` |
| `game_resumed` | Tải lại lượt dở | `answered_count`, `device_class` |
| `answer_submitted` | Supabase xác nhận câu trả lời đã ghi | `question_index`, `is_correct`, `latency_ms` |
| `chiseling_animation_played` | Sau mỗi mốc 2 câu đã lưu | `answered_count`, `answer_id`, `stage`, `event_id` |
| `mascot_milestone_reached` | Đạt mốc 2/4/6/8/10/12 câu đã trả lời | `answered_count`, `stage` |
| `game_completed` | Trả lời câu 12 | `score`, `qualified` |
| `reward_claimed` | Admin ghi nhận | Chỉ analytics nội bộ, `actor_role`; không gửi email |
| `admin_user_updated` | Admin cập nhật/khóa/ẩn danh hóa hồ sơ | `actor_id`, `target_id`, `action`; audit nội bộ |
| `admin_report_exported` | Admin xuất CSV | `actor_id`, `filters`, `field_set`, `row_count` |
| `sync_failed/succeeded` | Đồng bộ lỗi/khôi phục | `retry_count`, `error_code` |
| `sound_toggled` | Bật/tắt âm | `enabled` |

## 21. Non-functional requirements

- **Responsive:** thao tác đầy đủ trên màn hình nhỏ; nội dung không tràn ngang.
- **Hiệu năng:** tải màn gameplay nhanh trên kết nối di động phổ thông; tải asset theo nhu cầu; tối ưu ảnh/âm thanh và cache bản tĩnh.
- **Độ tin cậy:** ghi câu trả lời idempotent; không mất tiến trình đã xác nhận; cấu hình backup/khôi phục Supabase phù hợp gói sử dụng.
- **Bảo mật:** Supabase Auth + RLS; kiểm tra role admin; không đưa `service_role` key vào frontend; validate input; giới hạn tần suất; log không chứa token.
- **Quyền riêng tư:** thông báo rõ việc thu email và mục đích dùng cho lưu lượt/đối soát quà; xác định thời hạn lưu, đầu mối yêu cầu xóa và cơ sở xử lý theo chính sách tổ chức/quy định áp dụng trước khi phát hành.
- **Khả năng truy cập:** tương phản đạt mức phù hợp, focus rõ, thao tác bàn phím cơ bản, nhãn screen reader, reduced motion, không phụ thuộc màu/âm thanh.
- **Khả năng tương thích:** phiên bản mới của Chrome/Safari/Edge trên iOS/Android/desktop; kiểm tra luồng OAuth redirect trên trình duyệt di động.
- **Quan sát vận hành:** log lỗi có correlation ID; cảnh báo lỗi auth/lưu dữ liệu tăng cao; theo dõi log Supabase, cơ sở dữ liệu và Edge Functions.

## 22. Edge cases và xử lý

| Tình huống | Xử lý mong muốn |
|---|---|
| Google Sign-In bị hủy | Trở lại landing, không tạo lượt |
| Email không có/không xác thực | Không cho bắt đầu; hướng dẫn chọn tài khoản Google có email xác thực |
| Bấm “Bắt đầu” nhiều lần hoặc hai tab cùng lúc | Chỉ tạo một session; tab kia tải session hiện có |
| Câu trả lời gửi lặp do retry | Trả kết quả cũ theo idempotency key, không tăng điểm lần hai |
| Gửi câu sai thứ tự | Từ chối, trả trạng thái mới nhất từ Supabase |
| Mất mạng trước khi lưu | Giữ lựa chọn tạm, báo chưa đồng bộ, retry; không tự chuyển câu |
| Mất mạng sau khi lưu | Khi kết nối lại tải trạng thái từ Supabase, không ghi trùng |
| Reload giữa animation | Khôi phục stage; không phát lại các mốc cũ |
| Tắt tab ngay sau khi chọn | Nếu Supabase đã xác nhận thì resume câu kế; nếu chưa, retry cùng key hoặc cho người chơi xử lý theo phản hồi |
| Hai admin cùng đánh dấu quà | Chỉ một thao tác thành công; thao tác kia nhận trạng thái đã nhận |
| Người chơi có đúng 10 câu nhưng chưa trả lời đủ 12 | Chưa hoàn thành, chưa có kết quả cuối và chưa đủ điều kiện quà |
| Hoàn thành với 9/12 câu đúng | Hiện lời cảm ơn; không có danh hiệu, không đủ điều kiện |
| Hoàn thành với 11/12 hoặc 12/12 câu đúng | Hiện lời cảm ơn theo rule “chính xác 10/12”; không có danh hiệu, không đủ điều kiện |
| Supabase/database tạm lỗi hoặc quota/hạn mức hết | Supabase không xác nhận giao dịch thành công; UI giữ trạng thái chưa đồng bộ để retry an toàn; admin được cảnh báo |
| Bộ câu hỏi cập nhật giữa lượt | Tiếp tục dùng `questionSetVersion` đã gắn cho session |
| Đăng nhập bằng email khác | Tạo/tiếp tục lượt riêng cho định danh đó; không cho tự chuyển điểm giữa tài khoản |
| Đổi email cùng Google account | Nhận diện theo Supabase `auth.uid`; cập nhật email hiện tại và giữ snapshot lịch sử |

## 23. Acceptance criteria

### Xác thực và lượt duy nhất

- [ ] Người chưa đăng nhập không thể bắt đầu game.
- [ ] Không có luồng nhập email thủ công.
- [ ] Google OAuth qua Supabase Auth tạo session; client không thể giả mạo user ID/email để tạo session.
- [ ] Bắt đầu đồng thời từ nhiều tab vẫn chỉ có một lượt cho cùng định danh.
- [ ] Lượt đang dở được mở lại ở câu chưa trả lời đầu tiên với đúng điểm và mascot.
- [ ] Lượt hoàn thành hiển thị lại kết quả, không có nút chơi lại.

### Câu hỏi và mascot

- [ ] Game có đúng 12 câu; mỗi câu chỉ chấp nhận một đáp án.
- [ ] Câu đúng tăng điểm đúng một lần; câu sai không tăng điểm và hiển thị đáp án đúng cùng giải thích.
- [ ] Mỗi 2 câu trả lời được lưu (đúng hoặc sai) chạy đúng một animation tạc và chuyển mascot sang một hình thái; retry cùng ID không phát/lưu trùng.
- [ ] Mascot stage dựa trên `answeredCount`: các mốc 2/4/6/8/10/12 lần lượt chuyển đúng một hình thái; các câu lẻ không kích hoạt animation tạc.
- [ ] Câu đã trả lời thứ 12 hoàn tất hình thái cuối; danh hiệu chưa được quyết định cho tới khi hoàn thành câu 12 và xác nhận điểm.
- [ ] Chỉ kết quả hoàn thành chính xác 10/12 nhận “Mầm Nghề” và đủ điều kiện quà; 0–9/12 và 11–12/12 nhận lời cảm ơn, không có danh hiệu và không đủ điều kiện.
- [ ] Resume không làm lặp hiệu ứng cũ hoặc lùi mascot.

### Resume và lưu trữ

- [ ] Mỗi đáp án được Supabase lưu vào PostgreSQL trước khi chuyển sang câu tiếp theo.
- [ ] Retry cùng idempotency key không tạo answer/điểm trùng.
- [ ] Mất mạng thể hiện rõ trạng thái chưa đồng bộ; UI không khẳng định câu đã được lưu trước khi Supabase xác nhận.
- [ ] Có thể tra cứu đối chiếu session và từng answer theo ID ổn định.

### Admin và quà

- [ ] Tài khoản không phải admin không thể tra cứu/đánh dấu quà theo chính sách phân quyền.
- [ ] Không thể đánh dấu quà cho người chưa hoàn thành hoặc có số câu đúng khác chính xác 10.
- [ ] Đánh dấu quà thành công lưu thời điểm, người thao tác và audit log.
- [ ] Gửi thao tác hai lần hoặc từ hai admin không tạo hai lần nhận.

### Admin

- [ ] Tài khoản thường không có quyền truy cập chức năng admin.
- [ ] Dashboard hiển thị đúng số liệu theo dữ liệu session/answers/quà và có bộ lọc cơ bản.
- [ ] Admin tìm được người dùng, xem tiến độ và thông tin cần thiết.
- [ ] Admin có thể CRUD các đối tượng được phép; không thể sửa trực tiếp điểm hoặc answer đã chốt.
- [ ] Mọi thay đổi, thao tác điều chỉnh đặc biệt và lần xuất báo cáo đều được audit log.
- [ ] CSV chỉ xuất trường được chọn, lọc đúng kết quả và không công khai tự động.

### UX, âm thanh và tương thích

- [ ] Gameplay dùng được trên màn hình điện thoại nhỏ mà không cuộn ngang.
- [ ] Đáp án sau khi chọn bị khóa; giải thích đủ thời gian đọc trước khi sang câu.
- [ ] Có nhạc nền và sound effects theo sự kiện; người chơi đổi track được từ playlist cấu hình sẵn.
- [ ] Track hiện tại và điều khiển riêng nhạc/hiệu ứng được nhớ trên thiết bị.
- [ ] Nhạc nền loop mượt, âm lượng vừa phải, không lấn át nội dung hoặc hiệu ứng.
- [ ] Game vẫn đầy đủ ý nghĩa khi âm thanh tắt hoặc reduced motion bật.
- [ ] Các trạng thái loading, lỗi mạng, lỗi đăng nhập, không đủ điều kiện và đã nhận quà đều có thông điệp rõ.

## 24. Asset checklist

Danh sách nhóm asset đã chốt; không bao gồm trang trí tiền cảnh hoặc ảnh showcase sản phẩm.

| # | Asset | Ghi chú |
|---:|---|---|
| 1 | Mascot — khối đá nguyên bản (`RAW`) | `answeredCount` 0–1 |
| 2 | Mascot — hình thái tạc 1 (`CARVED_1`) | `answeredCount` 2–3 |
| 3 | Mascot — hình thái tạc 2 (`CARVED_2`) | `answeredCount` 4–5 |
| 4 | Mascot — hình thái tạc 3 (`CARVED_3`) | `answeredCount` 6–7 |
| 5 | Mascot — hình thái tạc 4 (`CARVED_4`) | `answeredCount` 8–9 |
| 6 | Mascot — hình thái tạc 5 (`CARVED_5`) | `answeredCount` 10–11 |
| 7 | Mascot — hoàn thiện (`FINISHED`) | `answeredCount` = 12 |
| 8 | Búa | Lớp animation đục |
| 9 | Đục | Lớp animation đục |
| 10 | Các biến thể mảnh đá vụn | 5 biến thể gợi ý |
| 11 | Các biến thể vết nứt | 4 biến thể gợi ý |
| 12 | Bụi đá nhỏ | Dùng ở animation tạc các mốc 2 và 4 |
| 13 | Bụi đá vừa | Dùng ở animation tạc các mốc 6 và 8 |
| 14 | Bụi đá lớn | Dùng ở animation tạc các mốc 10 và 12 |
| 15 | Hiệu ứng lấp lánh | Reveal thành phẩm; badge “Mầm Nghề” chỉ hiện ở kết quả 10/12 |
| 16 | Shine overlay/ánh sáng quét | Hoàn thiện nhẹ ở mốc 12 |
| 17 | Huy hiệu “Mầm Nghề” | Chỉ hiện khi hoàn thành và đúng chính xác 10/12 |
| 18 | Bệ đá | Dùng xuyên suốt gameplay |
| 19 | Background | Tối ưu crop cho portrait và landscape |
| 20+ | Các track playlist nhạc nền | Do chủ sản phẩm cung cấp/duyệt, có metadata và quyền sử dụng |

Cần bàn giao tên file nhất quán, kích thước/định dạng, nguồn gốc và quyền sử dụng; layer trong suốt, anchor/pivot, màu nền tương phản tốt, bản nhẹ cho mobile. Âm thanh cần playlist track nhạc nền loop mượt do chủ sản phẩm duyệt, kèm tên hiển thị/metadata và các file SFX riêng theo sự kiện; nén phù hợp web, nghe kiểm tra trên loa điện thoại/tai nghe và xác nhận quyền sử dụng cho từng track.

## 25. Implementation notes (Supabase)

- Host frontend tĩnh/SPA trên Vercel, Cloudflare Pages hoặc dịch vụ tương đương; Supabase Auth/PostgreSQL là dịch vụ backend được quản lý.
- Tạo môi trường staging và production; cấu hình Google OAuth Client, callback Supabase, Site URL và allowlist redirect URLs cho domain thật và môi trường preview.
- Frontend chỉ chứa Supabase URL và publishable/anon key. Không bao giờ đưa `service_role` key vào trình duyệt.
- Bật RLS cho tất cả bảng. Player chỉ đọc/ghi dữ liệu thuộc lượt của mình; mọi chấm điểm, submit answer, hoàn tất session, claim reward và thao tác admin nhạy cảm chỉ qua RPC/Edge Function có xác minh `auth.uid` và role.
- Tạo unique constraints: một session cho mỗi `player_id`, một answer cho mỗi (`session_id`, `question_id`), và idempotency key duy nhất cho mỗi thao tác ghi.
- Lưu role trong bảng `admin_roles` có chính sách RLS nghiêm ngặt; không cho người dùng tự cấp role. Tài khoản admin ban đầu được cấp thủ công bằng migration/SQL an toàn.
- Xây dashboard admin trên frontend dùng RPC/Edge Functions phân trang cho bảng lớn; không tải toàn bộ dữ liệu vào trình duyệt. Xuất CSV chỉ từ view/endpoint admin đã kiểm tra quyền, audit người xuất và bộ lọc.
- Không cho admin sửa trực tiếp answers/điểm; dùng phiên bản câu hỏi mới cho lượt tương lai, và quy trình điều chỉnh có lý do/audit cho sửa dữ liệu đặc biệt.
- Playlist lưu metadata trong `music_playlist`; trình duyệt tải file từ storage/static host/CDN trực tiếp. Nếu dùng Supabase Storage, cấu hình bucket/public access có chủ đích, định dạng và quyền sử dụng rõ.
- Dùng migration có kiểm soát cho schema/RLS; kiểm tra chính sách bằng tài khoản player và admin riêng trước khi deploy.
- Theo dõi usage, logs, backup/restore; kiểm thử tải dự kiến khoảng 30 người đồng thời trên staging. Kiểm tra retry và nhiều thao tác đồng thời trên cùng một session.
- Trước phát hành: kiểm tra Google OAuth redirect, policy RLS, giới hạn một lượt/email, resume, xử lý câu trả lời trùng, trao quà một lần, quyền dashboard/export, domain HTTPS, playlist và quy trình bảo vệ dữ liệu cá nhân.

---

**Kết thúc tài liệu — PRD v1.3, bản review nghiệp vụ.**
