export interface CreatePaystackCustomer {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface AccountCreateResponse {
  bank: {
    name: string;
    id: number;
    slug: string;
  };
  account_name: string;
  account_number: string;
  assigned: boolean;
  currency: string;
  metadata: any;
  active: boolean;
  id: number;
  created_at: Date;
  updated_at: Date;
  assignment: {
    integration: number;
    assignee_id: number;
    assignee_type: string;
    expired: boolean;
    account_type: string;
    assigned_at: Date;
  };
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    customer_code: string;
    phone: string;
    risk_action: string;
  };
}

export interface BankAccountType {
  bank: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  customer: string;
  bankCode: number;
}

export interface CreateTransferReceipient {
  type: string;
  name: string;
  account_number: string;
  bank_code: string;
  currency: 'NGN';
}

export interface CreateTransfer extends CreateTransferReceipient {
  amount: number;
  reason: string;
  save_receipient: boolean;
}

export interface TransferResponse {
  domain: string;
  amount: number;
  currency: string;
  reference: string;
  source: string;
  source_details: any;
  reason: string;
  status: boolean;
  failures: any;
  transfer_code: string;
  titan_code: any;
  transferred_at: any;
  id: number;
  integration: number;
  recipient: number;
  createdAt: Date;
  updatedAt: Date;
}
