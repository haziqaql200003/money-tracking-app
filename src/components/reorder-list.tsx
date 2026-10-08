/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  /** Every row must be exactly `rowHeight` tall. `dragging` is true for the row being moved. */
  renderRow: (item: T, index: number, dragging: boolean) => ReactNode;
  rowHeight: number;
  onReorder: (orderedKeys: string[]) => void;
  /** Lets the screen stop its ScrollView while a row is being moved. */
  onDragChange?: (dragging: boolean) => void;
  /** Called by an assistive action: move a row up (-1) or down (+1). */
  background: string;
};

const HOLD_MS = 350;

/** A list whose rows can be picked up with a press-and-hold and dropped somewhere else. */
export function ReorderList<T>({ items, keyOf, renderRow, rowHeight, onReorder, onDragChange, background }: Props<T>) {
  const active = useSharedValue(-1);
  const over = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const [dragIndex, setDragIndex] = useState(-1);
  const keys = items.map(keyOf);

  const commit = (from: number, to: number) => {
    setDragIndex(-1);
    onDragChange?.(false);
    if (from !== to) {
      const next = [...keys];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
    }
    active.value = -1;
    over.value = -1;
    dragY.value = 0;
  };
  const begin = (i: number) => {
    setDragIndex(i);
    onDragChange?.(true);
  };

  return (
    <View style={{ height: items.length * rowHeight }}>
      {items.map((item, i) => (
        <DraggableRow
          key={keyOf(item)}
          index={i}
          count={items.length}
          rowHeight={rowHeight}
          active={active}
          over={over}
          dragY={dragY}
          background={background}
          onBegin={begin}
          onCommit={commit}
        >
          {renderRow(item, i, dragIndex === i)}
        </DraggableRow>
      ))}
    </View>
  );
}

type RowProps = {
  index: number;
  count: number;
  rowHeight: number;
  active: SharedValue<number>;
  over: SharedValue<number>;
  dragY: SharedValue<number>;
  background: string;
  onBegin: (i: number) => void;
  onCommit: (from: number, to: number) => void;
  children: ReactNode;
};

function DraggableRow({ index, count, rowHeight, active, over, dragY, background, onBegin, onCommit, children }: RowProps) {
  const [live] = useState(() => ({ onBegin, onCommit }));
  useEffect(() => {
    Object.assign(live, { onBegin, onCommit });
  });

  const pan = useMemo(() => {
    const begin = (i: number) => live.onBegin(i);
    const done = (from: number, to: number) => live.onCommit(from, to);
    return Gesture.Pan()
      .activateAfterLongPress(HOLD_MS)
      .onStart(() => {
        active.value = index;
        over.value = index;
        dragY.value = 0;
        scheduleOnRN(begin, index);
      })
      .onUpdate((e) => {
        dragY.value = e.translationY;
        const target = Math.round(index + e.translationY / rowHeight);
        over.value = Math.max(0, Math.min(count - 1, target));
      })
      .onEnd(() => {
        const to = over.value;
        dragY.value = withTiming((to - index) * rowHeight, { duration: 110 }, () => {
          scheduleOnRN(done, index, to);
        });
      })
      .onFinalize((_e, success) => {
        // Cancelled before it really started (the finger lifted during the hold): nothing to undo.
        if (!success && active.value === index) {
          active.value = -1;
          over.value = -1;
          dragY.value = 0;
          scheduleOnRN(done, index, index);
        }
      });
  }, [index, count, rowHeight, live, active, over, dragY]);

  const style = useAnimatedStyle(() => {
    if (active.value === index) {
      return { transform: [{ translateY: dragY.value }, { scale: 1.02 }], zIndex: 10, shadowOpacity: 0.25, elevation: 6 };
    }
    let shift = 0;
    if (active.value >= 0) {
      if (active.value < over.value && index > active.value && index <= over.value) shift = -rowHeight;
      else if (active.value > over.value && index < active.value && index >= over.value) shift = rowHeight;
    }
    return { transform: [{ translateY: withTiming(shift, { duration: 140 }) }], zIndex: 0, shadowOpacity: 0, elevation: 0 };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.row, { height: rowHeight, top: index * rowHeight, backgroundColor: background }, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
});
