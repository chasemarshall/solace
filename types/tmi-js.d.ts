declare module 'tmi.js' {
  export class Client {
    constructor(options: any);
    connect(): Promise<any>;
    disconnect(): Promise<any>;
    say(channel: string, message: string): Promise<any>;
    on(event: string, handler: (...args: any[]) => void): void;
  }
  const tmi: {
    Client: typeof Client;
  };
  export default tmi;
}
