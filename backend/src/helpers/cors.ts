const parseOrigin = (allowedOrigin: string | RegExp) => {
  if (allowedOrigin instanceof RegExp || allowedOrigin.indexOf('*') === -1) {
    return allowedOrigin
  }

  return new RegExp(`^${allowedOrigin.replace('.', '\\.').replace('*', '.*')}$`)
}

export const getCorsOptions = (corsEnabledFor: string, isProd = true) => {
  const allowedOriginsRaw = corsEnabledFor
    ? corsEnabledFor.split(',').map((x) => x.trim())
    : []

  const allowedOrigins = allowedOriginsRaw.map(parseOrigin)

  const noCredentials = isProd && allowedOriginsRaw.includes('*')

  return {
    origin: isProd ? allowedOrigins : true,
    methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
    credentials: !noCredentials,
  }
}
