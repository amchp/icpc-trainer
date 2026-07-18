export const common = {
  appName: "ICPC Trainer",
  loading: "Cargando...",
  retry: "Intentar de nuevo",
  cancel: "Cancelar",
  save: "Guardar",
  remove: "Eliminar",
  close: "Cerrar",
  yes: "Sí",
  no: "No",
  error: {
    genericTitle: "Algo salió mal",
    genericDescription: "Inténtalo de nuevo. Si el problema continúa, revisa los registros del servidor.",
    unauthorized: "Inicia sesión de nuevo para continuar.",
    forbidden: "No tienes permiso para hacer eso.",
    notFound: "No se encontró el elemento solicitado.",
    conflict: "Ese cambio entra en conflicto con datos más recientes. Actualiza e inténtalo de nuevo.",
    rateLimited: "Hay demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
    unavailable: "El servicio no está disponible temporalmente. Inténtalo de nuevo en breve.",
    syncOperationFailed: "No se pudieron sincronizar los datos de {{judge}}.",
    syncNotImplemented: "La sincronización todavía no está disponible para {{judge}}.",
    friendSyncPreparing: "Preparando la sincronización de envíos de amigos",
    friendSyncNoFriends: "No hay amigos para sincronizar",
    friendSyncing: "Sincronizando envíos de amigos",
    friendSyncingHandle: "Sincronizando a {{handle}} ({{current}}/{{total}})",
    friendSyncedHandle: "{{handle}} sincronizado",
    friendSyncStatusUnavailable: "Estado de sincronización no disponible",
    friendSyncWarning: "No se pudieron sincronizar los envíos{{target}}."
  },
  table: {
    position: "Posición en la tabla",
    positionNumber: "Posición {{number}} en la tabla",
    ascending: "orden ascendente",
    descending: "orden descendente",
    unsorted: "sin ordenar"
  },
  judgeFilter: {
    codeforcesContest: "Concurso de Codeforces",
    codeforcesGym: "Gym de Codeforces",
    qoj: "QOJ",
    all: "Todos los jueces",
    none: "Ningún juez",
    one: "Juez",
    selected: "{{count}} jueces",
    filter: "Filtrar por juez",
    options: "Opciones de jueces",
    item_one: "elemento",
    item_other: "elementos"
  },
  locale: {
    english: "English",
    spanish: "Español",
    menuLabel: "Elegir idioma"
  }
} as const;
