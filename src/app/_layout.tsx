import "../global.css";
import { Slot } from "expo-router";
import { useEffect, useState } from "react";
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

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [isReady, setIsReady] = useState(false);
  
  const [fontsLoaded] = useFonts({
    // Playfair Display (Serif)
    "PlayfairDisplay-Regular": PlayfairDisplay_400Regular,
    "PlayfairDisplay-Medium": PlayfairDisplay_500Medium,
    "PlayfairDisplay-Bold": PlayfairDisplay_700Bold,
    
    // Montserrat (Sans)
    "Montserrat-Thin": Montserrat_100Thin,
    "Montserrat-Light": Montserrat_300Light,
    "Montserrat-Regular": Montserrat_400Regular,
    "Montserrat-Medium": Montserrat_500Medium,
    "Montserrat-SemiBold": Montserrat_600SemiBold,
    "Montserrat-Bold": Montserrat_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      // Wait for fonts to load
      if (fontsLoaded) {
        // Show splash for 1 second, then hide
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

  return <Slot />;
}
