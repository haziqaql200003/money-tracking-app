import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  values: number[];
  color: string;
  height?: number;
  /** Fill under the line, at this opacity. 0 for none. */
  fill?: number;
  accessibilityLabel?: string;
};

/** A small line with a soft fill under it, scaled to its own minimum and maximum. Draws nothing for fewer than 2 points. */
export function SparkLine({ values, color, height = 56, fill = 0.18, accessibilityLabel }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  let line = '';
  let area = '';
  if (width > 0 && values.length >= 2) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pad = 3;
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    line = `M${pts.join(' L')}`;
    area = `${line} L${width} ${height} L0 ${height} Z`;
  }

  return (
    <View onLayout={onLayout} style={{ height }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
      {line ? (
        <Svg width={width} height={height}>
          {fill > 0 ? <Path d={area} fill={color} fillOpacity={fill} /> : null}
          <Path d={line} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      ) : null}
    </View>
  );
}
