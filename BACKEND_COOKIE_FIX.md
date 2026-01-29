# 🔧 Backend Cookie Configuration Fix

## ❌ Vấn đề hiện tại

Backend đang set cookies với cấu hình không phù hợp cho cross-site requests:

```typescript
res.cookie('accessToken', result.accessToken, {
  ...cookieOptions,
  maxAge: result.expiresIn * 1000,
});
res.cookie('refreshToken', result.refreshToken, {
  ...cookieOptions,
  maxAge: result.refreshExpiresIn * 1000,
});
```

**Vấn đề:**
- `SameSite=Lax` → Browser **reject** cookies cho cross-site requests (localhost → hacmieu.xyz)
- `HttpOnly` → JavaScript không thể đọc cookies (nhưng đây là OK cho security)
- Cookies không được lưu → User bị logout sau khi reload

## ✅ Giải pháp

### Option 1: Sửa cookieOptions (Khuyến nghị)

Cập nhật `cookieOptions` trong backend để hỗ trợ cross-site:

```typescript
const cookieOptions = {
  httpOnly: true,        // ✅ Giữ HttpOnly cho security
  secure: true,          // ✅ Required cho SameSite=None
  sameSite: 'none' as const,  // ✅ Cho phép cross-site
  path: '/',
};
```

**Lưu ý:**
- `SameSite=None` **bắt buộc** phải có `Secure=true`
- Cần HTTPS cho cả frontend và backend
- Hoặc dùng HTTPS cho localhost (xem `HTTPS_SETUP.md`)

### Option 2: Trả về token trong response body

Nếu không thể sửa cookieOptions, trả về token trong response:

```typescript
@Post('login')
async loginDirectAccessGrants(
  @Body() body: LoginRequestDto,
  @Res({ passthrough: true }) res: Response,
  @ProcessId() processId: string
) {
  const result = await this.authService.loginDirectAccessGrants({
    ...body,
    processId,
  });
  
  // Set cookies (vẫn giữ cho automatic sending)
  res.cookie('accessToken', result.accessToken, {
    ...cookieOptions,
    maxAge: result.expiresIn * 1000,
  });
  res.cookie('refreshToken', result.refreshToken, {
    ...cookieOptions,
    maxAge: result.refreshExpiresIn * 1000,
  });

  // ✅ Trả về token trong body để frontend có thể set client-side
  return {
    message: 'Message.LoginSuccessfully',
    accessToken: result.accessToken,  // ✅ Thêm này
    refreshToken: result.refreshToken, // ✅ Thêm này
    user: result.user, // Nếu có
  };
}
```

## 🔍 Kiểm tra

Sau khi sửa, kiểm tra trong browser DevTools:

1. **Network tab** → Login request → **Response Headers**:
   ```
   Set-Cookie: accessToken=...; HttpOnly; Secure; SameSite=None
   Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=None
   ```

2. **Application tab** → **Cookies** → `https://trustmebro-web.hacmieu.xyz`:
   - ✅ Cookies phải có `SameSite: None`
   - ✅ Cookies phải có `Secure: ✓`
   - ✅ Cookies phải có `HttpOnly: ✓`

3. **Console**: Không có warning về cookie rejection

## 📝 Tóm tắt

| Cấu hình | Hiện tại | Cần sửa |
|----------|----------|---------|
| `SameSite` | `Lax` | `None` |
| `Secure` | `true` | `true` (giữ nguyên) |
| `HttpOnly` | `true` | `true` (giữ nguyên) |

**Kết quả:** Cookies sẽ được browser accept và persist sau khi reload.
