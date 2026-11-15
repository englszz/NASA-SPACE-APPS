/** @type {import('next').NextConfig} */
const nextConfig = {
  // En Vercel cada ruta del servidor se empaqueta aparte: la de Ramoncito lee los
  // datos de las zonas desde public/data, así que hay que incluirlos en su paquete.
  outputFileTracingIncludes: {
    "/api/ramoncito": ["./public/data/**/*"],
  },
};

export default nextConfig;
