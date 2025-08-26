import tmi from "tmi.js";

export function connectChat({ channel, username, oauth }: { channel: string; username?: string; oauth?: string }) {
  const opts: tmi.Options = {
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
