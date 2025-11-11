# Tính năng Tìm Rạp Chiếu Phim Gần Nhất (AI-Powered)

## 📍 Mô tả
Tính năng cho phép người dùng tìm các rạp chiếu phim gần nhất dựa trên vị trí hiện tại, kết hợp với AI (Gemini) để đưa ra gợi ý và phân tích.

## 🚀 Cách sử dụng

1. **Mở app và đăng nhập** với tài khoản User
2. **Vào tab Home** (UserHomeScreen)
3. **Nhấn nút "🎬 Tìm Rạp Chiếu Phim Gần Nhất (AI)"**
4. **Cho phép truy cập vị trí** khi app yêu cầu
5. **Đợi AI phân tích** (khoảng 3-5 giây)
6. **Xem kết quả:**
   - Gợi ý từ AI về rạp tốt nhất
   - Danh sách rạp gần nhất
   - Nhấn vào card rạp để mở Google Maps chỉ đường

## 🛠️ Công nghệ sử dụng

### 1. **Gemini AI (Google Generative AI)**
- API: `gemini-1.5-flash`
- Chức năng: Phân tích và đề xuất rạp phù hợp nhất
- Prompt engineering: Yêu cầu AI sắp xếp theo độ gần và đưa ra lời khuyên di chuyển

### 2. **OpenStreetMap Nominatim**
- Tìm kiếm địa điểm miễn phí
- Không cần API key
- Giới hạn: ~3-5km bán kính tìm kiếm

### 3. **Expo Location**
- Lấy vị trí GPS hiện tại
- Độ chính xác: Balanced (vừa phải)
- Yêu cầu quyền truy cập: Foreground permissions

### 4. **React Native Linking**
- Mở Google Maps với tọa độ
- Deep linking cho navigation

## 📁 Cấu trúc Code

```
src/
├── services/
│   └── geminiService.js          # Service gọi Gemini AI + OpenStreetMap
├── screens/
│   └── userScreens/
│       └── UserHomeScreen.js     # UI tìm rạp
└── styles/
    └── commonStyles.js           # Theme màu pastel

.env                              # API Key (không commit lên git)
app.json                          # Config Gemini API key
```

## 🔑 API Key Setup

### Cách 1: Sử dụng file .env (Khuyến nghị)
```env
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyAQTNX-2wlKmUMAFCbQBnssfLZM90HhjvA
```

### Cách 2: Config trong app.json
```json
{
  "expo": {
    "extra": {
      "GEMINI_API_KEY": "AIzaSyAQTNX-2wlKmUMAFCbQBnssfLZM90HhjvA"
    }
  }
}
```

### Cách 3: Hardcode trong geminiService.js (Fallback)
```javascript
const API_KEY = "AIzaSyAQTNX-2wlKmUMAFCbQBnssfLZM90HhjvA";
```

## 🎯 Flow hoạt động

```
[User nhấn nút Tìm Rạp]
         ↓
[Yêu cầu quyền truy cập Location]
         ↓
[Lấy GPS hiện tại: lat, lng]
         ↓
[Gọi OpenStreetMap → Tìm 10 rạp trong 5km]
         ↓
[Gọi Gemini AI → Phân tích + Gợi ý 3 rạp tốt nhất]
         ↓
[Hiển thị kết quả: AI Suggestion + Danh sách rạp]
         ↓
[User nhấn card → Mở Google Maps chỉ đường]
```

## 🎨 UI Features

- **Loading State**: Spinner + "Đang tìm rạp gần bạn..."
- **AI Suggestion Box**: Màu xanh pastel (#E3F2FD) với border trái màu primary
- **Cinema Cards**: 
  - Số thứ tự lớn màu primary
  - Tên rạp (bold)
  - Địa chỉ đầy đủ
  - Tọa độ chính xác
  - Icon bản đồ 🗺️
  - Shadow effect nhẹ
- **Responsive**: ScrollView để xem nhiều kết quả
- **Interactive**: Tap card → Open Google Maps

## 🔒 Bảo mật

- ✅ API key đã thêm vào `.gitignore`
- ✅ Không commit `.env` lên Git
- ⚠️ Key trong `app.json` vẫn public (nên dùng .env trong production)
- 🔐 Nên sử dụng backend proxy cho API key trong production

## 🐛 Xử lý lỗi

| Tình huống | Xử lý |
|------------|-------|
| Không cấp quyền Location | Alert "Cần cấp quyền..." |
| Không tìm thấy rạp | Alert "Không tìm thấy rạp..." |
| API Gemini lỗi | Alert "Không thể tìm rạp..." + Log console |
| Không mở được Maps | Alert "Không thể mở bản đồ" |

## 📊 Giới hạn

- **OpenStreetMap**: Rate limit ~1 request/second (dùng cho demo)
- **Gemini API**: Free tier có quota limit
- **Location**: Cần device có GPS
- **Internet**: Yêu cầu kết nối mạng

## 🧪 Test Cases

1. ✅ User nhấn nút → Yêu cầu quyền location
2. ✅ Có GPS → Hiển thị loading
3. ✅ Tìm thấy rạp → Hiển thị AI suggestion + danh sách
4. ✅ Nhấn card → Mở Google Maps
5. ✅ Không có rạp → Hiển thị alert thông báo
6. ✅ Lỗi API → Hiển thị alert lỗi

## 📝 Notes

- Code mẫu gốc sử dụng TypeScript, đã convert sang JavaScript
- Thêm fallback API key để dễ demo
- UI design theo theme light pastel hiện tại
- Tích hợp hoàn toàn vào UserHomeScreen (không tạo screen riêng)

## 🎓 Học được gì

- ✅ Tích hợp Gemini AI vào React Native
- ✅ Sử dụng Location API
- ✅ Gọi REST API (OpenStreetMap, Gemini)
- ✅ Prompt engineering cho AI
- ✅ Deep linking với Google Maps
- ✅ Quản lý API key an toàn
- ✅ Error handling và UX
