export interface MBTransactionResponse {
  refNo: string;
  result: MBResult;
  transactionHistoryList: MBTransaction[];
}

export interface MBResult {
  ok: boolean;
  message: string;
  responseCode: string; // "00" = success
}

export interface MBTransaction {
  postingDate: string;        // "DD/MM/YYYY HH:mm:ss"
  transactionDate: string;    // "DD/MM/YYYY HH:mm:ss"
  accountNo: string;

  creditAmount: string;       // tiền vào
  debitAmount: string;        // tiền ra
  currency: string;           // "VND"

  description: string;
  addDescription: string; // Dùng cái này cho phân biệt người giao dịch, vì description bị thêm data rác

  availableBalance: string;

  beneficiaryAccount: string;
  refNo: string;

  benAccountName: string;
  bankName: string;
  benAccountNo: string;

  dueDate: string;
  docId: string;
  transactionType: string;
  pos: string;
  tracingType: string;
}