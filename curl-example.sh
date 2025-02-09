#!/usr/bin/env bash
set -e

rm -f screenshot.png

curl -X POST 'http://localhost:3000/render' \
  -H "Content-Type: application/json" \
  -d '{
    "component": "MyView",
    "type": "png",
    "props": {
      "username": "John",
      "itemCount": 5
    },
    "viewport": {
      "width": 600,
      "padding": 10,
      "timeout": 0,
      "backgroundColor": "transparent"
    }
  }' \
  --output screenshot.png

qlmanage -p screenshot.png