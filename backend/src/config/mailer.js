import nodemailer from 'nodemailer'

// indica si las variables SMTP minimas estan definidas
const correoConfigurado = () => Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
)

let transportador = null
// el transporte se crea al primer envio para leer las variables ya cargadas por dotenv
const obtenerTransportador = () => {
    if(!transportador){
        const puerto = Number(process.env.SMTP_PORT) || 587
        transportador = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: puerto,
            secure: puerto === 465,
            auth: {user: process.env.SMTP_USER, pass: process.env.SMTP_PASS}
        })
    }
    return transportador
}

// url publica del frontend (primer origen de FRONTEND_URL) para armar los enlaces de los correos
const urlFrontend = () =>
    (process.env.FRONTEND_URL?.split(',')[0].trim() || 'http://localhost:5173').replace(/\/$/, '')

// envia al correo institucional el enlace para restablecer la clave
const enviarCorreoRecuperacion = async ({correo, nombres}, token) => {
    const enlace = `${urlFrontend()}/recuperar-clave/${token}`
    await obtenerTransportador().sendMail({
        from: process.env.MAIL_FROM || `PoliRent <${process.env.SMTP_USER}>`,
        to: correo,
        subject: 'PoliRent - Recupera tu contraseña',
        text: `Hola ${nombres}, para restablecer tu contraseña abre este enlace (valido por 15 minutos): ${enlace}\n\nSi no solicitaste el cambio, ignora este correo.`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1e293b">
                <h2 style="color:#0b2447">Recupera tu contraseña</h2>
                <p>Hola ${nombres},</p>
                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en PoliRent.</p>
                <p style="text-align:center;margin:28px 0">
                    <a href="${enlace}" style="background:#1677ff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Restablecer contraseña</a>
                </p>
                <p style="font-size:13px;color:#64748b">El enlace es valido por 15 minutos. Si no solicitaste el cambio, ignora este correo; tu contraseña no se modificara.</p>
            </div>`
    })
}

export {correoConfigurado, enviarCorreoRecuperacion}
