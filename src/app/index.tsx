import { Redirect } from "expo-router";

export default function Index() {
  // Redirect to tabs after splash screen
  return <Redirect href="/(tabs)" />;
}