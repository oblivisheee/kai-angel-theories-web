#!/usr/bin/env bash
# Ignored Build Step для Vercel: выход 0 — сборку пропустить, 1 — собирать.
#
# Правки из админки меняют только content/ и public/media/: сайт берёт их из репозитория
# на лету (api/content, api/theory, api/media), поэтому пересобирать ничего не нужно.
#
# Сравниваем с коммитом последнего успешного деплоя, а не только с последним коммитом:
# если в одном пуше пришли и код, и правка из админки, код всё равно соберётся.

base="${VERCEL_GIT_PREVIOUS_SHA:-}"

# первый деплой или предыдущего коммита нет в клоне — собираем
if [ -z "$base" ] || ! git cat-file -e "$base^{commit}" 2>/dev/null; then
  echo "Нет базы для сравнения — собираем."
  exit 1
fi

if git diff --quiet "$base" HEAD -- . ':(exclude)content' ':(exclude)public/media'; then
  echo "С прошлого деплоя менялся только контент — сборка не нужна, сайт подхватит его сам."
  exit 0
fi

echo "Изменился код — собираем."
exit 1
