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
    
    const service = await FacebookService.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ" });
    }

    // Tìm server được chọn (nếu có)
    let selectedServer = null;
    if (serverId && service.servers && service.servers.length > 0) {
      selectedServer = service.servers.find(s => s.serverId === serverId || s._id?.toString() === serverId);
    }

    // Tính giá dựa trên server được chọn hoặc basePrice
    const unitPrice = selectedServer?.price || service.basePrice;
    let totalPrice = (quantity / parseInt(service.unit)) * unitPrice;

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
      server: selectedServer ? {
        serverId: selectedServer.serverId,
        name: selectedServer.name
      } : null,
      quantity,
      unitPrice,
      totalPrice: Math.ceil(totalPrice),
      processingTime: service.processingTime,
      completionTime: service.completionTime
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi khi tính giá", 
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
  calculatePrice
};

