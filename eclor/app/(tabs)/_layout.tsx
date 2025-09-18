import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { ExpenseFormProvider } from '@/features/depenses/ExpenseFormProvider';
import ExpenseForm from '@/components/finances/ExpenseForm';

export default function TabsLayout() {
  return (
    <ExpenseFormProvider>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          tabBarStyle: [{ display: 'none' }, Platform.OS === 'ios' ? { position: 'absolute' } : null],
        }}
      >
        {/* On garde uniquement l'entrée index (ton menu) */}
        <Tabs.Screen name="index" options={{ title: 'Menu' }} />

        {/* Si tu gardes explore.tsx, il ne s'affichera plus en bas,
          mais tu pourras y naviguer par Link("/explore") si besoin. */}
        {/* <Tabs.Screen name="explore" options={{ href: null }} /> */}
      </Tabs>
      <ExpenseForm />
    </ExpenseFormProvider>
  );
}