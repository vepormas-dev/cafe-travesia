import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useEvent, useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { formatClock, type LessonDTO } from '@travesia/shared';

import { haptic } from '@/lib/haptics';
import { imageSource } from '@/lib/images';
import { openWeb } from '@/lib/links';
import { C, R } from '@/theme';
import { Button, Icon, T } from './ui';

const playable = (l: LessonDTO) => !!l.videoUrl && ['mp4', 'hls', 'bunny'].includes(l.videoProvider);

/** Reproductor de lección (expo-video) con controles propios como en el mockup. */
export function LessonPlayer({ lesson, cover, height, onTime, onEnd }: { lesson: LessonDTO; cover?: string | null; height: number; onTime: (s: number) => void; onEnd: () => void }) {
  if (!playable(lesson)) return <Placeholder lesson={lesson} cover={cover} height={height} />;
  return <Player lesson={lesson} height={height} onTime={onTime} onEnd={onEnd} />;
}

function Player({ lesson, height, onTime, onEnd }: { lesson: LessonDTO; height: number; onTime: (s: number) => void; onEnd: () => void }) {
  const player = useVideoPlayer(lesson.videoUrl, (p) => {
    p.timeUpdateEventInterval = 1;
    if (lesson.positionS > 5 && !lesson.completed) p.currentTime = lesson.positionS;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const [time, setTime] = useState(lesson.positionS);
  const [controls, setControls] = useState(true);
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    setTime(currentTime);
    onTime(currentTime);
  });
  useEventListener(player, 'playToEnd', () => {
    setControls(true);
    onEnd();
  });
  const duration = player.duration > 0 ? player.duration : lesson.durationS;
  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <View style={{ height, backgroundColor: '#000' }}>
      <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit="cover" fullscreenOptions={{ enable: true }} allowsPictureInPicture />
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setControls((c) => !c)} accessibilityLabel={controls ? 'Ocultar controles' : 'Mostrar controles'} />
      {controls ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
          <View style={styles.center} pointerEvents="box-none">
            <Pressable onPress={() => { haptic.tap(); player.seekBy(-10); }} accessibilityLabel="Retroceder 10 segundos" style={styles.side} hitSlop={10}>
              <Icon name="play-back-outline" size={30} color={C.crema} />
              <T v="small" color={C.crema} style={styles.ten}>10</T>
            </Pressable>
            <Pressable
              onPress={() => {
                haptic.tap();
                if (isPlaying) player.pause();
                else {
                  player.play();
                  setTimeout(() => setControls(false), 1800);
                }
              }}
              accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
              style={styles.play}>
              <Icon name={isPlaying ? 'pause' : 'play'} size={40} color={C.crema} />
            </Pressable>
            <Pressable onPress={() => { haptic.tap(); player.seekBy(10); }} accessibilityLabel="Adelantar 10 segundos" style={styles.side} hitSlop={10}>
              <Icon name="play-forward-outline" size={30} color={C.crema} />
              <T v="small" color={C.crema} style={styles.ten}>10</T>
            </Pressable>
          </View>
          <View style={styles.bottom} pointerEvents="none">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <T v="small" color={C.crema}>{formatClock(time)}</T>
              <T v="small" color={C.crema}>{formatClock(duration)}</T>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` }]} />
            </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Placeholder({ lesson, cover, height }: { lesson: LessonDTO; cover?: string | null; height: number }) {
  const external = !!lesson.videoUrl;
  return (
    <View style={{ height, backgroundColor: C.inkCard }}>
      <Image source={imageSource(cover)} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} contentFit="cover" accessible={false} />
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }]}>
        <View style={styles.play}>
          <Icon name={external ? 'open-outline' : 'videocam-off-outline'} size={34} color={C.crema} />
        </View>
        <T v="bodyStrong" color={C.crema} center>
          {external ? 'Este video se reproduce en el navegador' : 'Lección de lectura'}
        </T>
        <T v="small" color={C.inkMuted} center>
          {external ? 'Ábrelo y vuelve para marcar tu progreso.' : 'Esta lección aún no tiene video: revisa el resumen y tus notas abajo.'}
        </T>
        {external ? <Button title="Abrir video" variant="lima" small onPress={() => void openWeb(lesson.videoUrl!)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center' },
  center: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  play: { width: 96, height: 96, borderRadius: R.xl, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  side: { alignItems: 'center', justifyContent: 'center', width: 56, height: 56 },
  ten: { position: 'absolute', bottom: -6, fontSize: 10 },
  bottom: { position: 'absolute', left: 24, right: 24, bottom: 16 },
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3, backgroundColor: C.lima },
});
