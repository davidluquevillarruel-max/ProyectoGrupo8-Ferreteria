@echo off
REM =====================================================================
REM  Estructuras y Disenos Group - Iniciar servidor
REM  Doble clic para arrancar el backend Node + BD y abrir la tienda.
REM =====================================================================

title EDG - Servidor de la ferreteria
color 0A
mode con: cols=78 lines=28

REM Nos aseguramos de estar en la carpeta donde vive este .bat
cd /d "%~dp0"

cls
echo.
echo  ==============================================================
echo.
echo         ESTRUCTURAS Y DISENOS GROUP
echo         Iniciando servidor de la ferreteria...
echo.
echo  ==============================================================
echo.

REM ----------------------------------------------------------------
REM  1. Verificar que Node este instalado
REM ----------------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    color 0C
    echo   [ERROR]  Node.js no esta instalado.
    echo.
    echo   Descargalo desde  https://nodejs.org  ^(version LTS^)
    echo   Instalalo y vuelve a ejecutar este archivo.
    echo.
    pause
    exit /b 1
)
echo   [OK]  Node.js detectado.

REM ----------------------------------------------------------------
REM  2. Verificar que exista package.json
REM ----------------------------------------------------------------
if not exist "package.json" (
    color 0C
    echo   [ERROR]  No se encuentra package.json.
    echo   Este .bat debe estar en la carpeta raiz del proyecto.
    echo.
    pause
    exit /b 1
)
echo   [OK]  package.json encontrado.

REM ----------------------------------------------------------------
REM  3. Verificar que exista .env
REM ----------------------------------------------------------------
if not exist ".env" (
    color 0E
    echo   [AVISO]  No se encuentra el archivo .env
    echo            El servidor arrancara pero SIN conexion a la BD.
    echo            Solucion: renombra 'env' a '.env'
    echo.
    timeout /t 3 >nul
    color 0A
)

REM ----------------------------------------------------------------
REM  4. Instalar dependencias si no estan
REM ----------------------------------------------------------------
if not exist "node_modules" (
    echo.
    echo   [!]  Instalando dependencias por primera vez...
    echo        Puede tardar 1-2 minutos.
    echo.
    call npm install
    if errorlevel 1 (
        color 0C
        echo.
        echo   [ERROR]  Fallo la instalacion.
        pause
        exit /b 1
    )
)
echo   [OK]  Dependencias listas.

REM ----------------------------------------------------------------
REM  5. Arrancar el servidor
REM ----------------------------------------------------------------
echo.
echo  --------------------------------------------------------------
echo.
echo   Servidor arrancando en  http://localhost:3000
echo   Abriendo el navegador en 3 segundos...
echo.
echo   NO cierres esta ventana mientras uses la pagina.
echo   Para APAGAR:  cierra esta ventana o presiona  Ctrl+C
echo.
echo  --------------------------------------------------------------
echo.

REM Abrir el navegador despues de 3s en paralelo
start "" /b cmd /c "timeout /t 3 >nul && start http://localhost:3000"

REM Ejecutar el server. Mientras la salida siga viva, el server esta arriba.
node server.js

REM ----------------------------------------------------------------
REM  Si llegamos aqui, el servidor se detuvo
REM ----------------------------------------------------------------
color 0E
echo.
echo  --------------------------------------------------------------
echo   El servidor se detuvo. Revisa los mensajes de arriba.
echo  --------------------------------------------------------------
echo.
pause
