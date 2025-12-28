const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// System prompt với context về shop
const SYSTEM_PROMPT = `Bạn là trợ lý AI chuyên nghiệp của một cửa hàng trực tuyến chuyên cung cấp dịch vụ mạng xã hội và các sản phẩm kỹ thuật số.

NHIỆM VỤ CỦA BẠN:
- Trả lời câu hỏi của khách hàng một cách thân thiện, chuyên nghiệp và hữu ích
- Cung cấp thông tin CHÍNH XÁC về sản phẩm, dịch vụ, giá cả, chính sách dựa trên dữ liệu shop được cung cấp
- Hỗ trợ khách hàng về đơn hàng, thanh toán, vận chuyển
- Giải đáp thắc mắc về dịch vụ Facebook, TikTok, YouTube và các sản phẩm kỹ thuật số khác
- Tìm kiếm và tra cứu thông tin sản phẩm/dịch vụ khi khách hàng hỏi

NGUYÊN TẮC:
- Luôn trả lời bằng tiếng Việt
- Giữ thái độ lịch sự, nhiệt tình
- TRA CỨU KỸ thông tin trong dữ liệu shop được cung cấp trước khi trả lời
- Nếu khách hỏi về sản phẩm/dịch vụ, hãy tìm trong danh sách và cung cấp thông tin CHÍNH XÁC (tên, giá, mô tả, tính năng)
- Nếu không tìm thấy thông tin trong dữ liệu, đề xuất khách hàng liên hệ admin để được hỗ trợ chi tiết hơn
- Không hứa hẹn những điều không chắc chắn
- Luôn cố gắng giải quyết vấn đề của khách hàng
- Khi khách hỏi về giá, hãy cung cấp giá CHÍNH XÁC từ dữ liệu shop

THÔNG TIN SHOP:
- Tên shop: MMOS
- Chuyên cung cấp: Dịch vụ mạng xã hội (Facebook, TikTok, YouTube), VIA, PROXY, và các sản phẩm kỹ thuật số
- Thanh toán: Chuyển khoản ngân hàng (MB Bank), ví điện tử
- Hỗ trợ: 24/7 qua chat

HƯỚNG DẪN TRA CỨU:
- Khi khách hỏi về sản phẩm: Tìm trong danh sách "SẢN PHẨM" theo tên, category, hoặc mô tả
- Khi khách hỏi về dịch vụ Facebook: Tìm trong danh sách "DỊCH VỤ FACEBOOK"
- Khi khách hỏi về giá: Cung cấp giá CHÍNH XÁC từ dữ liệu, định dạng theo VND (ví dụ: 100.000 ₫)
- Khi khách hỏi về tính năng: Liệt kê các tính năng từ dữ liệu sản phẩm
- Nếu khách hỏi mơ hồ (ví dụ: "có sản phẩm nào rẻ không?"), hãy đề xuất một vài sản phẩm phù hợp từ dữ liệu`;

/**
 * Build context về shop để cung cấp cho AI
 * Đọc TẤT CẢ sản phẩm và dịch vụ để AI có thể tra cứu
 */
const buildShopContext = async (orderId = null) => {
  let context = SYSTEM_PROMPT;
  
  try {
    const Product = require("../models/product");
    const FacebookService = require("../models/facebookService");
    
    // Lấy TẤT CẢ sản phẩm active với đầy đủ thông tin
    const products = await Product.find({ isActive: true })
      .select("name description price category features duration_months")
      .sort({ category: 1, price: 1 })
      .lean();
    
    // Lấy TẤT CẢ dịch vụ Facebook active
    const facebookServices = await FacebookService.find({ isActive: true })
      .select("name description basePrice unit unitLabel minPrice processingTime completionTime serviceType warrantyDays")
      .sort({ displayOrder: 1 })
      .lean();
    
    // Tổ chức sản phẩm theo category
    if (products.length > 0) {
      context += "\n\n═══════════════════════════════════════════════════════════\n";
      context += "📦 DANH SÁCH SẢN PHẨM (TRA CỨU KHI KHÁCH HỎI):\n";
      context += "═══════════════════════════════════════════════════════════\n";
      
      // Nhóm theo category
      const productsByCategory = {};
      products.forEach(product => {
        const category = product.category || "OTHER";
        if (!productsByCategory[category]) {
          productsByCategory[category] = [];
        }
        productsByCategory[category].push(product);
      });
      
      // Hiển thị theo từng category
      Object.keys(productsByCategory).forEach(category => {
        const categoryName = {
          "VIA": "🔐 VIA (Tài khoản)",
          "PROXY": "🌐 PROXY",
          "DICH_VU_MXH": "📱 DỊCH VỤ MẠNG XÃ HỘI",
          "OTHER": "📦 SẢN PHẨM KHÁC"
        }[category] || `📦 ${category}`;
        
        context += `\n${categoryName}:\n`;
        context += "─".repeat(50) + "\n";
        
        productsByCategory[category].forEach((product, index) => {
          const priceFormatted = new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND"
          }).format(product.price);
          
          context += `\n${index + 1}. ${product.name}\n`;
          context += `   💰 Giá: ${priceFormatted}\n`;
          context += `   📝 Mô tả: ${product.description}\n`;
          
          if (product.duration_months) {
            context += `   ⏱️ Thời hạn: ${product.duration_months} tháng\n`;
          }
          
          if (product.features && product.features.length > 0) {
            context += `   ✨ Tính năng: ${product.features.join(", ")}\n`;
          }
        });
      });
    }

    // Thêm danh sách dịch vụ Facebook
    if (facebookServices.length > 0) {
      context += "\n\n═══════════════════════════════════════════════════════════\n";
      context += "📱 DANH SÁCH DỊCH VỤ FACEBOOK (TRA CỨU KHI KHÁCH HỎI):\n";
      context += "═══════════════════════════════════════════════════════════\n";
      
      facebookServices.forEach((service, index) => {
        const priceFormatted = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND"
        }).format(service.basePrice);
        
        context += `\n${index + 1}. ${service.icon || "📱"} ${service.name}\n`;
        context += `   📝 Mô tả: ${service.description}\n`;
        context += `   💰 Giá: ${priceFormatted} / ${service.unit} ${service.unitLabel}\n`;
        
        if (service.minPrice > 0) {
          const minPriceFormatted = new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND"
          }).format(service.minPrice);
          context += `   💵 Giá tối thiểu: ${minPriceFormatted}\n`;
        }
        
        if (service.processingTime) {
          context += `   ⚡ Thời gian xử lý: ${service.processingTime} phút\n`;
        }
        
        if (service.completionTime) {
          const hours = Math.floor(service.completionTime / 60);
          const minutes = service.completionTime % 60;
          if (hours > 0) {
            context += `   ⏱️ Thời gian hoàn thành: ${hours} giờ ${minutes > 0 ? minutes + " phút" : ""}\n`;
          } else {
            context += `   ⏱️ Thời gian hoàn thành: ${minutes} phút\n`;
          }
        }
        
        if (service.warrantyDays) {
          context += `   🛡️ Bảo hành: ${service.warrantyDays} ngày\n`;
        }
      });
    }

    // Nếu có orderId, thêm thông tin đơn hàng
    if (orderId) {
      const Order = require("../models/order");
      const order = await Order.findById(orderId)
        .populate("items.product", "name price")
        .populate("items.serviceId", "name basePrice")
        .lean();
      
      if (order) {
        context += "\n\n═══════════════════════════════════════════════════════════\n";
        context += "📋 THÔNG TIN ĐƠN HÀNG CỦA KHÁCH:\n";
        context += "═══════════════════════════════════════════════════════════\n";
        context += `- Mã đơn: ${order._id}\n`;
        context += `- Trạng thái: ${order.status}\n`;
        context += `- Tổng tiền: ${new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND"
        }).format(order.totalAmount)}\n`;
        
        if (order.items && order.items.length > 0) {
          context += `- Sản phẩm/Dịch vụ:\n`;
          order.items.forEach((item, idx) => {
            context += `  ${idx + 1}. ${item.name || (item.product?.name || item.serviceId?.name)} - Số lượng: ${item.quantity}\n`;
          });
        }
      }
    }
    
    context += "\n═══════════════════════════════════════════════════════════\n";
    context += "LƯU Ý: Sử dụng thông tin trên để trả lời CHÍNH XÁC các câu hỏi của khách hàng.\n";
    context += "═══════════════════════════════════════════════════════════\n";
    
  } catch (error) {
    console.error("Error building shop context:", error);
    // Không fail nếu không lấy được context
  }

  return context;
};

/**
 * Generate response từ Gemini API
 * @param {string} messageContent - Nội dung tin nhắn từ user
 * @param {Array} conversationHistory - Lịch sử conversation (10-20 tin nhắn gần nhất)
 * @param {string} orderId - ID đơn hàng nếu có
 * @returns {Promise<string>} - Phản hồi từ AI
 */
const generateResponse = async (messageContent, conversationHistory = [], orderId = null) => {
  try {
    // Kiểm tra API key
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY not configured, skipping AI response");
      return null;
    }

    console.log(`🤖 AI: Processing message from user, orderId: ${orderId || "none"}`);

    // Build context
    const shopContext = await buildShopContext(orderId);
    console.log(`📚 AI: Shop context built (${shopContext.length} characters)`);

    // Build conversation history for context
    let historyText = "";
    if (conversationHistory.length > 0) {
      historyText = "\n\n═══════════════════════════════════════════════════════════\n";
      historyText += "💬 LỊCH SỬ HỘI THOẠI (10 tin nhắn gần nhất):\n";
      historyText += "═══════════════════════════════════════════════════════════\n";
      conversationHistory.slice(-10).forEach((msg, idx) => {
        const role = msg.isFromAdmin ? "Shop" : "Khách hàng";
        historyText += `${idx + 1}. ${role}: ${msg.content || "[file đính kèm]"}\n`;
      });
    }

    // Build full prompt với hướng dẫn rõ ràng
    const fullPrompt = `${shopContext}${historyText}

═══════════════════════════════════════════════════════════
❓ CÂU HỎI MỚI TỪ KHÁCH HÀNG:
═══════════════════════════════════════════════════════════
"${messageContent}"

═══════════════════════════════════════════════════════════
📝 HƯỚNG DẪN TRẢ LỜI:
═══════════════════════════════════════════════════════════
1. ĐỌC KỸ câu hỏi của khách hàng
2. TRA CỨU trong danh sách sản phẩm/dịch vụ ở trên để tìm thông tin CHÍNH XÁC
3. Nếu khách hỏi về sản phẩm cụ thể: Tìm tên sản phẩm trong danh sách và cung cấp đầy đủ thông tin (tên, giá, mô tả, tính năng)
4. Nếu khách hỏi về giá: Cung cấp giá CHÍNH XÁC từ dữ liệu, định dạng theo VND
5. Nếu khách hỏi mơ hồ (ví dụ: "có sản phẩm nào rẻ không?"): Đề xuất 2-3 sản phẩm phù hợp từ danh sách
6. Trả lời một cách thân thiện, chuyên nghiệp, và HỮU ÍCH
7. Nếu không tìm thấy thông tin trong dữ liệu, đề xuất khách liên hệ admin

Hãy trả lời câu hỏi của khách hàng:`;

    // Get the generative model (using gemini-1.5-flash for faster responses)
    // Can also use "gemini-1.5-pro" for more complex queries
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log(`🚀 AI: Calling Gemini API with prompt length: ${fullPrompt.length} characters`);

    // Generate response
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log(`✅ AI: Response generated (${text.length} characters)`);
    return text.trim();
  } catch (error) {
    console.error("❌ Error generating Gemini response:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Trả về null thay vì fallback message để messageController xử lý
    // Hoặc có thể trả về null và để messageController tạo tin nhắn mặc định nếu cần
    return null;
  }
};

module.exports = {
  generateResponse,
  buildShopContext
};

