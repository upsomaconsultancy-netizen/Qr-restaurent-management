const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyAccess } = require('../utils/jwt');

/**
 * Real-time layer (Socket.IO — Node's equivalent of SignalR).
 * Rooms:
 *   staff:<restaurantId>     -> kitchen display, waiter views, manager dashboards
 *   session:<sessionToken>   -> a customer's table session (live bill / order tracking)
 *
 * Events emitted by the server:
 *   order:new, order:updated, item:updated, bill:updated, payment:recorded
 */
let io;

function initSockets(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.corsOrigins, credentials: true } });

  io.on('connection', (socket) => {
    // Staff join: requires a valid JWT; room derived from the token's tenant.
    socket.on('staff:join', (token) => {
      try {
        const payload = verifyAccess(token);
        if (!payload.restaurantId) return;
        socket.join(`staff:${payload.restaurantId}`);
        socket.emit('staff:joined');
      } catch {
        socket.emit('error', 'invalid token');
      }
    });

    // Customer join: opaque session token issued when the QR session opened.
    socket.on('session:join', (sessionToken) => {
      if (typeof sessionToken === 'string' && sessionToken.length >= 16) {
        socket.join(`session:${sessionToken}`);
        socket.emit('session:joined');
      }
    });

    // Per-customer room: scoped to one customer's session token so bill updates are isolated.
    socket.on('customer:join', (customerToken) => {
      if (typeof customerToken === 'string' && customerToken.length >= 16) {
        socket.join(`customer:${customerToken}`);
        socket.emit('customer:joined');
      }
    });
  });

  return io;
}

function emitToStaff(restaurantId, event, payload) {
  if (io) io.to(`staff:${restaurantId}`).emit(event, payload);
}
function emitToSession(sessionToken, event, payload) {
  if (io) io.to(`session:${sessionToken}`).emit(event, payload);
}
function emitToCustomer(customerToken, event, payload) {
  if (io) io.to(`customer:${customerToken}`).emit(event, payload);
}

module.exports = { initSockets, emitToStaff, emitToSession, emitToCustomer };
