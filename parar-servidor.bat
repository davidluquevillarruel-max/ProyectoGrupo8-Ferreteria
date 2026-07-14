@echo off
REM ╔════════════════════════════════════════════════════════════════════╗
REM ║  Estructuras & Diseños Group — Parar servidor                      ║
REM ║  Cierra cualquier proceso Node.js que este escuchando en el puerto ║
REM ║  3000. Util cuando cerraste mal la ventana anterior y el puerto    ║
REM ║  se quedo ocupado.                                                 ║
REM ╚════════════════════════════════════════════════════════════════════╝

title EDG - Parar servidor
color 0E

echo.
echo  ══════════════════════════════════════════════════════════════════
echo   Buscando servidor Node en el puerto 3000...
echo  ══════════════════════════════════════════════════════════════════
echo.

REM Buscar el PID (Process ID) del proceso que usa el puerto 3000
set "FOUND=0"
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo   Servidor encontrado. PID: %%p
    taskkill /F /PID %%p >nul 2>&1
    if not errorlevel 1 (
        echo   [OK] Servidor detenido correctamente.
        set "FOUND=1"
    )
)

if "%FOUND%"=="0" (
    echo   No hay ningun servidor corriendo en el puerto 3000.
)

echo.
echo  ══════════════════════════════════════════════════════════════════
echo.
timeout /t 3 >nul
