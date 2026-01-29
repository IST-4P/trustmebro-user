# HTTPS Setup cho Next.js Dev Server

## Cách sử dụng

### Chạy với HTTPS:
```bash
npm run dev:https
```

Server sẽ chạy tại: **https://localhost:3000**

### Lần đầu tiên chạy:

1. **Nếu có OpenSSL**: Server sẽ tự động tạo self-signed certificate
2. **Nếu không có OpenSSL**: Bạn cần tạo certificate thủ công:

#### Option 1: Dùng mkcert (Khuyến nghị)
```bash
# Cài đặt mkcert
# Windows: choco install mkcert
# macOS: brew install mkcert
# Linux: xem https://github.com/FiloSottile/mkcert

# Tạo và cài đặt CA
mkcert -install

# Tạo certificate cho localhost
mkcert localhost

# Đổi tên files
mv localhost-key.pem localhost-key.pem
mv localhost.pem localhost-cert.pem
```

#### Option 2: Dùng OpenSSL
```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout localhost-key.pem -out localhost-cert.pem -days 365 -subj "/CN=localhost"
```

### Lưu ý:

- **Browser sẽ hiển thị cảnh báo bảo mật** vì đây là self-signed certificate
- Click **"Advanced"** → **"Proceed to localhost"** để tiếp tục
- Cookies với `Secure` flag sẽ hoạt động với HTTPS
- Cookies với `SameSite=None` sẽ hoạt động cho cross-site requests

### Chạy với HTTP (không HTTPS):
```bash
npm run dev
```

Server sẽ chạy tại: **http://localhost:3000**

---

## Tại sao cần HTTPS?

Backend đang gửi cookies với:
- `Secure=true` - chỉ hoạt động với HTTPS
- `SameSite=None` - cần `Secure=true`

Khi chạy HTTP, browser sẽ **từ chối** cookies này. Với HTTPS, cookies sẽ được accept và persist sau khi reload.
