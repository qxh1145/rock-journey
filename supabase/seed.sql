-- Dữ liệu mẫu cho local. Nội dung câu hỏi là bản nháp, cần chủ sản phẩm duyệt.
insert into public.question_sets (version, active) values ('v1-draft', true);

insert into public.questions (set_version, id, idx, prompt, options, correct_option_id, explanation) values
('v1-draft','q01',1,'Làng đá mỹ nghệ Non Nước nằm ở tỉnh/thành nào?',
 '[{"id":"a","text":"Đà Nẵng"},{"id":"b","text":"Ninh Bình"},{"id":"c","text":"Thanh Hóa"},{"id":"d","text":"Hà Nam"}]','a',
 'Non Nước nằm dưới chân Ngũ Hành Sơn, Đà Nẵng.'),
('v1-draft','q02',2,'Dụng cụ nào dùng để tạo hình thô khối đá?',
 '[{"id":"a","text":"Giấy nhám"},{"id":"b","text":"Búa và đục"},{"id":"c","text":"Cọ vẽ"},{"id":"d","text":"Dao khắc gỗ"}]','b',
 'Búa và đục là bộ đôi cơ bản để đẽo phá khối đá trước khi tinh chỉnh.'),
('v1-draft','q03',3,'Làng đá Ninh Vân nổi tiếng thuộc tỉnh nào?',
 '[{"id":"a","text":"Quảng Nam"},{"id":"b","text":"Ninh Bình"},{"id":"c","text":"Bình Định"},{"id":"d","text":"Hải Dương"}]','b',
 'Ninh Vân (Hoa Lư, Ninh Bình) là làng nghề chế tác đá lâu đời ở miền Bắc.'),
('v1-draft','q04',4,'Loại đá nào thường được ưa chuộng để tạc tượng nhờ vân mịn, dễ đánh bóng?',
 '[{"id":"a","text":"Đá cẩm thạch"},{"id":"b","text":"Đá ong"},{"id":"c","text":"Sỏi"},{"id":"d","text":"Đá bọt"}]','a',
 'Đá cẩm thạch có hạt mịn, giữ chi tiết tốt và lên bóng đẹp.'),
('v1-draft','q05',5,'Công đoạn cuối cùng giúp bề mặt tượng đá sáng bóng là gì?',
 '[{"id":"a","text":"Đục phá"},{"id":"b","text":"Lấy dấu"},{"id":"c","text":"Mài và đánh bóng"},{"id":"d","text":"Chọn đá"}]','c',
 'Sau khi tạc chi tiết, nghệ nhân mài nhiều cấp độ nhám rồi đánh bóng.'),
('v1-draft','q06',6,'Trước khi tạc, nghệ nhân thường làm gì trên khối đá?',
 '[{"id":"a","text":"Sơn màu"},{"id":"b","text":"Vẽ/lấy dấu phác thảo"},{"id":"c","text":"Ngâm nước muối"},{"id":"d","text":"Nung nóng"}]','b',
 'Lấy dấu giúp định tỷ lệ và bố cục trước khi đục.'),
('v1-draft','q07',7,'Vì sao nghệ nhân cần quan sát thớ/vân đá trước khi tạc?',
 '[{"id":"a","text":"Để chọn màu sơn"},{"id":"b","text":"Tránh nứt vỡ và tận dụng vân đẹp"},{"id":"c","text":"Để tính giá bán"},{"id":"d","text":"Không cần thiết"}]','b',
 'Đục ngược thớ dễ làm đá nứt; vân đá đẹp còn tăng giá trị tác phẩm.'),
('v1-draft','q08',8,'Thiết bị bảo hộ quan trọng khi tạc và mài đá là gì?',
 '[{"id":"a","text":"Khẩu trang và kính bảo hộ"},{"id":"b","text":"Áo mưa"},{"id":"c","text":"Dép lê"},{"id":"d","text":"Mũ len"}]','a',
 'Bụi đá mịn gây hại phổi và mảnh vụn có thể bắn vào mắt.'),
('v1-draft','q09',9,'Kỹ thuật chạm nổi là gì?',
 '[{"id":"a","text":"Tạc hình tách rời khỏi nền"},{"id":"b","text":"Hình khối nhô lên khỏi mặt nền"},{"id":"c","text":"Vẽ màu lên đá"},{"id":"d","text":"Ghép nhiều mảnh đá"}]','b',
 'Chạm nổi giữ nền phía sau, chỉ phần hình nhô lên.'),
('v1-draft','q10',10,'Ngũ Hành Sơn gồm bao nhiêu ngọn núi đá vôi?',
 '[{"id":"a","text":"3"},{"id":"b","text":"4"},{"id":"c","text":"5"},{"id":"d","text":"7"}]','c',
 'Năm ngọn Kim, Mộc, Thủy, Hỏa, Thổ Sơn.'),
('v1-draft','q11',11,'Tác phẩm đá thường được bảo quản tốt nhất bằng cách nào?',
 '[{"id":"a","text":"Rửa bằng axit mạnh"},{"id":"b","text":"Lau bằng khăn mềm, tránh hóa chất mạnh"},{"id":"c","text":"Phơi lửa"},{"id":"d","text":"Ngâm dầu nhớt"}]','b',
 'Hóa chất mạnh ăn mòn bề mặt và làm mất độ bóng.'),
('v1-draft','q12',12,'Ngày nay, máy móc hỗ trợ nghệ nhân chủ yếu ở công đoạn nào?',
 '[{"id":"a","text":"Cắt phá thô và mài"},{"id":"b","text":"Thay hoàn toàn nghệ nhân"},{"id":"c","text":"Đặt tên tác phẩm"},{"id":"d","text":"Không dùng máy"}]','a',
 'Máy giúp cắt, phá thô nhanh; chi tiết thần thái vẫn cần tay nghề nghệ nhân.');

-- File nhạc đặt tại web/public/audio/music/
insert into public.music_playlist (title, asset_url, duration_seconds, display_order) values
('Thanh âm làng nghề', '/audio/music/thanh-am-lang-nghe.mp3', null, 1),
('Nhịp đục đá',        '/audio/music/nhip-duc-da.mp3',        null, 2),
('Bình yên bên đá',    '/audio/music/binh-yen-ben-da.mp3',    null, 3);
