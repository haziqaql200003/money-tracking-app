import { SwipeRow, type SwipeAction } from '@/components/ui/swipe-row';
import { TransactionRow } from '@/components/transaction-row';
import { useUndo } from '@/context/UndoContext';
import { useTransactions, type Transaction } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { toDateKey } from '@/utils/dates';
import { isDebtEntry, isEditableTransferEntry, savedTransferId } from '@/utils/saved';

type Props = {
  item: Transaction;
  showAccount?: boolean;
  hidden?: boolean;
  /** Opens the editor (also run by the Edit button). */
  onOpen: () => void;
  background?: string;
};

/** A transaction row with swipe actions: left = Edit and Delete (all the way = delete), right = copy to today. */
export function SwipeableTransactionRow({ item, showAccount, hidden, onOpen, background }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { offer } = useUndo();
  const { transfers, deleteTransaction, restoreTransaction, deleteTransfer, restoreTransfer, addTransaction } = useTransactions();

  const locked = isDebtEntry(item) || !!item.debtId;
  const linked = isEditableTransferEntry(item);

  function remove() {
    if (linked) {
      const tr = transfers.find((x) => x.id === savedTransferId(item));
      if (!tr) return;
      deleteTransfer(tr.id);
      offer(t('tx.swipe.deletedTransfer'), () => restoreTransfer(tr));
      return;
    }
    deleteTransaction(item.id);
    offer(t('tx.swipe.deleted', { title: item.title || '' }), () => restoreTransaction(item));
  }

  function copy() {
    const { id: _id, recurringId: _rid, ...rest } = item;
    void _id;
    void _rid;
    const newId = addTransaction({ ...rest, date: toDateKey(new Date()) });
    offer(t('tx.swipe.copied'), () => deleteTransaction(newId));
  }

  const actions: SwipeAction[] = [
    { key: 'edit', label: t('common.edit'), icon: 'create-outline', color: colors.accent, onPress: onOpen },
    { key: 'delete', label: t('common.delete'), icon: 'trash-outline', color: colors.negative, onPress: remove },
  ];

  return (
    <SwipeRow
      background={background ?? colors.background}
      disabled={locked}
      rightActions={actions}
      onFullSwipe={remove}
      leftAction={linked ? undefined : { key: 'copy', label: t('common.copy'), icon: 'copy-outline', color: colors.positive, onPress: copy }}
    >
      <TransactionRow item={item} showAccount={showAccount} hidden={hidden} onPress={onOpen} />
    </SwipeRow>
  );
}
