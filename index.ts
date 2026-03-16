import "./global.css";
import { LogBox } from "react-native";
import { registerRootComponent } from "expo";

import App from "./App";

LogBox.ignoreLogs([
  "ExceptionsManager should be set up after React DevTools",
  "property is not writable",
  "Cannot read property 'default' of undefined",
]);

registerRootComponent(App);
