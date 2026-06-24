import { Server as SocketIOServer } from "socket.io";

let ioInstance: SocketIOServer;

export function getIo(): SocketIOServer {
  return ioInstance;
}

export function setIo(instance: SocketIOServer): void {
  ioInstance = instance;
}
