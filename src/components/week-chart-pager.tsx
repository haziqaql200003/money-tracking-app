import { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

import { SpendingChart } from '@/components/spending-chart';
import { useTransactions } from '@/context/TransactionsContext';

const WEEKS_BACK = 52;

// oldest -> newest, last entry is always 0 (the current week)
const WEEK_OFFSETS = Array.from({ length: WEEKS_BACK + 1 }, (_, i) => -(WEEKS_BACK - i));

export function WeekChartPager({ onWeekChange }: { onWeekChange?: (offset: number) => void }) {
  const { getWeekChartData } = useTransactions();
  const [pageWidth, setPageWidth] = useState(0);
  const listRef = useRef<FlatList<number>>(null);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!pageWidth) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    const offset = WEEK_OFFSETS[index] ?? 0;
    onWeekChange?.(offset);
  }

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => {
        if (pageWidth === 0) setPageWidth(e.nativeEvent.layout.width);
      }}
    >
      {pageWidth > 0 && (
        <FlatList
          ref={listRef}
          data={WEEK_OFFSETS}
          keyExtractor={(offset) => String(offset)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={WEEK_OFFSETS.length - 1}
          getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
          onMomentumScrollEnd={handleMomentumEnd}
          renderItem={({ item: offset }) => (
            <View style={{ width: pageWidth }}>
              <SpendingChart data={getWeekChartData(offset)} period="week" />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
});