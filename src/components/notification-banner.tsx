import { BellIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { InAppNotification } from '@/hooks/use-in-app-notifications';

interface NotificationBannerProps {
  notification: InAppNotification;
  onPress: () => void;
  onDismiss: () => void;
}

function NotificationBanner({ notification, onPress, onDismiss }: NotificationBannerProps) {
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      exiting={FadeOutUp.duration(200)}
      style={{ top: insets.top + 8 }}
      className="absolute left-4 right-4 z-50">
      <Pressable
        onPress={onPress}
        className="border-border bg-card flex-row items-start gap-3 rounded-2xl border p-4 shadow-lg">
        <Icon as={BellIcon} size={20} className="text-primary mt-0.5" />
        <View className="flex-1 gap-1">
          <Text className="font-semibold" numberOfLines={1}>
            {notification.title}
          </Text>
          <Text variant="muted" numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Icon as={XIcon} size={18} className="text-muted-foreground" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export { NotificationBanner };
