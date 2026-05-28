# 🎮 Ludo Master Elite

Game Cờ Cá Ngựa Online — Full Stack Python (Flask + SQLite + Socket.IO)

## Cách chạy

```bash
cd game_web
python app.py
```

Mở trình duyệt: **http://localhost:5000**

## Tính năng

- 🔐 Đăng ký / Đăng nhập (JWT)
- 🏠 Lobby — danh sách phòng, tạo phòng, tìm trận nhanh
- 💬 Global Chat realtime (Socket.IO)
- 👥 Hệ thống bạn bè — gửi/chấp nhận/từ chối lời mời
- 💌 Chat riêng tư 1-1
- 🎲 Bàn cờ 4 màu với xúc xắc animation
- 🎮 Mini-games: Làm toán, Đuổi hình bắt chữ, Đua thú, Block Blast
- 👤 Hồ sơ cá nhân — cập nhật username, avatar (lưu DB)

## Stack

| Layer    | Tech                        |
|----------|-----------------------------|
| Backend  | Python Flask + Flask-SocketIO |
| Database | SQLite (tự động tạo)        |
| Auth     | JWT (PyJWT)                 |
| Frontend | HTML + CSS + Vanilla JS     |
| Realtime | Socket.IO                   |

## Yêu cầu

```
Flask==3.0.0
Flask-SocketIO==5.3.5
Flask-CORS==4.0.0
PyJWT==2.8.0
eventlet==0.33.3
```

Cài: `pip install -r game_web/requirements.txt`
