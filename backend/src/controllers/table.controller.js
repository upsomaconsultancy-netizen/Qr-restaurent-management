const { v4: uuid } = require('uuid');
const Table = require('../models/Table');
const Outlet = require('../models/Outlet');
const ApiError = require('../utils/ApiError');
const { tenantFilter } = require('../middleware/tenant');
const { qrUrl, qrPngDataUrl } = require('../services/qr.service');
const { audit } = require('../utils/audit');

exports.list = async (req, res) => {
  const tables = await Table.find(tenantFilter(req)).sort('number').lean();
  res.json({ success: true, data: tables.map(t => ({ ...t, qrUrl: qrUrl(t.qrCode) })) });
};

/** Enforces the table quota purchased on the subscription. */
exports.create = async (req, res) => {
  const { number, name, capacity } = req.body;
  if (!number) throw ApiError.badRequest('Table number is required. Please enter a number for this table.');

  const resolvedOutletId = ['MANAGER', 'WAITER', 'KITCHEN'].includes(req.user.role)
    ? req.user.outletId
    : req.body.outletId;

  if (!resolvedOutletId) throw ApiError.badRequest('Please select an outlet for this table.');

  const outlet = await Outlet.findOne({ _id: resolvedOutletId, restaurantId: req.user.restaurantId, isDeleted: false });
  if (!outlet) throw ApiError.notFound('The selected outlet was not found. Please refresh and try again.');

  const totalCount = await Table.countDocuments({ restaurantId: req.user.restaurantId, isDeleted: false });
  if (totalCount >= req.tenant.tableLimit) {
    throw ApiError.forbidden(
      `Your restaurant plan allows a maximum of ${req.tenant.tableLimit} tables and all slots are used. ` +
      `Please contact the platform admin to upgrade your plan.`
    );
  }

  if (outlet.tableLimit > 0) {
    const outletCount = await Table.countDocuments({ outletId: outlet._id, isDeleted: false });
    if (outletCount >= outlet.tableLimit) {
      throw ApiError.forbidden(
        `This outlet has reached its table limit of ${outlet.tableLimit}. ` +
        `Please ask the restaurant owner to increase this outlet's table allocation.`
      );
    }
  }

  const table = await Table.create({
    restaurantId: req.user.restaurantId,
    outletId: resolvedOutletId,
    number: parseInt(number, 10),
    name,
    capacity: capacity || 4,
    qrCode: uuid().replace(/-/g, '')
  });
  audit({ req, action: 'TABLE_CREATED', entity: 'Table', entityId: table._id });
  res.status(201).json({ success: true, data: table });
};

exports.qrImage = async (req, res) => {
  const table = await Table.findOne(tenantFilter(req, { _id: req.params.id }));
  if (!table) throw ApiError.notFound('Table not found. It may have been deleted.');
  const png = await qrPngDataUrl(table.qrCode);
  res.json({ success: true, data: { table: table.number, url: qrUrl(table.qrCode), png } });
};

exports.toggleActive = async (req, res) => {
  const table = await Table.findOne(tenantFilter(req, { _id: req.params.id }));
  if (!table) throw ApiError.notFound('Table not found. It may have been deleted.');
  table.isActive = !table.isActive;
  await table.save();
  res.json({ success: true, data: table });
};

exports.remove = async (req, res) => {
  const table = await Table.findOneAndUpdate(tenantFilter(req, { _id: req.params.id }), { isDeleted: true });
  if (!table) throw ApiError.notFound('Table not found. It may have been deleted.');
  res.json({ success: true });
};
