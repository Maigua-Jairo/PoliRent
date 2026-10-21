import crypto from 'crypto'
import QRCode from 'qrcode'

// codigo aleatorio e impredecible que se guarda en el prestamo y se codifica en el QR
const generarCodigoQR = () => crypto.randomBytes(16).toString('hex')

// devuelve la imagen del QR como data URL (png en base64)
const generarImagenQR = (codigo) => QRCode.toDataURL(codigo, {errorCorrectionLevel: 'M', margin: 2, width: 300})

export {generarCodigoQR, generarImagenQR}