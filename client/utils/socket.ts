import { io, Socket } from 'socket.io-client';

interface EmitEvents {
    noArg: () => void;
    basicEmit: (a: number, b: string, c: Buffer) => void;
    withAck: (d: string, callback: (e: number) => void) => void;
}

interface ListenEvents {

    error: (d: { error: string; }) => void;

    recordingUpdate: (d: { ID: string, data: Partial<RecordedVideo>; }) => void;

    automationUpdate: (d: { ID: string; data: Automation; }) => void;
    automationDeletion: (d: { ID: string; }) => void;

    videoUpdate: (d: { ID: string, data: Partial<RecordedVideo>; }) => void;
    videoDeletion: (d: { ID: string; }) => void;
}

let socket: Socket<ListenEvents, any> | null = null;

export function useSocket() {
    if (socket == null) socket = io('http://big.jodu555.de:8081', { autoConnect: false });

    return socket;
}

