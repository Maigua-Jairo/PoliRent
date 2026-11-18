// Ayudantes de respuesta compartidos por los controladores

// otra peticion modifico el mismo documento al mismo tiempo (save() con optimisticConcurrency lanza VersionError)
const MSG_CONFLICTO = 'Otra operacion modifico este registro al mismo tiempo. Actualiza la pagina y vuelve a intentarlo'
const esConflictoVersion = (error) => error?.name === 'VersionError'

export {MSG_CONFLICTO, esConflictoVersion}
