# GitHub Secrets Setup

Idi na: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

## Obavezno za potpisivanje APK/AAB

| Secret | Opis |
|--------|------|
| `ANDROID_KEYSTORE_BASE64` | Keystore fajl enkodiran u base64 |
| `ANDROID_KEYSTORE_PASSWORD` | Lozinka keystora |
| `ANDROID_KEY_ALIAS` | Alias ključa |
| `ANDROID_KEY_PASSWORD` | Lozinka ključa |

## Kako generisati keystore (jednom):

```bash
keytool -genkey -v \
  -keystore blackbox-release.keystore \
  -alias blackbox \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

## Kako enkodirati u base64:

```bash
# Linux/Mac
base64 -i blackbox-release.keystore | tr -d '\n'

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("blackbox-release.keystore"))
```

Kopiraj output i stavi kao `ANDROID_KEYSTORE_BASE64` secret.

## Bez keystora

CI workflow radi i BEZ keystora — builda debug APK i pokreće testove.
Samo Release workflow treba keystore za potpisani APK/AAB.
