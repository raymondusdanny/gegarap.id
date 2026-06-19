/**
 * Minimal ambient types for `midtrans-client` (the package ships no types).
 * Only the surface we actually use is declared.
 */
declare module 'midtrans-client' {
  interface ClientOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  interface TransactionResult {
    token: string;
    redirect_url: string;
  }

  class Snap {
    constructor(options: ClientOptions);
    createTransaction(payload: Record<string, unknown>): Promise<TransactionResult>;
  }

  class CoreApi {
    constructor(options: ClientOptions);
    transaction: {
      status(orderId: string): Promise<Record<string, unknown>>;
      refund(orderId: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
    };
  }

  /** Iris disbursement API (separate API key from the Snap/Core server key). */
  interface IrisOptions {
    isProduction: boolean;
    serverKey: string; // Iris creator API key
  }
  class Iris {
    constructor(options: IrisOptions);
    createPayouts(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
    approvePayouts(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  }

  const MidtransClient: {
    Snap: typeof Snap;
    CoreApi: typeof CoreApi;
    Iris: typeof Iris;
  };

  export { Snap, CoreApi, Iris };
  export default MidtransClient;
}
