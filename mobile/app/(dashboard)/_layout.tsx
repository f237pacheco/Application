import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Home, History, User, HelpCircle } from 'lucide-react-native';

export default function DashboardLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: '#222222',
        },
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: '#666666',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('dashboard.myServices'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('dashboard.history'),
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('dashboard.account'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: t('dashboard.help'),
          tabBarIcon: ({ color, size }) => <HelpCircle color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
