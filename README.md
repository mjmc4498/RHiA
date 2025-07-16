# RHiA - Chatbot Inteligente de RRHH (Versión WebLLM)

**RHiA** es un sistema de chatbot de Recursos Humanos avanzado y 100% privado. Permite a los usuarios obtener respuestas precisas y conversacionales a partir de sus propios documentos, ejecutando un Modelo de Lenguaje Grande (LLM) directamente en el navegador sin necesidad de un servidor.

## Características Principales

- **IA Conversacional 100% Local:** Utiliza **WebLLM** para ejecutar un modelo de lenguaje grande (similar a Llama 2) en el navegador del usuario. Toda la información y las conversaciones permanecen en la máquina local, garantizando una privacidad total.
- **Búsqueda Híbrida Inteligente (RAG):**
    1.  **Búsqueda Semántica (TF-IDF):** Primero, utiliza un motor de búsqueda clásico (TF-IDF) para encontrar los fragmentos de texto más relevantes de los documentos cargados.
    2.  **Generación de Respuestas (LLM):** Luego, pasa esos fragmentos como contexto al LLM, que "razona" sobre la información para generar una respuesta coherente, precisa y humanizada.
- **Procesamiento de Múltiples Formatos:** Soporta la carga de archivos `.pdf`, `.docx`, y `.xlsx`.
- **Interfaz Moderna y Funcional:**
    - Diseño limpio inspirado en ChatGPT.
    - Modo oscuro automático.
    - Renderizado de respuestas en *streaming* (palabra por palabra).
    - Opciones para copiar respuestas, dar feedback y exportar el chat.
- **Arquitectura Modular (MVC):** El código está organizado siguiendo el patrón Modelo-Vista-Controlador y principios de diseño de LangChain, lo que lo hace mantenible y extensible.

## Manual de Uso

1.  **Abrir la Aplicación:** Simplemente abre el archivo `index.html` en un navegador web moderno (se recomienda Chrome o Edge por su mejor soporte de WebGPU).
2.  **Carga Inicial de la IA:** La primera vez que abras la aplicación, el sistema descargará el modelo de IA (varios cientos de MB). Este proceso puede tardar unos minutos. La barra de progreso te mostrará el estado. En visitas posteriores, el modelo se cargará desde la caché del navegador, siendo mucho más rápido.
3.  **Cargar Documentos:** Una vez que la IA esté lista, haz clic en el botón **"Cargar Documentos"** en la barra lateral y selecciona los archivos que formarán tu base de conocimiento.
4.  **Hacer Preguntas:** Escribe tu pregunta en el campo de texto en la parte inferior y presiona "Enviar".
5.  **Recibir la Respuesta:** El bot buscará en tus documentos la información más relevante, la analizará con el LLM y te dará una respuesta generada en tiempo real.
6.  **Interactuar:** Utiliza los botones debajo de la respuesta para copiarla, marcarla como útil/no útil o exportar toda la conversación.

## Stack Tecnológico y Recursos Usados

-   **Frontend:**
    -   HTML5, CSS3, JavaScript (ESM - Módulos)
    -   **Tailwind CSS:** Para un diseño de utilidad rápido y moderno.
-   **Inteligencia Artificial Local:**
    -   **WebLLM:** Para ejecutar el LLM en el navegador a través de WebGPU.
    -   **Modelo Usado:** `Llama-2-7b-chat-hf-q4f32_1` (un modelo de 7 mil millones de parámetros, cuantizado para un rendimiento eficiente).
-   **Procesamiento de Documentos (en el cliente):**
    -   `pdf.js`: Para leer archivos PDF.
    -   `mammoth.js`: Para leer archivos DOCX.
    -   `SheetJS (xlsx)`: Para leer archivos XLSX.
-   **Arquitectura de Código:**
    -   **MVC (Modelo-Vista-Controlador):** Para una clara separación de responsabilidades.
    *   **Inspirada en LangChain:** Se utilizan conceptos como `VectorStore`, `Retriever` y `Chain` para una lógica de IA modular y extensible.

## Ejecución en Desarrollo

Para modificar o ejecutar el código en un entorno de desarrollo local:

1.  Clona el repositorio.
2.  Debido a las políticas de seguridad del navegador para los módulos de JavaScript (`import`/`export`), no puedes simplemente abrir el `index.html` desde el sistema de archivos. Debes servirlo a través de un servidor web local.
3.  La forma más sencilla es usar la extensión **"Live Server"** en Visual Studio Code.
4.  Alternativamente, desde la terminal en la raíz del proyecto, puedes usar:
    ```bash
    # Si tienes Python
    python -m http.server

    # Si tienes Node.js
    npx serve
    ```
5.  Abre la dirección `http://localhost:8000` (o la que indique el servidor) en tu navegador.

---
*Desarrollado con la asistencia de Jules, un ingeniero de software de IA.*
