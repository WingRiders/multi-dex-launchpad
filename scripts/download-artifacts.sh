#!/bin/sh

set -e

if [ -z "$1" ]; then
  printf "Usage: %s <repo-name>\n\n" "$0"
  printf "<repo-name> will be used to clone from WingRiders/<repo-name>\n"
  exit 1
fi

repo_name="$1"
repository="git@github.com:WingRiders/${repo_name}.git"

scriptDir=$(cd "$(dirname -- "$0")" && pwd)
artifactsDir="$scriptDir/../common/src/on-chain/artifacts"
if [ ! -d "$artifactsDir" ]; then
  printf "\e[1;91mArtifacts directory does not exist:\n\e[0;91m%s\e[0m\n\n" "$artifactsDir"
  exit 1
fi

start=$(date +%s)

tmpdir=$(mktemp -d)

git clone --filter=blob:none --no-checkout "$repository" "$tmpdir"
cd "$tmpdir"
git sparse-checkout init --cone
git sparse-checkout set artifacts
git checkout with-traces
commit_hash=$(git rev-parse HEAD)
cp -R artifacts/* "$artifactsDir"
cd -
rm -rf "$tmpdir"

end=$(date +%s)
printf "\e[32mCopied artifacts in \e[1m%ss\e[0m\n\n" "$((end-start))"

printf "\e[1;36mGenerating %s...\e[0m\n" "$artifactsDir/index.ts"
start=$(date +%s)
{
  echo "// Generated from $repo_name"
  echo "// Commit: $commit_hash"
} > "$artifactsDir/index.ts"
for file in "$artifactsDir"/*.json; do
    filename=$(basename "$file")
    name=$(echo "$filename" | cut -d . -f 1)

    if [ "$name" = "export-info" ]; then
        continue
    fi
    # some scripts are non-configurable, the rest are configurable
    case "$name" in
      fail-proof-policy | fail-proof | always-fails-token | free-nft-policy | fixed-supply-unapplied-policy | ref-script-carrier | vesting)
        # non-configurable → do nothing
        ;;
      *)
        name="parametric-$name"
        ;;
    esac

    if [ "${name#*"-policy"}" = "$name" ]; then
        name="$name"-validator
    fi
    name=$(echo "$name" | perl -pe 's/-([a-z])/\U$1/g')
    echo "export {default as $name} from './$filename'" >> "$artifactsDir/index.ts"
done
end=$(date +%s)
printf "\e[32mGenerated \e[1m%s\e[0;32m in \e[1m%ss\e[0m\n\n" "$artifactsDir/index.ts" "$((end-start))"

bun fix
