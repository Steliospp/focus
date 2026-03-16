const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const nm = path.join(root, "node_modules");
const expoNm = path.join(nm, "expo", "node_modules");

// Copy packages into expo/node_modules so Metro worker can resolve them
const packages = ["babel-preset-expo", "nativewind", "react-native-css-interop"];

if (!fs.existsSync(expoNm)) fs.mkdirSync(expoNm, { recursive: true });

for (const name of packages) {
  const src = path.join(nm, name);
  const dest = path.join(expoNm, name);
  if (fs.existsSync(src)) {
    try {
      fs.rmSync(dest, { recursive: true, force: true });
    } catch (_) {}
    fs.cpSync(src, dest, { recursive: true });
  }
}

// Fix NativeJSLogger.addListener undefined in Expo Go (SDK 55 / runtime not ready)
const loggerPath = path.join(nm, "expo-modules-core", "src", "sweet", "setUpJsLogger.fx.ts");
if (fs.existsSync(loggerPath)) {
  let code = fs.readFileSync(loggerPath, "utf8");
  if (code.includes("if (NativeJSLogger) {") && !code.includes("typeof NativeJSLogger.addListener")) {
    code = code.replace(
      "if (NativeJSLogger) {",
      "if (NativeJSLogger && typeof NativeJSLogger.addListener === 'function') {"
    );
    fs.writeFileSync(loggerPath, code);
  }
}
