const { v4: uuid } = require('uuid');
const Table = require('../models/Table');
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
  const count = await Table.countDocuments(tenantFilter(req));
  if (count >= req.tenant.tableLimit) {
    throw ApiError.forbidden(`Table limit reached (${req.tenant.tableLimit}). Contact platform admin to upgrade.`);
  }
  const number = parseInt(req.body.number, 10);
  if (!number) throw ApiError.badRequest('Table number required');

  const table = await Table.create({
    restaurantId: req.user.restaurantId,
    number,
    name: req.body.name,
    capacity: req.body.capacity || 4,
    qrCode: uuid().replace(/-/g, '')
  });
  audit({ req, action: 'TABLE_CREATED', entity: 'Table', entityId: table._id });
  res.status(201).json({ success: true, data: table });
};

exports.qrImage = async (req, res) => {
  const table = await Table.findOne(tenantFilter(req, { _id: req.params.id }));
  if (!table) throw ApiError.notFound('Table not found');
  const png = await qrPngDataUrl(table.qrCode);
  res.json({ success: true, data: { table: table.number, url: qrUrl(table.qrCode), png } });
};

exports.toggleActive = async (req, res) => {
  const table = await Table.findOne(tenantFilter(req, { _id: req.params.id }));
  if (!table) throw ApiError.notFound('Table not found');
  table.isActive = !table.isActive;
  await table.save();
  res.json({ success: true, data: table });
};

exports.remove = async (req, res) => {
  const table = await Table.findOneAndUpdate(tenantFilter(req, { _id: req.params.id }), { isDeleted: true });
  if (!table) throw ApiError.notFound('Table not found');
  res.json({ success: true });
};
