import {useQuery} from '@tanstack/react-query'
import {uniq} from 'es-toolkit'
import {useTRPC} from '@/trpc/client'

export const useRefScriptsForCreatingCommitment = (launchTxHash: string) => {
  const trpc = useTRPC()

  const {
    data: nodeValidatorRef,
    isLoading: isLoadingNodeValidatorRef,
    error: nodeValidatorRefError,
  } = useQuery(trpc.nodeValidatorRef.queryOptions({launchTxHash}))

  const {
    data: nodePolicyRef,
    isLoading: isLoadingNodePolicyRef,
    error: nodePolicyRefError,
  } = useQuery(trpc.nodePolicyRef.queryOptions({launchTxHash}))

  return {
    nodeValidatorRef,
    nodePolicyRef,
    isLoading: isLoadingNodeValidatorRef || isLoadingNodePolicyRef,
    isError: !!(nodeValidatorRefError || nodePolicyRefError),
    uniqueErrorMessages: uniq(
      [nodeValidatorRefError, nodePolicyRefError]
        .map((error) => error?.message)
        .filter((message) => message != null),
    ),
  }
}
