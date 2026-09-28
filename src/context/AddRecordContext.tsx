import { createContext, useContext, useState, ReactNode } from 'react';

import { AddTransactionModal } from '@/components/add-transaction-modal';
import { useTransactions } from '@/context/TransactionsContext';

type AddRecordContextValue = {
  openAddRecord: () => void;
};

const AddRecordContext = createContext<AddRecordContextValue | undefined>(undefined);

export function AddRecordProvider({ children }: { children: ReactNode }) {
  const { addTransaction } = useTransactions();
  const [visible, setVisible] = useState(false);

  return (
    <AddRecordContext.Provider value={{ openAddRecord: () => setVisible(true) }}>
      {children}
      <AddTransactionModal
        visible={visible}
        onClose={() => setVisible(false)}
        onSave={addTransaction}
      />
    </AddRecordContext.Provider>
  );
}

export function useAddRecord() {
  const ctx = useContext(AddRecordContext);
  if (!ctx) throw new Error('useAddRecord must be used within AddRecordProvider');
  return ctx;
}