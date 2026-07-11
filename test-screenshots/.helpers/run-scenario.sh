#!/bin/zsh
# Kullanım: run-scenario.sh <flow.yaml> [storage-komutu...]
# 1) Uygulamayı öldür  2) storage komutunu uygula  3) uygulamayı aç, stall'a karşı
#    ikinci kez tetikle  4) maestro flow'u koş
set -e
FLOW=$1; shift
export JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
export MAESTRO_CLI_NO_ANALYTICS=1

xcrun simctl terminate booted host.exp.Exponent 2>/dev/null || true
sleep 2
if [ $# -gt 0 ]; then
  python3 /Users/arifaltun/ayrac/test-screenshots/.helpers/set-storage.py "$@"
fi
xcrun simctl openurl booted "exp://192.168.1.215:8081"
sleep 8
# Expo Go bazen "Downloading %100"da asılı kalıyor — ikinci tetikleme açıyor
xcrun simctl openurl booted "exp://192.168.1.215:8081"
sleep 4
cd /Users/arifaltun/ayrac
maestro test "$FLOW" 2>&1 | grep -E "COMPLETED|FAILED|Exception|Flow"
