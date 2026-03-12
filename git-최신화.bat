@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1/3] 변경 사항 확인...
git status
if errorlevel 1 (
    echo Git이 초기화되지 않았거나 오류가 있습니다.
    pause
    exit /b 1
)

echo.
echo [2/3] 커밋 (메시지: 업데이트 반영)...
git add .
git commit -m "업데이트 반영" 2>nul
if errorlevel 1 (
    echo 커밋할 변경이 없거나 이미 최신입니다.
) else (
    echo 커밋 완료.
)

echo.
echo [3/3] GitHub에 푸시...
git push origin main
if errorlevel 1 (
    echo 푸시 실패. 네트워크/권한을 확인하세요.
    pause
    exit /b 1
)

echo.
echo Git 최신화 완료.
pause
