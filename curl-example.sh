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
      "width": 800,
      "height": 500,
      "padding": 10,
      "timeout": 5000
    }
  }' \
  --output screenshot.png

qlmanage -p screenshot.png