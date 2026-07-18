export const judges = {
  title: "Jueces",
  subtitle: "Conecta o elimina cuentas de jueces",
  connectTitle: "Conectar jueces",
  choose: "Elige un juez para conectarlo",
  saveCredentials: "Guarda credenciales para sincronizar {{judge}}",
  connected: "Conectado",
  missing: "Falta conectar",
  connectedJudges: "Jueces conectados",
  connectJudge: "Conectar juez",
  allConnected: "Todos están conectados",
  clear: "Eliminar",
  clearAll: "Eliminar todos los jueces conectados",
  clearError: "No se pudo eliminar {{judge}}",
  clearAllError: "No se pudieron eliminar los jueces conectados",
  handle: "Handle",
  apiKey: "Clave de API",
  apiSecret: "Secreto de API",
  enter: "Entrar",
  back: "Volver a la selección de juez",
  tutorial: "Tutorial de configuración",
  tutorialLabel: "Abrir el tutorial de configuración de {{judge}}",
  connectError: "No se pudo conectar {{judge}}",
  serverUnavailable: "No se pudo conectar al servidor de ICPC Trainer. Verifica que el backend local esté ejecutándose e intenta conectar el juez de nuevo.",
  invalidCredentials: "El juez rechazó estas credenciales. Revisa los valores ingresados e inténtalo de nuevo.",
  connectionFailed: "La conexión falló.",
  tutorialPage: {
    back: "Conectar QOJ",
    title: "Crear una credencial de cookies de QOJ",
    subtitle: "Usa Chrome DevTools para copiar los campos de tu cookie de sesión de QOJ en ICPC Trainer.",
    openQoj: "Abrir QOJ",
    steps: {
      inspect: { title: "Abre QOJ e inspecciona la página", description: "Inicia sesión en QOJ con la cuenta que quieres sincronizar. Haz clic derecho en la página y selecciona Inspeccionar.", alt: "Página principal de QOJ con el menú contextual abierto sobre Inspeccionar" },
      application: { title: "Cambia a Application", description: "En Chrome DevTools, selecciona la pestaña Application en la barra superior.", alt: "Chrome DevTools abierto con la pestaña Application disponible" },
      cookies: { title: "Abre las cookies de QOJ", description: "En Storage, expande Cookies y selecciona https://qoj.ac.", alt: "Panel Application de Chrome DevTools con Cookies seleccionado en la barra lateral de Storage" },
      copy: { title: "Copia los valores de las cookies", description: "Copia la columna Value de las cookies de QOJ en los campos correspondientes de ICPC Trainer.", alt: "Tabla de cookies de QOJ en Chrome DevTools con los valores confidenciales ocultos" }
    }
  }
} as const;
