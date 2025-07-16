# RHiA - Chatbot Inteligente de RRHH

**RHiA** es un sistema de chatbot inteligente diseñado para automatizar las respuestas a preguntas frecuentes en el área de Recursos Humanos de una empresa. Utiliza modelos de Inteligencia Artificial de código abierto que se ejecutan directamente en el navegador, lo que lo hace rápido, seguro y sin costos de servidor.

## Demo en Vivo

Puedes probar el chatbot en vivo aquí: **[https://mjmc4498.github.io/RHiA/](https://mjmc4498.github.io/RHiA/)**

*(Nota: La primera carga puede tardar un poco mientras se descargan los modelos de IA en tu navegador).*

## Características Principales

- **Arquitectura Sin Servidor:** Toda la lógica se ejecuta en el navegador del cliente, garantizando la privacidad de los datos y eliminando la necesidad de un backend.
- **Procesamiento de Documentos Locales:** Carga y procesa archivos `.pdf`, `.docx` y `.xlsx` para construir una base de conocimiento personalizada.
- **Búsqueda Semántica:** Utiliza `sentence-transformers` para entender el significado de las preguntas y encontrar los fragmentos más relevantes en los documentos.
- **Generación de Respuestas con IA:** Emplea un modelo de Question-Answering para extraer respuestas precisas del texto relevante.
- **Cita de Fuentes:** Cada respuesta incluye el fragmento del documento original y el nombre del archivo de donde se extrajo la información.
- **Interfaz Intuitiva:** Un chat limpio y fácil de usar.
- **Funcionalidades Adicionales:**
    - Copiar respuestas.
    - Dar feedback sobre la utilidad de las respuestas.
    - Exportar el historial de la conversación a un archivo `.txt`.
    - Estadísticas básicas de uso.

## Manual de Uso

1.  **Accede a la aplicación:** Abre el enlace de la [demo en vivo](https://mjmc4498.github.io/RHiA/).
2.  **Espera la carga de modelos:** La aplicación mostrará un mensaje de estado mientras carga los modelos de IA. Una vez listos, el campo de texto se activará.
3.  **Sube tus documentos:** Haz clic en el botón **"Seleccionar archivos"** y elige uno o varios documentos (`.pdf`, `.docx`, `.xlsx`) que contengan la información de RRHH (políticas, manuales, etc.).
4.  **Espera el procesamiento:** La aplicación procesará los documentos y mostrará los nombres de los archivos cargados.
5.  **Haz tus preguntas:** Escribe tu pregunta en el campo de texto y presiona "Enviar".
6.  **Recibe tu respuesta:** El bot te responderá basándose en la información de los documentos que subiste, citando la fuente.
7.  **Interactúa:** Usa los botones para copiar la respuesta, dar feedback o exportar el chat cuando termines.

## Despliegue y Desarrollo Local

Este proyecto no requiere un servidor para funcionar. Para ejecutarlo localmente, solo necesitas un servidor web simple para servir los archivos estáticos.

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/mjmc4498/RHiA.git
    cd RHiA
    ```
2.  **Inicia un servidor web local:**
    Si tienes Python instalado, puedes usar:
    ```bash
    python -m http.server 8000
    ```
    Si tienes Node.js instalado, puedes usar `serve`:
    ```bash
    npx serve .
    ```
3.  **Abre en el navegador:** Ve a `http://localhost:8000` (o el puerto que hayas usado).

## Stack Tecnológico

- **Frontend:** HTML5, Tailwind CSS, JavaScript (Vanilla JS)
- **Inteligencia Artificial:**
    - `@xenova/transformers`: Para ejecutar modelos de Hugging Face en el navegador.
    - `sentence-transformers/all-MiniLM-L6-v2`: Para la creación de embeddings (búsqueda semántica).
    - `distilbert-base-cased-distilled-squad`: Para la generación de respuestas (Question-Answering).
- **Procesamiento de Archivos (en el cliente):**
    - `pdf.js`: Para leer archivos PDF.
    - `mammoth.js`: Para leer archivos DOCX.
    - `SheetJS (xlsx)`: Para leer archivos XLSX.
- **Despliegue:** GitHub Pages

---
*Desarrollado con la asistencia de Jules, un ingeniero de software de IA.*
