const FacebookService = require("../models/facebookService");

const getAllServices = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.platform === "facebook") {
      filter.$or = [{ platform: "facebook" }, { platform: { $exists: false } }, { platform: null }];
    } else if (req.query.platform) {
      filter.platform = req.query.platform;
    }

    const services = await FacebookService.find(filter).sort({
      displayOrder: 1,
      name: 1,
    });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay danh sach dich vu",
      error: error.message,
    });
  }
};

const getServiceById = async (req, res) => {
  try {
    const service = await FacebookService.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Khong tim thay dich vu" });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay thong tin dich vu",
      error: error.message,
    });
  }
};

const createService = async (req, res) => {
  try {
    const service = new FacebookService(req.body);
    await service.save();
    res.status(201).json({
      message: "Tao dich vu thanh cong",
      service,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Dich vu da ton tai (trung ten hoac code)",
      });
    }
    res.status(500).json({
      message: "Loi khi tao dich vu",
      error: error.message,
    });
  }
};

const updateService = async (req, res) => {
  try {
    const service = await FacebookService.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!service) {
      return res.status(404).json({ message: "Khong tim thay dich vu" });
    }
    res.status(200).json({
      message: "Cap nhat dich vu thanh cong",
      service,
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi cap nhat dich vu",
      error: error.message,
    });
  }
};

const deleteService = async (req, res) => {
  try {
    const service = await FacebookService.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ message: "Khong tim thay dich vu" });
    }
    res.status(200).json({ message: "Xoa dich vu thanh cong" });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi xoa dich vu",
      error: error.message,
    });
  }
};

const calculatePrice = async (req, res) => {
  try {
    const { serviceId, quantity, serverId } = req.body;
    const parsedQuantity = Number(quantity);

    if (!parsedQuantity || parsedQuantity <= 0) {
      return res.status(400).json({ message: "So luong phai lon hon 0" });
    }

    const service = await FacebookService.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({ message: "Khong tim thay dich vu" });
    }

    const unit = parseInt(service.unit, 10) || 1000;
    if (parsedQuantity < unit) {
      return res.status(400).json({
        message: `So luong toi thieu la ${unit} ${service.unitLabel || ""}`.trim(),
      });
    }

    let selectedServer = null;
    if (serverId && service.servers && service.servers.length > 0) {
      selectedServer = service.servers.find(
        (server) => server.serverId === serverId || server._id?.toString() === serverId
      );
    }

    const unitPrice = selectedServer?.price || service.basePrice;
    let totalPrice = (parsedQuantity / unit) * unitPrice;

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
        unitLabel: service.unitLabel,
      },
      server: selectedServer
        ? {
            serverId: selectedServer.serverId,
            name: selectedServer.name,
          }
        : null,
      quantity: parsedQuantity,
      unitPrice,
      totalPrice: Math.ceil(totalPrice),
      processingTime: service.processingTime,
      completionTime: service.completionTime,
      status: service.status,
      dropRate: service.dropRate,
      warrantyDays: service.warrantyDays,
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi tinh gia",
      error: error.message,
    });
  }
};

const getPriceTable = async (req, res) => {
  try {
    const service = await FacebookService.findById(req.params.id);
    if (!service || !service.isActive) {
      return res.status(404).json({ message: "Khong tim thay dich vu" });
    }

    if (service.priceTable && service.priceTable.length > 0) {
      return res.status(200).json({
        priceTable: service.priceTable,
        unit: service.unit,
        unitLabel: service.unitLabel,
      });
    }

    const unit = parseInt(service.unit, 10) || 1000;
    const commonQuantities = [1000, 5000, 10000, 50000, 100000];
    const priceTable = commonQuantities.map((quantity) => {
      let price = (quantity / unit) * service.basePrice;
      if (service.minPrice && price < service.minPrice) price = service.minPrice;
      if (service.maxPrice && price > service.maxPrice) price = service.maxPrice;
      return { quantity, price: Math.ceil(price) };
    });

    res.status(200).json({
      priceTable,
      unit: service.unit,
      unitLabel: service.unitLabel,
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay bang gia",
      error: error.message,
    });
  }
};

const getServiceStatus = async (req, res) => {
  try {
    const service = await FacebookService.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Khong tim thay dich vu" });
    }

    res.status(200).json({
      status: service.status || "stable",
      dropRate: service.dropRate || 0,
      warrantyDays: service.warrantyDays || 30,
      isActive: service.isActive,
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay trang thai dich vu",
      error: error.message,
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
  getServiceStatus,
};
