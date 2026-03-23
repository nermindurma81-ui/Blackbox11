# BlackBox AI MAX Android (Kotlin + Compose)

Production-style Android project using Clean Architecture, Jetpack Compose, Hilt, Retrofit, Room, DataStore, WorkManager, and testing setup.

## Stack
- Kotlin + Coroutines/Flow
- Jetpack Compose (Material 3)
- Clean Architecture (presentation/domain/data)
- Hilt DI
- Retrofit + OkHttp (logging + retry interceptor)
- Room (local cache)
- DataStore + EncryptedSharedPreferences for sensitive values
- WorkManager periodic sync
- JUnit + MockWebServer + Compose UI tests
- GitHub Actions CI for APK/AAB builds

## Build
```bash
cd android
./gradlew :app:assembleDebug
```

## One-command go-live sanity check
```bash
cd android
./scripts/go_live_check.sh
```

## Run tests
```bash
cd android
./gradlew :app:testDebugUnitTest
./gradlew :app:connectedDebugAndroidTest
```
> CI workflow now runs both unit tests and instrumentation tests on an emulator.

## Release artifacts
```bash
cd android
./gradlew :app:bundleRelease
```

## Signing (MAX FINAL)
Set env vars before release build (local or CI):
```bash
export ANDROID_KEYSTORE_PATH=/absolute/path/release.keystore
export ANDROID_KEYSTORE_PASSWORD=***
export ANDROID_KEY_ALIAS=***
export ANDROID_KEY_PASSWORD=***
```
If vars are present, release build is signed automatically.

## Manual signed release in GitHub Actions
Use workflow: **Android Release (manual)** and choose `aab` or `apk`.
Required secrets:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

## Architecture
- `presentation/`: Compose screens, nav, ViewModel
- `domain/`: models + repository contracts + use-cases
- `data/`: API, DB, repository implementation, worker, datastore
- `di/`: Hilt modules

## Security notes
- HTTPS enforced via `network_security_config.xml`
- Owner password is stored in encrypted preferences (Android Keystore-backed)
- Keep signing keys and secrets in CI secrets, not in repository.
