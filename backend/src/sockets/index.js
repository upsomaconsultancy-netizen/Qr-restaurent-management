const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyAccess } = require('../utils/jwt');

/**
 * Real-time layer (Socket.IO).
 * Rooms:
 *   outlet:<outletId>:staff    -> kitchen display, waiter views, manager dashboard for one outlet
 *   outlet:<outletId>:waiters  -> only waiters in an outlet (receives order:ready_to_serve)
 *   staff:<restaurantId>       -> OWNER/MANAGER watching all outlets of a restaurant
 *   session:<sessionToken>     -> a customer's table session (live bill / order tracking)
 *   customer:<customerToken>   -> per-customer isolated room
 *
 * Events emitted by the server:
 *   order:new, order:updated, item:updated, bill:updated, payment:recorded,
 *   order:ready_to_serve (waiter notification when kitchen marks DONE)
 */
let io;

function initSockets(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.corsOrigins, credentials: true } });

  io.on('connection', (socket) => {
    // Staff join: requires a valid JWT; rooms derived from token.
    socket.on('staff:join', (token) => {
      try {
        const payload = verifyAccess(token);
        if (!payload.restaurantId) return;

        // OWNER/MANAGER join restaurant-wide room to see all outlets
        socket.join(`staff:${payload.restaurantId}`);

        // WAITER/KITCHEN join outlet-specific rooms
        if (payload.outletId) {
          socket.join(`outlet:${payload.outletId}:staff`);
          if (payload.role === 'WAITER') {
            socket.join(`outlet:${payload.outletId}:waiters`);
          }
        }

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

// Restaurant-wide (OWNER/MANAGER watching all outlets)
function emitToStaff(restaurantId, event, payload) {
  if (io) io.to(`staff:${restaurantId}`).emit(event, payload);
}

// Outlet-specific (WAITER/KITCHEN in one outlet + OWNER/MANAGER restaurant room)
function emitToOutlet(restaurantId, outletId, event, payload) {
  if (!io) return;
  io.to(`outlet:${outletId}:staff`).emit(event, payload);
  io.to(`staff:${restaurantId}`).emit(event, payload);
}

// Only waiters in an outlet (order:ready_to_serve notification)
function emitToOutletWaiters(restaurantId, outletId, event, payload) {
  if (!io) return;
  io.to(`outlet:${outletId}:waiters`).emit(event, payload);
  // Also send to OWNER/MANAGER restaurant room so they can monitor
  io.to(`staff:${restaurantId}`).emit(event, payload);
}

function emitToSession(sessionToken, event, payload) {
  if (io) io.to(`session:${sessionToken}`).emit(event, payload);
}

function emitToCustomer(customerToken, event, payload) {
  if (io) io.to(`customer:${customerToken}`).emit(event, payload);
}

module.exports = { initSockets, emitToStaff, emitToOutlet, emitToOutletWaiters, emitToSession, emitToCustomer };
