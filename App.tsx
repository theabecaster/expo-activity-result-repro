import * as ImagePicker from 'expo-image-picker';
import { useEffect, useSyncExternalStore } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

// Kept at module level so the values survive a remount of the root component
// (the JS runtime stays alive when only the Activity is recreated).
let state = {
  mounts: 0,
  launchResult: 'not started',
  pendingResult: 'not called',
};
const listeners = new Set<() => void>();

function update(patch: Partial<typeof state>) {
  state = { ...state, ...patch };
  console.log('[repro]', JSON.stringify(patch));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function launch() {
  update({ launchResult: 'still waiting' });
  try {
    const result = await ImagePicker.launchImageLibraryAsync();
    update({ launchResult: 'resolved: ' + JSON.stringify(result) });
  } catch (error) {
    update({ launchResult: 'rejected: ' + String(error) });
  }
}

async function getPending() {
  try {
    const result = await ImagePicker.getPendingResultAsync();
    update({ pendingResult: 'returned: ' + JSON.stringify(result) });
  } catch (error) {
    update({ pendingResult: 'rejected: ' + String(error) });
  }
}

export default function App() {
  const current = useSyncExternalStore(subscribe, () => state);

  useEffect(() => {
    update({ mounts: state.mounts + 1 });
  }, []);

  return (
    <View style={styles.container}>
      <Text>Root component mounts: {current.mounts}</Text>
      <Button title="launchImageLibraryAsync" onPress={launch} />
      <Text>launch result: {current.launchResult}</Text>
      <Button title="getPendingResultAsync" onPress={getPending} />
      <Text>pending result: {current.pendingResult}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
});
