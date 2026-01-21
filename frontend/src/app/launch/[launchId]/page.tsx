import {use} from 'react'

const LaunchPage = ({
  params: paramsPromise,
}: {
  params: Promise<{launchId: string}>
}) => {
  const params = use(paramsPromise)

  return <div>LaunchPage {params.launchId}</div>
}

export default LaunchPage
