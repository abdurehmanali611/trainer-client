import { Tabs } from 'expo-router';
import {
  ChartNoAxesCombinedIcon,
  DumbbellIcon,
  HouseIcon,
  MessageCircleIcon,
  UserRoundIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alpha, COLORS } from '@/components/kit';
import { Icon } from '@/components/ui/icon';
import { useUnreadChatCount } from '@/hooks/use-unread-chat';

function TabIcon({ icon, color, focused }: { icon: LucideIcon; color: ColorValue; focused: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: focused ? alpha(COLORS.green, 0.16) : 'transparent',
      }}>
      <Icon as={icon} color={String(color)} size={22} />
    </View>
  );
}

export default function TabsLayout() {
  const unread = useUnreadChatCount();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.green,
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
        tabBarStyle: {
          backgroundColor: '#0B1220',
          borderTopColor: alpha(COLORS.green, 0.16),
          borderTopWidth: 1,
          // Explicit height + bottom inset so labels always clear the system
          // navigation buttons (the navigator did not on edge-to-edge phones).
          height: 60 + bottom,
          paddingTop: 6,
          paddingBottom: bottom,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarBadgeStyle: { backgroundColor: COLORS.rose, color: '#fff', fontSize: 10 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={HouseIcon} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: 'Train',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={DumbbellIcon} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={ChartNoAxesCombinedIcon} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={MessageCircleIcon} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, focused }) => <TabIcon icon={UserRoundIcon} color={color} focused={focused} />,
        }}
      />
      {/* Old routes stay linkable but now live inside the Train tab. */}
      <Tabs.Screen name="plans" options={{ href: null }} />
      <Tabs.Screen name="schedule" options={{ href: null }} />
    </Tabs>
  );
}
