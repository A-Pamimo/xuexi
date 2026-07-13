/**
 * Settings bottom sheet — a calm, themed sheet reachable from the Feed gear.
 * Ports the paper-ink prototype's SettingsModal to native: an appearance control
 * (reusing the System/Light/Dark ThemeToggle, so we keep the "system" option the
 * prototype's binary switch drops) and a pinyin-guide toggle bound to the
 * persisted `showPinyin` preference. Modal scrim + slide-up, reduced-motion aware.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import { Body, Caption, H2 } from './ui';
import { ThemeToggle } from './ThemeToggle';
import { useApp } from '../stores/appStore';
import { useReducedMotion } from '../lib/motion';
import { useTheme, useThemedStyles } from '../lib/appearance';
import type { ThemeColors } from '../theme';
import { elevation, HIT, radius, spacing } from '../theme';
import * as juice from '../lib/juice';

const NATIVE_DRIVER = Platform.OS !== 'web';

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduce = useReducedMotion();
  const showPinyin = useApp((s) => s.showPinyin);
  const setShowPinyin = useApp((s) => s.setShowPinyin);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) {
      anim.setValue(open ? 1 : 0);
      return;
    }
    const a = Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 220,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    });
    a.start();
    return () => a.stop();
  }, [open, reduce, anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.scrim, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close settings" onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Ceremonial double rule along the top edge (spec §3.4: double borders
            frame ceremonial elements) — the sheet reads as a card laid on paper. */}
        <View style={styles.doubleRule} pointerEvents="none">
          <View style={[styles.rule, { height: 2 }]} />
          <View style={[styles.rule, { height: 1, marginTop: 3 }]} />
        </View>
        <View style={styles.head}>
          <H2>Settings</H2>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close settings"
            hitSlop={12}
            onPress={onClose}
            style={styles.close}
          >
            <X size={20} color={colors.textDim} strokeWidth={2} />
          </Pressable>
        </View>

        <ThemeToggle />

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: showPinyin }}
          accessibilityLabel="Pinyin guides"
          onPress={() => {
            juice.tap();
            setShowPinyin(!showPinyin);
          }}
          style={styles.setting}
        >
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '700' }}>Pinyin guides</Body>
            <Caption>Show pronunciation above characters</Caption>
          </View>
          <Toggle on={showPinyin} />
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

/**
 * The seal checkbox (spec fidelity: never a rounded native toggle). A sharp
 * square; checked fills with cinnabar and stamps a brush Check in paper ink.
 */
function Toggle({ on }: { on: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: radius.sm,
        borderWidth: 2,
        borderColor: on ? colors.primary : colors.borderStrong,
        backgroundColor: on ? colors.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {on ? <Check size={19} color={colors.onPrimary} strokeWidth={3} /> : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: c.bg,
      borderTopLeftRadius: radius.md, // sharp stamp geometry, not a bubbly sheet
      borderTopRightRadius: radius.md,
      borderTopWidth: 1,
      borderColor: c.border,
      padding: spacing(3),
      paddingBottom: spacing(5),
      gap: spacing(1),
      ...elevation.modal,
    },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    doubleRule: { marginBottom: spacing(2) },
    rule: { backgroundColor: c.borderStrong, width: '100%' },
    close: {
      width: HIT,
      height: HIT,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
    },
    setting: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(2),
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing(2),
      marginTop: spacing(2),
    },
  });
