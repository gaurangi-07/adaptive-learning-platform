/**
 * @file prismaClient.js
 * @description Singleton Prisma Client instance used across the application.
 */

const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'test') {
  // In test mode, we use a mock — see tests/helpers/mockPrisma.js
  prisma = null;
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });
}

function getPrismaClient() {
  return prisma;
}

function setPrismaClient(client) {
  prisma = client;
}

module.exports = { getPrismaClient, setPrismaClient };

