# node-vuejs-png-renderer

Example of a small server which allows to render a VueJS widget as a PNG, which could make it easier to do nice widgets to send images for Discord or WhatsApp

## Install

```sh
pnpm install
```

## Run

Run the server using
```sh
pnpm dev
```

Then we can render a component as png using

```sh
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
```

Alternatively, to debug it might be practical to render it as a webpage or as a PNG in a browser (using a GET request)
```sh
# then we can open as page (eg type=www) in a browser to debug
open "http://localhost:3000/render?component=MyView&type=www&viewport-padding=10&viewport-background=transparent"
# or change to `type=png` to check the image
open "http://localhost:3000/render?component=MyView&type=png&viewport-padding=10&viewport-background=transparent"
```
