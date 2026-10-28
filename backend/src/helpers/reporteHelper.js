// convierte una lista de filas (objetos) en un CSV que abre bien en Excel (con BOM y separador coma)
const celdaCSV = (valor) => {
    if(valor === null || valor === undefined) return ''
    let texto = valor instanceof Date ? valor.toISOString() : String(valor)
    // evita que Excel interprete el texto como formula
    if(/^[=+\-@]/.test(texto)) texto = `'${texto}`
    return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

const aCSV = (columnas, filas) => {
    const encabezado = columnas.map(c => celdaCSV(c.titulo)).join(',')
    const cuerpo = filas.map(f => columnas.map(c => celdaCSV(f[c.campo])).join(','))
    return '﻿' + [encabezado, ...cuerpo].join('\r\n')
}

// ?desde y ?hasta (AAAA-MM-DD) -> filtro de fecha; "hasta" incluye todo ese dia
const rangoFechas = (desde, hasta) => {
    const rango = {}
    if(desde) rango.$gte = new Date(`${desde}T00:00:00.000Z`)
    if(hasta) rango.$lte = new Date(`${hasta}T23:59:59.999Z`)
    return Object.keys(rango).length ? rango : null
}

export {aCSV, rangoFechas}
