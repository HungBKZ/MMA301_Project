// Dịch vụ gọi API Gemini (Google Generative AI)
// - Hàm generateText: sinh văn bản từ prompt
// - Hàm generateFromImage: mô tả ảnh (base64) kèm prompt
// - Hàm searchPlacesNear: tìm địa điểm gần vị trí hiện tại
// Lưu ý: Khóa API đọc từ biến môi trường EXPO_PUBLIC_GEMINI_API_KEY
import Constants from "expo-constants";

// Ưu tiên biến môi trường công khai để hoạt động trên Expo Go và build; fallback sang extra
const API_KEY =
  process.env?.EXPO_PUBLIC_GEMINI_API_KEY || 
  Constants?.expoConfig?.extra?.GEMINI_API_KEY ||
  "AIzaSyAQTNX-2wlKmUMAFCbQBnssfLZM90HhjvA"; // Fallback key

const BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Sinh văn bản từ prompt bằng mô hình Gemini 1.5 Flash
 * @param {string} prompt Chuỗi yêu cầu đầu vào
 * @returns {Promise<{text: string}>} Đối tượng { text } là văn bản phản hồi
 */
export async function generateText(prompt) {
  if (!API_KEY) throw new Error("Thiếu GEMINI API KEY. Đặt EXPO_PUBLIC_GEMINI_API_KEY trong .env");
  const url = `${BASE}/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  const body = { contents: [{ parts: [{ text: prompt }] }] };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const json = await res.json();
  // Gộp tất cả phần text trong phản hồi lại thành một chuỗi
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  return { text };
}

/**
 * Mô tả ảnh (dữ liệu base64) bằng prompt
 * @param {string} base64 Chuỗi ảnh base64 (không bao gồm prefix data:...)
 * @param {string} prompt Mô tả yêu cầu (ngôn ngữ tự nhiên)
 * @returns {Promise<{text: string}>} Đối tượng { text } là văn bản phản hồi
 */
export async function generateFromImage(base64, prompt) {
  if (!API_KEY) throw new Error("Thiếu GEMINI API KEY. Đặt EXPO_PUBLIC_GEMINI_API_KEY trong .env");
  const url = `${BASE}/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: base64 } }
        ]
      }
    ]
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  return { text };
}

// Dịch vụ tìm địa điểm gần vị trí hiện tại sử dụng OpenStreetMap Nominatim (miễn phí)
// Lưu ý: Chỉ dùng cho mục đích học tập/demo; tôn trọng điều khoản sử dụng và rate limits.

/**
 * Tìm kiếm địa điểm gần một tâm (center)
 * @param {string} query Từ khóa tìm kiếm (vd: "cinema", "movie theater")
 * @param {{latitude: number, longitude: number}} center Tâm tìm kiếm
 * @param {{limit?: number, radiusKm?: number}} options Tuỳ chọn: limit số kết quả, radiusKm bán kính
 * @returns {Promise<Array<{latitude: number, longitude: number, title?: string, address?: string}>>} Mảng PlacePin
 */
export async function searchPlacesNear(
  query,
  center,
  options = {}
) {
  const limit = options?.limit ?? 5;
  const radiusKm = options?.radiusKm ?? 3; // ~3km box around center

  // Build a small bounding box around the center
  const latDelta = radiusKm * 0.009; // rough deg per km
  const lonDelta = radiusKm * 0.009;
  const minLon = center.longitude - lonDelta;
  const maxLon = center.longitude + lonDelta;
  const minLat = center.latitude - latDelta;
  const maxLat = center.latitude + latDelta;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("bounded", "1");
  url.searchParams.set("viewbox", `${minLon},${maxLat},${maxLon},${minLat}`);

  const res = await fetch(url.toString(), {
    headers: {
      // Identify your app per Nominatim usage policy
      "User-Agent": "MovieApp/1.0 (edu)"
    }
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const json = await res.json();
  return json.map((it) => ({
    latitude: parseFloat(it.lat),
    longitude: parseFloat(it.lon),
    title: it.display_name?.split(",")[0] ?? query,
    address: it.display_name,
  }));
}

/**
 * Tìm rạp chiếu phim gần nhất sử dụng Gemini AI và OpenStreetMap
 * @param {{latitude: number, longitude: number}} userLocation Vị trí người dùng
 * @returns {Promise<{cinemas: Array, aiSuggestion: string}>} Danh sách rạp và gợi ý từ AI
 */
export async function findNearbyCinemas(userLocation) {
  try {
    // 1. Tìm rạp chiếu phim gần đó sử dụng OpenStreetMap
    // Tăng radiusKm lên 15km cho Cần Thơ (thành phố nhỏ hơn, rạp ít hơn)
    const cinemas = await searchPlacesNear(
      "cinema movie theater rap chieu phim CGV Lotte BHD",
      userLocation,
      { limit: 15, radiusKm: 15 }
    );

    // 2. Sử dụng Gemini AI để phân tích và đề xuất
    const cinemaList = cinemas.map((c, idx) => 
      `${idx + 1}. ${c.title}\n   Địa chỉ: ${c.address}\n   Tọa độ: ${c.latitude}, ${c.longitude}`
    ).join("\n\n");

    const prompt = `Bạn là trợ lý tìm rạp chiếu phim. Dựa vào danh sách rạp dưới đây, hãy:
1. Phân tích và sắp xếp theo độ gần (dựa vào tọa độ)
2. Đề xuất 3 rạp tốt nhất
3. Đưa ra lời khuyên ngắn gọn về cách di chuyển

Vị trí người dùng: ${userLocation.latitude}, ${userLocation.longitude}

Danh sách rạp tìm được:
${cinemaList || "Không tìm thấy rạp nào gần đây."}

Hãy trả lời bằng tiếng Việt, ngắn gọn và hữu ích.`;

    const aiResponse = await generateText(prompt);

    return {
      cinemas,
      aiSuggestion: aiResponse.text || "Không có gợi ý từ AI."
    };
  } catch (error) {
    console.error("Error finding nearby cinemas:", error);
    throw error;
  }
}
