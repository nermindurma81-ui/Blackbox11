#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/6] Checking Gradle wrapper..."
[[ -x ./gradlew ]] || { echo "❌ gradlew missing or not executable"; exit 1; }

echo "[2/6] Checking Android SDK config..."
if [[ -f local.properties ]] && grep -q '^sdk.dir=' local.properties; then
  echo "✅ sdk.dir found in local.properties"
elif [[ -n "${ANDROID_HOME:-}" ]]; then
  echo "✅ ANDROID_HOME is set"
else
  echo "❌ Missing Android SDK config (set sdk.dir in local.properties or ANDROID_HOME)"
  exit 1
fi

echo "[3/6] Java/Gradle info..."
./gradlew -v >/dev/null

echo "[4/6] Running unit tests..."
./gradlew :app:testDebugUnitTest

echo "[5/6] Building debug APK..."
./gradlew :app:assembleDebug

echo "[6/6] Release signing readiness..."
if [[ -n "${ANDROID_KEYSTORE_PATH:-}" && -n "${ANDROID_KEYSTORE_PASSWORD:-}" && -n "${ANDROID_KEY_ALIAS:-}" && -n "${ANDROID_KEY_PASSWORD:-}" ]]; then
  echo "✅ Signing env vars detected; release AAB can be signed"
else
  echo "⚠️ Signing env vars missing; release build will be unsigned"
fi

echo "✅ GO-LIVE CHECK PASSED"
