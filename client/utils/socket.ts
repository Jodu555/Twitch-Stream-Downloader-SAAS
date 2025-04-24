import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useSocket() {
    if (socket == null) socket = io('http://138.201.131.52:8081', { autoConnect: false });

    return socket;
}

