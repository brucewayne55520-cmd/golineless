import { Server as SocketIOServer } from "socket.io";
import { logger } from "./logger";

let ioInstance: SocketIOServer;

export function getIo(): SocketIOServer {
  return ioInstance;
}

export function setIo(instance: SocketIOServer): void {
  ioInstance = instance;
}

// O1: Socket.IO auth middleware is now inline in index.ts using resolveSocketIdentity().
// This file only provides the shared ioInstance getter/setter.
