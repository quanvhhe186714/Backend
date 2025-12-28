const FacebookService = require("../models/facebookService");

// Lấy tất cả dịch vụ
const getAllServices = async (req, res) => {
  try {
    const services = await FacebookService.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi khi lấy danh sách dịch vụ", 
      error: error.message 
    });
  }
};

// Lấy dịch vụ theo ID
const getServiceById = async (req, res) => {
  try {
    const service = await FacebookService.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ" });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi khi lấy thông tin dịch vụ", 
      error: error.message 
    });
  }
};

// Tạo dịch vụ mới (Admin only)
const createService = async (req, res) => {
  try {
    const service = new FacebookService(req.body);
    await service.save();
    res.status(201).json({
      message: "Tạo dịch vụ thành công",
      service
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Dịch vụ đã tồn tại (trùng tên hoặc code)" 
      });
    }
    res.status(500).json({ 
      message: "Lỗi khi tạo dịch vụ", 
      error: error.message 
    });
  }
};

// Cập nhật dịch vụ (Admin only)
const updateService = async (req, res) => {
  try {
    const service = await FacebookService.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!service) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ" });
    }
    res.status(200).json({
      message: "Cập nhật dịch vụ thành công",
      service
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi khi cập nhật dịch vụ", 
      error: error.message 
    });
  }
};

// Xóa dịch vụ (Admin only - soft delete)
const deleteService = async (req, res) => {
  try {
    const service = await FacebookService.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ" });
    }
    res.status(200).json({ message: "Xóa dịch vụ thành công" });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi khi xóa dịch vụ", 
      error: error.message 
    });
  }
};

// Tính giá dịch vụ
const calculatePrice = async (req, res) => {
  try {
    const { serviceId, quantity, serverId } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Số lượng phải lớn hơn 0" });
    }

    const service = await FacebookService.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ" });
    }

    const unit = parseInt(service.unit) || 1000;
    
    // Kiểm tra số lượng tối thiểu
    if (quantity < unit) {
      return res.status(400).json({ 
        message: `Số lượng tối thiểu là ${unit} ${service.unitLabel}` 
      });
    }

    // Tính giá dựa trên số lượng
    const unitPrice = service.basePrice;
    let totalPrice = (quantity / unit) * unitPrice;

    // Kiểm tra min/max price
    if (service.minPrice && totalPrice < service.minPrice) {
      totalPrice = service.minPrice;
    }
    if (service.maxPrice && totalPrice > service.maxPrice) {
      totalPrice = service.maxPrice;
    }

    res.status(200).json({
      service: {
        name: service.name,
        code: service.code,
        unit: service.unit,
        unitLabel: service.unitLabel
      },
      quantity,
      unitPrice,
      totalPrice: Math.ceil(totalPrice),
      processingTime: service.processingTime,
      completionTime: service.completionTime,
      status: service.status,
      dropRate: service.dropRate,
      warrantyDays: service.warrantyDays
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi khi tính giá", 
      error: error.message 
    });
  }
};

// Lấy bảng giá mẫu
const getPriceTable = async (req, res) => {
  try {
    const service = await FacebookService.findById(req.params.id);
    if (!service || !service.isActive) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ" });
    }

    // Nếu có priceTable trong database, trả về
    if (service.priceTable && service.priceTable.length > 0) {
      return res.status(200).json({
        priceTable: service.priceTable,
        unit: service.unit,
        unitLabel: service.unitLabel
      });
    }

    // Nếu không có, tạo bảng giá mẫu tự động
    const unit = parseInt(service.unit) || 1000;
    const unitPrice = service.basePrice;
    const commonQuantities = [1000, 5000, 10000, 50000, 100000];
    
    const priceTable = commonQuantities.map(qty => {
      let price = (qty / unit) * unitPrice;
      if (service.minPrice && price < service.minPrice) {
        price = service.minPrice;
      }
      if (service.maxPrice && price > service.maxPrice) {
        price = service.maxPrice;
      }
      return {
        quantity: qty,
        price: Math.ceil(price)
      };
    });

    res.status(200).json({
      priceTable,
      unit: service.unit,
      unitLabel: service.unitLabel
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi khi lấy bảng giá", 
      error: error.message 
    });
  }
};

// Lấy trạng thái dịch vụ
const getServiceStatus = async (req, res) => {
  try {
    const service = await FacebookService.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ" });
    }

    res.status(200).json({
      status: service.status || "stable",
      dropRate: service.dropRate || 0,
      warrantyDays: service.warrantyDays || 30,
      isActive: service.isActive
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi khi lấy trạng thái dịch vụ", 
      error: error.message 
    });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  calculatePrice,
  getPriceTable,
  getServiceStatus
};

