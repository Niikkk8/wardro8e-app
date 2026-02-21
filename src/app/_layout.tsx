import "../global.css";
import { Slot } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  Montserrat_100Thin,
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import AppSplashScreen from "../components/ui/SplashScreen";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WardrobeProvider } from "@/contexts/WardrobeContext";
import { setupDevTools } from "@/utils/devTools";
import { preferenceService } from "@/lib/preferenceService";

SplashScreen.preventAutoHideAsync();

function PreferenceSyncManager({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      // Sync preferences when app goes to background
      if (
        appState.current === "active" &&
        nextState.match(/inactive|background/) &&
        user?.id
      ) {
        preferenceService.syncToSupabase(user.id).catch(() => {});
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [user?.id]);

  return <>{children}</>;
}

export default function Layout() {
  const [isReady, setIsReady] = useState(false);
  
  const [fontsLoaded] = useFonts({
    "PlayfairDisplay-Regular": PlayfairDisplay_400Regular,
    "PlayfairDisplay-Medium": PlayfairDisplay_500Medium,
    "PlayfairDisplay-Bold": PlayfairDisplay_700Bold,
    "Montserrat-Thin": Montserrat_100Thin,
    "Montserrat-Light": Montserrat_300Light,
    "Montserrat-Regular": Montserrat_400Regular,
    "Montserrat-Medium": Montserrat_500Medium,
    "Montserrat-SemiBold": Montserrat_600SemiBold,
    "Montserrat-Bold": Montserrat_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      if (fontsLoaded) {
        setupDevTools();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await SplashScreen.hideAsync();
        setIsReady(true);
      }
    }

    prepare();
  }, [fontsLoaded]);

  if (!isReady || !fontsLoaded) {
    return <AppSplashScreen />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <WardrobeProvider>
          <PreferenceSyncManager>
            <Slot />
          </PreferenceSyncManager>
        </WardrobeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
