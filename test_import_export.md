# Hướng dẫn Test Import/Export

## Các Bug đã được sửa:

### ⚠️ Bug 0: FileSystem API deprecated (BUG CHÍNH)
**Vấn đề:** 
- Expo FileSystem version 54 đã thay đổi API hoàn toàn
- `writeAsStringAsync` và `readAsStringAsync` đã deprecated
- Gây lỗi: `Method writeAsStringAsync imported from "expo-file-system" is deprecated`

**Sửa:**
```javascript
// TRƯỚC (SAI):
import * as FileSystem from "expo-file-system";

// SAU (ĐÚNG):
import * as FileSystem from "expo-file-system/legacy";
```

**Chi tiết:**
- Expo 54 giới thiệu API mới với `File` và `Directory` classes
- Để giữ code đơn giản, chúng ta sử dụng legacy API
- Legacy API vẫn được hỗ trợ đầy đủ và hoạt động tốt
- Không cần thay đổi gì khác trong code!

**Lý do:** Chỉ cần thay đổi import path là mọi thứ hoạt động lại bình thường.

### Bug 1: DocumentPicker API không đúng
**Vấn đề:** 
- Code cũ kiểm tra `result.canceled` nhưng không kiểm tra `result.assets`
- Có thể gây crash khi `result.assets` là undefined

**Sửa:**
```javascript
// Trước:
if (result.canceled) {
  setIsLoading(false);
  return;
}
const fileUri = result.assets[0].uri;

// Sau:
if (result.canceled || !result.assets || result.assets.length === 0) {
  console.log("Import canceled or no file selected");
  setIsLoading(false);
  return;
}
const fileUri = result.assets[0].uri;
```

### Bug 2: Loading state không đúng
**Vấn đề:**
- Loading vẫn hiển thị khi Alert xuất hiện
- Không set lại loading state đúng cách

**Sửa:**
- Thêm `setIsLoading(false)` trước khi hiển thị Alert
- Thêm `setIsLoading(true)` trong `performImport`

### Bug 3: Thiếu logging
**Vấn đề:**
- Khó debug khi có lỗi xảy ra
- Không biết ở bước nào bị lỗi

**Sửa:**
- Thêm console.log ở tất cả các bước quan trọng
- Log result từ DocumentPicker, file path, số lượng movies, etc.

## Cách test:

### Test Export:
1. Mở app và vào màn hình "Data Management"
2. Nhấn nút "Export All Movies"
3. Kiểm tra console log:
   - "Starting export..."
   - "Exported movies count: X"
   - "Writing file to: ..."
   - "File written successfully"
   - "Can share: true/false"
4. Nếu trên điện thoại, sẽ mở share dialog
5. Nếu trên emulator, kiểm tra thông báo

### Test Import:
1. Nhấn nút "Import from File"
2. Chọn một file JSON
3. Kiểm tra console log:
   - "DocumentPicker result: ..."
   - "Reading file from: ..."
   - "Parsed movies data: X movies"
4. Chọn "Skip Duplicates" hoặc "Overwrite"
5. Kiểm tra thông báo kết quả

### Test Template:
1. Nhấn nút "Download Template"
2. Kiểm tra console log:
   - "Creating sample template..."
   - "Writing template to: ..."
   - "Template written successfully"
3. File template sẽ được tạo với 3 phim mẫu

## Điểm cần lưu ý:

1. **Permissions**: Đảm bảo app có quyền đọc/ghi file
2. **File format**: File JSON phải đúng format với các trường:
   - title (string)
   - category (string)
   - release_year (number)
   - status (string)
   - poster_uri (string)
3. **Error handling**: Tất cả errors đều được catch và hiển thị Alert
4. **Console logs**: Kiểm tra Metro bundler console để xem logs chi tiết

## Nếu vẫn không hoạt động:

1. Kiểm tra Metro bundler console xem có lỗi gì không
2. Đảm bảo các package đã cài đúng version:
   - expo-document-picker
   - expo-file-system
   - expo-sharing
3. Reload app: nhấn 'r' trong Metro bundler
4. Clear cache: `npx expo start -c`
