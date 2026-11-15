/** @type {import('next').NextConfig} */
const nextConfig = {
  // El indicador de desarrollo (la «N» de abajo a la izquierda) tapaba el selector EN | ES.
  // Los errores se siguen mostrando en pantalla al programar.
  devIndicators: false,
  // En Vercel cada ruta del servidor se empaqueta aparte: la de Ramoncito lee los
  // datos de las zonas desde public/data, así que hay que incluirlos en su paquete.
  outputFileTracingIncludes: {
    "/api/ramoncito": ["./public/data/**/*"],
  },
  // /jueces ya no existe: la entrada con el granero sale en la página principal la primera vez
  async redirects() {
    return [{ source: "/jueces", destination: "/", permanent: false }];
  },
};

export default nextConfig;
