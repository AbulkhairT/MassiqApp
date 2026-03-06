import { Tabs } from 'expo-router';
import { Text, View, Platform } from 'react-native';
import { C } from '../../src/lib/constants.js';

function TabIcon({ focused, icon, label }) {
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Text style={{ fontSize: 18, color: focused ? C.terra : C.dust }}>{icon}</Text>
      <Text style={{ fontSize: 9, color: focused ? C.terra : C.dust, letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(250,246,238,0.97)',
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="body" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="◎" label="Body" /> }} />
      <Tabs.Screen name="fuel" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="◈" label="Fuel" /> }} />
      <Tabs.Screen name="rhythm" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="◉" label="Rhythm" /> }} />
      <Tabs.Screen name="meals" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🍽" label="Recipes" /> }} />
      <Tabs.Screen name="progress" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="◇" label="Progress" /> }} />
    </Tabs>
  );
}
