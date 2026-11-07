export interface PaystackInitializeData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackTransactionData {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  channel: string | null;
  gateway_response: string | null;
  fees: number | null;
  customer?: {
    id?: number;
    email?: string | null;
  } | null;
}

export interface PaystackRefundData {
  id: number;
  status: string;
  amount: number;
  currency: string;
  transaction: number | { id?: number; reference?: string } | null;
  merchant_note?: string | null;
  customer_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}
