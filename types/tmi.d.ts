declare module 'tmi.js' {
  export interface Options {
    identity?: {
      username: string;
      password: string;
    };
    channels: string[];
    connection?: {
      secure?: boolean;
      reconnect?: boolean;
    };
    [key: string]: any;
  }

  export class Client {
    constructor(opts: Options);
    connect(): void;
    disconnect(): void;
    on(event: string, listener: (...args: any[]) => void): void;
    say(channel: string, message: string): void;
  }

  const tmi: {
    Client: typeof Client;
  };

  export default tmi;
}
