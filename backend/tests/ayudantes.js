// utilidades para simular consultas de Mongoose sin base de datos

// consulta encadenable (populate, select, sort, lean, limit...) que se resuelve con `valor`
const consulta = (valor) => {
    const promesa = () => Promise.resolve(typeof valor === 'function' ? valor() : valor)
    const cadena = {
        then: (ok, error) => promesa().then(ok, error),
        catch: (error) => promesa().catch(error)
    }
    for(const metodo of ['populate', 'select', 'sort', 'lean', 'limit', 'skip', 'exec']){
        cadena[metodo] = () => cadena
    }
    return cadena
}

// documento simulado con save() y los campos indicados
const documento = (campos) => {
    const doc = {...campos}
    doc.save = async () => doc
    return doc
}

export {consulta, documento}
