const QRCode = require('qrcode');
const env = require('../config/env');

/** The QR encodes a customer-facing URL: <app>/m/<qrToken> */
function qrUrl(qrToken) {
  return `${env.appUrl}/m/${qrToken}`;
}

async function qrPngDataUrl(qrToken) {
  return QRCode.toDataURL(qrUrl(qrToken), { width: 512, margin: 2 });
}

module.exports = { qrUrl, qrPngDataUrl };
