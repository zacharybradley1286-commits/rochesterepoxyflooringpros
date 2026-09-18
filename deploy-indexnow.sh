#!/usr/bin/env bash
# Instant IndexNow Ping to Bing/Yandex/Search Engines
curl -s -X POST https://api.indexnow.org/indexnow \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @indexnow.json
echo "IndexNow ping submitted for rochesterepoxyflooringpros.com"
