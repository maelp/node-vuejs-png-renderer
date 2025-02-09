#!/usr/bin/env bash
curl -X POST \
  http://localhost:3000/my-view/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "props": {
      "username": "John",
      "itemCount": 5
    },
    "browserWidth": 480,
    "browserHeight": 2000
  }' \
  --output screenshot.png