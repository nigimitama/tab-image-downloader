#!/bin/sh

if [ -e "dist/" ]; then
    rm -r dist/
fi

npm run build

cp manifest.json dist/
cp src/background.js dist/
cp -r _locales dist/


# zipにする（アップロード用）
if [ -e "package.zip" ]; then
  rm "package.zip"
fi

zip package.zip -r dist/
rm -r dist/
