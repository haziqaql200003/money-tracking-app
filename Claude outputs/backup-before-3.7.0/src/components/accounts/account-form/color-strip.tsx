import { useState } from 'react';
import { View } from 'react-native';

import { styles } from './styles';

// A tappable/draggable colour strip with a marker.
export function Strip({
  segments,
  ratio,
  onPick,
}: {
  segments: string[];
  ratio: number;
  onPick: (ratio: number) => void;
}) {
  const [width, setWidth] = useState(0);

  function handle(x: number) {
    if (width <= 0) return;
    onPick(Math.min(Math.max(x / width, 0), 1));
  }

  return (
    <View
      style={styles.stripOuter}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => handle(e.nativeEvent.locationX)}
      onResponderMove={(e) => handle(e.nativeEvent.locationX)}
    >
      <View style={styles.strip} pointerEvents="none">
        {segments.map((c, i) => (
          <View key={`${c}-${i}`} style={[styles.stripSegment, { backgroundColor: c }]} />
        ))}
      </View>
      <View
        pointerEvents="none"
        style={[styles.marker, { left: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }]}
      />
    </View>
  );
}
