export const judges = {
  skip: "Omitir por ahora",
  skipDescription: "Puedes conectar un juez más tarde desde Jueces. Explora problemas, recursos y animaciones ahora.",
  requiredTitle: "Conecta un juez para comenzar",
  required: {
    upsolving: "Upsolving usa los envíos de tu equipo para mostrar problemas de concursos simulados. Conecta un juez, agrega usuarios del equipo y sincroniza para llenar esta tabla.",
    contests: "Esta tabla usa datos de concursos sincronizados desde tus jueces. Conecta un juez y sincroniza los concursos de tu equipo para verlos aquí.",
    team: "Conecta un juez para agregar usuarios del equipo y sincronizar sus envíos para practicar y hacer upsolving.",
    contestFinder: "Conecta un juez para sincronizar la participación de tus amigos y encontrar concursos para practicar. Los datos guardados siguen disponibles abajo.",
    friends: "Conecta un juez para sincronizar los envíos y la participación de tus amigos en concursos. Puedes administrar tus amigos abajo."
  },

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
  qojCookieHelp: "Pega los valores de las cookies de QOJ. __Host-UOJREMEMBER funciona por sí sola; también puedes incluir __Host-UOJSESSID.",
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
      copy: { title: "Copia los valores de las cookies", description: "Copia la columna Value de __Host-UOJREMEMBER o __Host-UOJSESSID en los campos correspondientes de ICPC Trainer. La cookie de recordar sesión funciona por sí sola. Ingresa tu handle de QOJ por separado.", redactedValue: "Valor de la cookie (oculto)" }
    }
  }
} as const;
