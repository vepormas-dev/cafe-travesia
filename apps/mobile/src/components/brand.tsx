import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Image } from 'expo-image';

import { ICONS, LOGO, LOGO_CLARO, type BrandIconName } from '@/lib/images';
import { C, F, isLight } from '@/theme';
import { T } from './ui';

/** Franja del patrón andino de rombos (como divider-andino de la web). */
export function AndeanPattern({ color = C.ambar, width = 320, height = 14, opacity = 0.9, style }: { color?: string; width?: number; height?: number; opacity?: number; style?: StyleProp<ViewStyle> }) {
  const unit = height * 2;
  const n = Math.ceil(width / unit) + 1;
  const h = height / 2;
  return (
    <View style={[{ width, height, overflow: 'hidden' }, style]} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={n * unit} height={height}>
        {Array.from({ length: n }).map((_, i) => {
          const x = i * unit;
          return (
            <Fragment key={i}>
              <Path d={`M${x} ${h} L${x + h} 0 L${x + height} ${h} L${x + h} ${height} Z`} fill="none" stroke={color} strokeWidth={1.2} opacity={opacity} />
              <Path d={`M${x + height + h / 2} ${h} L${x + height + h} ${h / 2} L${x + height + h * 1.5} ${h} L${x + height + h} ${h * 1.5} Z`} fill={color} opacity={opacity} />
            </Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

/** Bolsa de café ilustrada con el color de cada origen (equivalente a coffee-bag.tsx de la web). */
export function CoffeeBag({ color, accent, name, origin, width = 200 }: { color?: string | null; accent?: string | null; name: string; origin?: string | null; width?: number }) {
  const c = color ?? C.noche;
  const a = accent ?? C.ambar;
  const ink = isLight(c) ? C.noche : C.crema;
  const id = `bag${hash(name + c)}`;
  return (
    <Svg width={width} height={(width * 320) / 240} viewBox="0 0 240 320" accessibilityLabel={`Bolsa de café ${name}`}>
      <Defs>
        <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#000" stopOpacity="0.2" />
          <Stop offset="0.18" stopColor="#fff" stopOpacity="0.1" />
          <Stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <Stop offset="1" stopColor="#000" stopOpacity="0.24" />
        </LinearGradient>
      </Defs>
      <Path d="M36 34 L204 34 L214 300 Q120 312 26 300 Z" fill={c} />
      <Path d="M30 18 H210 V40 H30 Z" fill={c} />
      <Path d="M30 18 H210 V24 H30 Z" fill="#000" opacity={0.15} />
      <Circle cx={120} cy={66} r={7} fill="#000" opacity={0.18} />
      <Circle cx={120} cy={66} r={3} fill="#000" opacity={0.25} />
      {Array.from({ length: 7 }).map((_, i) => {
        const x = 44 + i * 24;
        return <Path key={i} d={`M${x} 215 l6 -6 l6 6 l-6 6z M${x + 12} 215 l6 -6 l6 6 l-6 6z`} fill="none" stroke={a} strokeWidth={1} />;
      })}
      <SvgText x={120} y={118} textAnchor="middle" fontFamily={F.script} fontSize={30} fill={ink}>
        Café Travesía
      </SvgText>
      <SvgText x={120} y={138} textAnchor="middle" fontFamily={F.medium} fontSize={8} letterSpacing={2} fill={a}>
        LA ESENCIA DE LO QUE SOMOS
      </SvgText>
      <SvgText x={120} y={176} textAnchor="middle" fontFamily={F.display} fontSize={name.length > 16 ? 15 : 19} fill={ink}>
        {name.toUpperCase()}
      </SvgText>
      {origin ? (
        <SvgText x={120} y={196} textAnchor="middle" fontFamily={F.body} fontSize={9} letterSpacing={1.5} fill={ink} opacity={0.8}>
          {origin.toUpperCase()}
        </SvgText>
      ) : null}
      <SvgText x={120} y={252} textAnchor="middle" fontFamily={F.body} fontSize={8} letterSpacing={2} fill={ink} opacity={0.7}>
        CAFÉ ESPECIAL · CAICEDO, ANTIOQUIA
      </SvgText>
      <Path d="M36 34 L204 34 L214 300 Q120 312 26 300 Z" fill={`url(#${id}g)`} />
    </Svg>
  );
}

/** Fondo con rombos sutiles a todo el ancho (bg-andino). */
export function AndeanBackdrop({ color = C.noche, opacity = 0.05 }: { color?: string; opacity?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        {Array.from({ length: 14 }).map((_, r) =>
          Array.from({ length: 8 }).map((__, k) => {
            const x = k * 56 + (r % 2 ? 28 : 0);
            const y = r * 32;
            return <Rect key={`${r}-${k}`} x={x} y={y} width={14} height={14} fill="none" stroke={color} strokeWidth={1} opacity={opacity * 10} transform={`rotate(45 ${x + 7} ${y + 7})`} />;
          }),
        )}
      </Svg>
    </View>
  );
}

export function Logo({ light, width = 160 }: { light?: boolean; width?: number }) {
  return <Image source={light ? LOGO_CLARO : LOGO} style={{ width, height: width * 0.67 }} contentFit="contain" accessibilityLabel="Café Travesía, la esencia de lo que somos" />;
}

export function BrandIcon({ name, size = 40, tint }: { name: BrandIconName; size?: number; tint?: string }) {
  return <Image source={ICONS[name]} style={{ width: size, height: size }} contentFit="contain" tintColor={tint} accessible={false} />;
}

/** Markdown mínimo: párrafos, **negritas**, listas con "-" y títulos "##". */
export function Markdown({ text, color = C.noche, dark }: { text: string | null | undefined; color?: string; dark?: boolean }) {
  if (!text) return null;
  const fg = dark ? C.crema : color;
  const blocks = text.split(/\n{2,}/);
  return (
    <View style={{ gap: 10 }}>
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        if (lines.every((l) => /^\s*[-*✔]\s+/.test(l))) {
          return (
            <View key={i} style={{ gap: 6 }}>
              {lines.map((l, j) => (
                <View key={j} style={{ flexDirection: 'row', gap: 8 }}>
                  <T v="body" color={dark ? C.lima : C.ambarProfundo}>
                    •
                  </T>
                  <T v="body" color={fg} style={{ flex: 1 }}>
                    {inline(l.replace(/^\s*[-*]\s+/, ''), fg)}
                  </T>
                </View>
              ))}
            </View>
          );
        }
        if (/^#{1,3}\s/.test(b)) {
          return (
            <T key={i} v="h3" color={fg}>
              {b.replace(/^#{1,3}\s/, '')}
            </T>
          );
        }
        return (
          <T key={i} v="body" color={fg}>
            {inline(b, fg)}
          </T>
        );
      })}
    </View>
  );
}

export function inline(s: string, color: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <T key={i} v="bodyStrong" color={color} style={{ fontSize: undefined, lineHeight: undefined }}>
        {part.slice(2, -2)}
      </T>
    ) : (
      part
    ),
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
