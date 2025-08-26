import tmi from "tmi.js";

interface TmiOptions {
  connection?: { secure?: boolean; reconnect?: boolean };
  channels: string[];
  identity?: { username: string; password: string };
}

export function connectChat({ channel, username, oauth }: { channel: string; username?: string; oauth?: string }) {
  const opts: TmiOptions = {
    connection: { secure: true, reconnect: true },
    channels: [channel],
  };
  if (username && oauth) {
    opts.identity = { username, password: oauth };
  }
  const client = new tmi.Client(opts);
  client.connect();
  return client;
}
