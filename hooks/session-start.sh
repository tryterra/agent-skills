#!/bin/sh
set -u

root="${TERRA_HOOK_ROOT:-}"

find_terra() {
  if command -v terra >/dev/null 2>&1; then
    command -v terra
    return 0
  fi
  for dir in \
    "$root/opt/homebrew/bin" \
    "$root/usr/local/bin" \
    "$root/home/linuxbrew/.linuxbrew/bin" \
    "$HOME/.local/bin" \
    "$HOME/.npm-global/bin"; do
    if [ -x "$dir/terra" ]; then
      printf '%s\n' "$dir/terra"
      return 0
    fi
  done
  return 1
}

install_command() {
  case "$(uname -s 2>/dev/null)" in
  Darwin)
    if command -v brew >/dev/null 2>&1; then
      printf '%s' 'brew install tryterra/tap/terra'
    elif command -v npm >/dev/null 2>&1; then
      printf '%s' 'npm install -g @tryterra/cli'
    else
      printf '%s' 'brew install tryterra/tap/terra once Homebrew (https://brew.sh) is installed, or npm install -g @tryterra/cli once Node.js is'
    fi
    ;;
  *)
    if command -v npm >/dev/null 2>&1; then
      printf '%s' 'npm install -g @tryterra/cli'
    else
      printf '%s' 'npm install -g @tryterra/cli once Node.js is installed'
    fi
    ;;
  esac
}

if ! terra=$(find_terra); then
  printf '%s\n' "The Terra API plugin is installed but the terra CLI is not installed, so the terra-cli skill cannot run commands yet. Early in this session, in one sentence, offer to install it, and run the install only after the user agrees: $(install_command). Once it is installed, log the user in with the two-step flow: run terra login --start, show the user the verification_uri_complete link it prints and ask them to approve in their browser, then run the next_step command it printed (terra login --complete <device_code>), which waits for the approval and stores the token. Do not install or log in unprompted, and do not let this block unrelated work."
  exit 0
fi

NO_COLOR=1 "$terra" whoami --format json >/dev/null 2>&1
case $? in
2)
  printf '%s\n' "The terra CLI is installed but not logged in, or its login has expired. Before the first Terra API command, offer to log the user in with the two-step flow: run terra login --start, show the user the verification_uri_complete link it prints and ask them to approve in their browser, then run the next_step command it printed (terra login --complete <device_code>), which waits for the approval and stores the token. For headless use, TERRA_ADMIN_TOKEN works instead. Do not start the login unprompted."
  ;;
esac
exit 0
