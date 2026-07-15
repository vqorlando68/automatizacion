---
name: project-context-keeper
description: Mantiene y actualiza el contexto del proyecto, decisiones arquitectónicas, estado actual y próximos pasos.
---

# 🛡️ Guardián de Contexto: Automatización (React 19 + Vite)

Este archivo actúa como el registro central del estado del proyecto, decisiones de diseño y convención de arquitectura para todos los agentes de desarrollo que colaboren en el repositorio.

---

## 🎯 PROPÓSITO DEL PROYECTO
Crear una aplicación React moderna, altamente escalable, accesible y optimizada, partiendo desde cero. La aplicación servirá de base para automatizaciones e interfaces personalizadas en la pila personal.

---

## 💻 PILA TECNOLÓGICA (TECH STACK)
* **Core:** React 19 (React Compiler y Hooks nativos).
* **Compilador/Servidor Dev:** Vite (Rápido, optimizado, con soporte completo de HMR).
* **Lenguaje:** TypeScript (Tipado estricto, sin `any`, interfaces declarativas).
* **Estilos:** Tailwind CSS (Uso semántico, responsivo, micro-animaciones premium).
* **Arquitectura:** Feature-Based / Clean Architecture.

---

## 📍 ESTADO ACTUAL
* **Fase:** Autenticación * **Estado:** Se ha implementado el Login conectado a Oracle DB (Thin Mode), el soporte para modo claro/oscuro, la estructura del menú principal y la opción de "Cargue" mediante un wizard de archivos. Asimismo, se completó la opción de "Crear Usuarios" con soporte dinámico para mapear todas las columnas de la tabla `tkr_usuarios`, detectando tipos de datos y solicitando formatos de fecha de conversión dinámicos (TO_DATE, TO_NUMBER, TO_CLOB) que se insertan en Oracle mediante SQL dinámico securizado en el paquete `pkgln_automatizaciones`. Todo compila con cero advertencias y errores.
* **Hito Actual:** Validar manualmente el funcionamiento en el servidor local de desarrollo y preparar para el despliegue en Vercel.

---

## 🏛️ DIRECTRICES Y ROLES ACTIVOS
Se asumen activos los siguientes perfiles de diseño y desarrollo:
1. **`react-architecture-expert`**:
   * Arquitectura limpia, modular y desacoplada.
   * Separación de responsabilidades.
2. **`tailwind-ui-craftsman`**:
   * Diseño pulido, paleta de colores armónica, transiciones y animaciones fluidas.
   * Modo claro/oscuro dinámico que se adapta a las preferencias del usuario.
3. **`typescript-react-strict`**:
   * Configuración estricta en `tsconfig.json`.
   * Tipado estricto en todos los niveles.

---

## ⚙️ DECISIONES ARQUITECTÓNICAS (LOG)
* **[2026-07-14]:** Creación del archivo de contexto local (`project-context-keeper.md`) para sincronizar herramientas e instrucciones antes de inicializar código.
* **[2026-07-14]:** Inicializado el proyecto base en la raíz del repositorio. Se integró Tailwind CSS v4 con `@tailwindcss/vite` de forma directa sin archivos de configuración redundantes. Se configuró TypeScript en modo estricto en todos los niveles (`tsconfig.app.json` y `tsconfig.node.json`).
* **[2026-07-14]:** Configurado el backend en `/api/*` (Vercel Serverless Functions) con un plugin de desarrollo para Vite en `vite.config.ts`. Se implementó el helper de base de datos con Thin Mode de `oracledb` para compatibilidad serverless y limpieza automática de la contraseña.
* **[2026-07-14]:** Se creó el paquete PL/SQL `pkgln_automatizaciones` para encapsular las cargas de archivos en bloque mediante `json_table`, insertando en `tkr_temp_cargue` y `tkr_temp_detalle_cargue`.
* **[2026-07-14]:** Implementado soporte para modo claro/oscuro en Tailwind v4 utilizando `@custom-variant dark (&:where(.dark, .dark *))` para toggling manual por estado y local storage.
* **[2026-07-14]:** Diseñado e integrado el wizard "Crear Usuarios" que realiza el mapeo dinámico de columnas del archivo cargado hacia la tabla `tkr_usuarios`, visualiza los datos en una grilla interactiva previa al insert, y realiza la inserción masiva a través de un procedimiento dinámico seguro en `pkgln_automatizaciones.p_crear_usuarios`.
* **[2026-07-14]:** Refactorizado el mapeador dinámico de "Crear Usuarios" para soportar todas las columnas de la tabla `tkr_usuarios`, añadiendo conversión de tipos (NUMBER, CLOB, DATE) y solicitud interactiva del formato de fecha.

---

## 📋 TAREAS (TASK TRACKER)
- [x] **Paso 1:** Inicializar el boilerplate del proyecto con Vite + TypeScript.
- [x] **Paso 2:** Configurar Tailwind CSS y su archivo de configuración (`@tailwindcss/vite`).
- [x] **Paso 3:** Definir y crear la estructura de carpetas base del proyecto (`src/components`, `src/features`, `src/hooks`, `src/assets`, etc.).
- [x] **Paso 4:** Configurar directrices estrictas de TypeScript (`tsconfig.json` y `tsconfig.app.json`).
- [x] **Paso 5:** Crear un componente de prueba inicial premium para validar la integración de estilos, tipos y renderizado en React 19.
- [x] **Paso 6:** Configurar la conexión a Oracle DB en Thin Mode en el backend serverless.
- [x] **Paso 7:** Implementar la pantalla de Login y validar credenciales mediante la función `pkgln_seguridad.f_validar_clave(usuario, clave, 1)`.
- [x] **Paso 8:** Implementar el menú principal con modo claro/oscuro y las pestañas "Programar" y "Cargue".
- [x] **Paso 9:** Crear la opción "Cargue" con un asistente (wizard) para archivos de texto (CSV/TXT con delimitador/encabezado) y Excel (lectura de hojas usando `xlsx`).
- [x] **Paso 10:** Almacenar los registros cargados en las tablas `tkr_temp_cargue` y `tkr_temp_detalle_cargue` a través del paquete PL/SQL `pkgln_automatizaciones`.
- [x] **Paso 11:** Mostrar en una grilla de resultados la información cargada leída de la base de datos.
- [x] **Paso 12:** Crear la opción "Crear Usuarios" con un asistente (wizard) de 4 pasos (seleccionar carga, mapear equivalencias, vista previa interactiva y confirmación).
- [x] **Paso 13:** Implementar el mapeo dinámico de campos obligatorios (`usuario`, `clave`, `nombres`, `apellidos`, `identificacion`) y opcionales (`correo_electronico`, `telefono`) de `tkr_usuarios`.
- [x] **Paso 14:** Ejecutar la inserción masiva y segura en la base de datos Oracle a través de `pkgln_automatizaciones.p_crear_usuarios` utilizando SQL dinámico.
- [x] **Paso 15:** Soportar el mapeo dinámico de todas las columnas de la tabla `tkr_usuarios` en el asistente, con tipo de dato, formato de conversión para fechas y previsualización.

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS
1. Ejecutar las validaciones y pruebas de cargas y creación de usuarios en el servidor de desarrollo local.
2. Realizar despliegue piloto en Vercel configurando las variables de entorno de la base de datos en su panel.
3. Iniciar el desarrollo de la lógica para el módulo de "Programar".
