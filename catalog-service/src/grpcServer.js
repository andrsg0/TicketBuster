import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Buscar proto files en la carpeta proto dentro del proyecto
// En desarrollo: /app/src/../proto = /app/proto
// Funciona tanto local como en Docker
const protoPath = path.resolve(__dirname, '..', 'proto', 'inventory.proto');
const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const inventoryProto = grpc.loadPackageDefinition(packageDefinition).ticketbuster.inventory;

export async function ValidateAndCommitSeat(call, callback) {
  const seatId = Number(call.request?.seat_id);

  if (!seatId) {
    callback(null, { success: false, message: 'seat_id is required' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const seatResult = await client.query(
      'SELECT id, status FROM seats WHERE id = $1 FOR UPDATE',
      [seatId],
    );

    if (seatResult.rowCount === 0) {
      await client.query('ROLLBACK');
      callback(null, { success: false, message: 'Seat not found' });
      return;
    }

    const status = String(seatResult.rows[0].status || '').toUpperCase();

    if (status === 'SOLD') {
      await client.query('ROLLBACK');
      callback(null, { success: false, message: 'Seat already sold' });
      return;
    }

    if (status === 'LOCKED' || status === 'AVAILABLE') {
      await client.query("UPDATE seats SET status = 'SOLD' WHERE id = $1", [seatId]);
      await client.query('COMMIT');
      callback(null, { success: true });
      return;
    }

    await client.query('ROLLBACK');
    callback(null, { success: false, message: 'Seat not eligible for commit' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('ValidateAndCommitSeat error:', error);
    callback(null, { success: false, message: 'Internal error' });
  } finally {
    client.release();
  }
}

export function startGrpcServer(port = process.env.GRPC_PORT || 50051) {
  if (!inventoryProto?.InventoryService) {
    throw new Error('InventoryService definition not found in inventory.proto');
  }

  const server = new grpc.Server();
  // Map CommitSeat RPC to ValidateAndCommitSeat handler per service contract.
  server.addService(inventoryProto.InventoryService.service, {
    CommitSeat: ValidateAndCommitSeat,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('Failed to start gRPC server:', err);
        return;
      }
      console.log(`gRPC InventoryService running on port ${boundPort}`);
    },
  );

  return server;
}
