// Local throw-away MongoDB for development/testing (data is lost when stopped).
// Usage: npm run db:local   then set MONGODB_URI=mongodb://127.0.0.1:27018/ in .env.local
import { MongoMemoryServer } from "mongodb-memory-server";

const port = Number(process.env.DEV_MONGO_PORT || 27018);
const server = await MongoMemoryServer.create({ instance: { port, ip: "127.0.0.1" } });
console.log(`Local MongoDB running at ${server.getUri()}`);
const stop = async () => {
  await server.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
