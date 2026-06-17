import { app } from '../dist/ros/server/server.mjs';

const server = app();

export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  server(req, res);
}
