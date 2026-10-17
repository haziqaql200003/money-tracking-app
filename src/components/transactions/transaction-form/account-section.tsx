import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName } from '@/i18n/data';

import { styles } from './styles';

type Props = { accountId: string; setAccountId: (id: string) => void; typeAccent: string };

/** Which account the transaction belongs to. */
export function AccountSection({ accountId, setAccountId, typeAccent }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const { accounts } = useTransactions();

  return (
    <>
      {/* Account */}
      <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('common.account')}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {accounts.map((acc) => {
          const active = accountId === acc.id;
          return (
            <Pressable
              key={acc.id}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: active ? typeAccent : colors.backgroundElement,
                  borderColor: active ? typeAccent : colors.divider,
                },
              ]}
              onPress={() => setAccountId(acc.id)}
            >
              <View style={styles.chipInner}>
                <Ionicons name={acc.icon} size={15} color={active ? '#fff' : colors.text} />
                <ThemedText type="small" style={active ? styles.chipTextActive : { color: colors.text }}>
                  {accountName(acc)}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}
