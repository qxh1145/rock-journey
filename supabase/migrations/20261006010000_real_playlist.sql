-- Danh sách phát thật: 2 bài nhạc nền mặc định + các bài chọn thêm (thay 3 bài mẫu không có file).
-- asset_url = encodeURI('/audio/music/<tên file>') — phải khớp đúng URL player dùng (DEFAULT_QUEUE, FINALE_SONG trong web/src/audio.ts)
delete from public.music_playlist;
insert into public.music_playlist (title, asset_url, display_order) values
('Evil''s Soft First Touches',          '/audio/music/Evil''s%20Soft%20First%20Touches.mp3', 1),
('Fate Calls',                          '/audio/music/Fate%C2%A0Calls.mp3', 2),
('VSTRA - So Bad',                      '/audio/music/VSTRA%20-%20So%20Bad.mp3', 3),
('Lọ Lem Hè Phố',                       '/audio/music/L%E1%BB%8C%20LEM%20H%C3%88%20PH%E1%BB%90%20-%20jimmi%20ng%E1%BB%A7%20y%C3%AAn%20x%20michael%20h%C6%B0%20%C4%91%E1%BB%91n%20x%20don%20hoe%20x%20nicki%20minu%20x%20nicolai%20fbi%20t%C3%ACnh%20iu%20n%C3%A8.mp3', 4),
('Billie Eilish - L’AMOUR DE MA VIE',   '/audio/music/Billie%20Eilish%20-%20L%E2%80%99AMOUR%20DE%20MA%20VIE%20(Official%20Lyric%20Video).mp3', 5);
