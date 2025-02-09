#!/usr/bin/env bash
set -e

rm -f screenshot.png

curl -X POST 'http://localhost:3000/render?component=MyView&type=png' \
  -H "Content-Type: application/json" \
  -d '{
    "props": {
      "username": "John",
      "itemCount": 5
    },
    "view": {
      "width": 800,
      "height": 600
    }
  }' --output screenshot.png

qlmanage -p screenshot.png
