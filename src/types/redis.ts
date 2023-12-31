export type StoreActiveClientsPayload = {
  clients: string[];
  timestamp: number;
  server_id: string;
};

export enum PubSubCommand {
  REFRESH_ACTIVE_CLIENTS = 'refresh_active_clients',
  STORE_ACTIVE_CLIENTS = 'store_active_clients'
}

export type Payload<T = unknown> = {
  command: PubSubCommand;
  data: T;
};
