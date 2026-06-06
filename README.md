# 🍽 Dining Philosophers — Mô phỏng đa luồng

Trực quan hoá bài toán **Dining Philosophers** bằng Python Threading + Flask.

## 🚀 Chạy nhanh

```bash
# Clone repo
git clone https://github.com/your-username/dining-philosophers.git
cd dining-philosophers

# Cài thư viện
pip install -r requirements.txt

# Chạy server
python app.py
```

Mở trình duyệt: **http://localhost:5000**

## 🎮 Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| 🔢 **Resource Hierarchy** | Luôn cầm đũa số nhỏ trước → không deadlock |
| 🚦 **Semaphore** | Giới hạn tối đa n-1 triết gia đói cùng lúc |
| 💀 **Naive** | Demo deadlock thực tế (có timeout để thoát) |
| 📊 **Thống kê real-time** | Số lần ăn, thời gian chờ, thời gian suy nghĩ |
| 🎨 **Canvas animation** | Bàn tròn với triết gia và đũa động |
| 📜 **Event log** | Nhật ký sự kiện streaming qua SSE |

## 📁 Cấu trúc

```
dining-philosophers/
├── app.py              # Backend Python (Flask + threading)
├── requirements.txt
├── templates/
│   └── index.html      # Template HTML
└── static/
    ├── css/style.css   # Giao diện
    └── js/simulation.js # Canvas animation + SSE client
```

## 🧵 Kiến trúc đa luồng

- Mỗi triết gia = 1 `threading.Thread`
- Mỗi đũa = 1 `threading.Lock`
- Semaphore = `threading.Semaphore(n-1)`
- Events stream = `queue.Queue` + Flask SSE (`text/event-stream`)

## 🌐 Deploy lên GitHub

1. Fork/clone repo này
2. Push code lên GitHub
3. Deploy trên **Railway**, **Render**, hoặc **Fly.io** với:
   - Build: `pip install -r requirements.txt`
   - Start: `python app.py`
